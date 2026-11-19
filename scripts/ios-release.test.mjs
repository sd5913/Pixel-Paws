import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildNumber, individualToken, uploadBuild } from '../.github/scripts/ios-upload.mjs';

const credentials = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    keyId: 'ABCD123456XY',
    key: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64'),
    publicKey,
  };
};
const onlyPixelPaws = [{ id: '123', attributes: { bundleId: 'org.sd5913.pixelpaws' } }];
const zip = Buffer.from('mock signed ipa');
const operation = (offset, length) => ({
  method: 'PUT', url: 'https://store.blobstore.apple.com/signed?private=value', offset, length,
  requestHeaders: [{ name: 'Content-Type', value: 'application/octet-stream' }],
});

function mock({ apps = onlyPixelPaws, operations = [operation(0, 5), operation(5, zip.length - 5)], failPart = false } = {}) {
  const requests = [];
  const fetch = async (url, request) => {
    const path = new URL(url).pathname;
    requests.push({ path, ...request });
    const response = payload => new Response(JSON.stringify(payload));
    switch (path) {
      case '/v1/apps': return response({ data: apps });
      case '/v1/buildUploads': return response({ data: { id: 'build-1' } });
      case '/v1/buildUploadFiles': return response({ data: { id: 'file-1', attributes: { uploadOperations: operations } } });
      case '/signed': return new Response(null, { status: failPart ? 500 : 200 });
      case '/v1/buildUploadFiles/file-1': return response({ data: { id: 'file-1', attributes: { assetDeliveryState: { state: 'COMPLETE' } } } });
      default: throw new Error('Unexpected request');
    }
  };
  return { requests, fetch };
}
const perform = fetch => uploadBuild({ ...credentials(), ipa: zip, version: '1.0', build: '1.10.1', fetch });

test('build numbers distinguish runs and attempts and use Apple-compatible components', () => {
  assert.equal(buildNumber('1', '1'), '1.10.1');
  assert.equal(buildNumber('1', '2'), '1.10.2');
  assert.equal(buildNumber('2', '1'), '1.20.1');
  assert.equal(buildNumber('10', '1'), '2.0.1');
  assert.throws(() => buildNumber('1', '1000'));
  assert.throws(() => buildNumber('99990', '1'));
  assert.throws(() => buildNumber('01', '1'));
});

test('JWT uses Apple individual-key claims and a verifiable ES256 signature', () => {
  const { key, keyId, publicKey } = credentials();
  const [header, claims, signature] = individualToken(key, keyId, 1000).split('.');
  const decode = value => JSON.parse(Buffer.from(value, 'base64url'));
  assert.deepEqual(decode(header), { alg: 'ES256', kid: keyId, typ: 'JWT' });
  assert.deepEqual(decode(claims), { sub: 'user', aud: 'appstoreconnect-v1', iat: 1000, exp: 1300 });
  assert(verify('sha256', Buffer.from(header + '.' + claims), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')));
  assert.throws(() => individualToken('bogus', keyId));
});

test('reserves the correct app and streams byte ranges before committing the file', async () => {
  const { requests, fetch } = mock();
  assert.equal(await perform(fetch), 'build-1');
  assert.deepEqual(requests.map(({ method, path }) => [method, path]), [
    ['GET', '/v1/apps'], ['POST', '/v1/buildUploads'], ['POST', '/v1/buildUploadFiles'],
    ['PUT', '/signed'], ['PUT', '/signed'], ['PATCH', '/v1/buildUploadFiles/file-1'],
  ]);
  assert.equal(JSON.parse(requests[1].body).data.relationships.app.data.id, '123');
  assert.deepEqual(JSON.parse(requests[1].body).data.attributes,
    { platform: 'IOS', cfBundleShortVersionString: '1.0', cfBundleVersion: '1.10.1' });
  assert.equal(JSON.parse(requests[2].body).data.attributes.uti, 'com.apple.ipa');
  assert.deepEqual(Buffer.concat(requests.slice(3, 5).map(({ body }) => body)), zip);
  assert(!new Headers(requests[3].headers).has('authorization'));
  assert.deepEqual(JSON.parse(requests[5].body).data.attributes, { uploaded: true });
});

test('rejects broad access, invalid ranges, and failed parts before commit', async () => {
  const broad = mock({ apps: [...onlyPixelPaws, { id: '456' }] });
  await assert.rejects(perform(broad.fetch), /exactly one/);
  assert.equal(broad.requests.length, 1);
  const unsafe = mock({ operations: [operation(1, zip.length)] });
  await assert.rejects(perform(unsafe.fetch), /ranges/);
  assert(!unsafe.requests.some(({ method }) => method === 'PUT'));
  const fail = mock({ failPart: true });
  await assert.rejects(perform(fail.fetch), /part.*500/);
  assert(!fail.requests.some(({ method }) => method === 'PATCH'));
});

test('release only runs from protected main, with stage-scoped credentials', () => {
  const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
  const release = read('ios-testflight.yml');
  assert.match(release, /on:\n  push:\n    branches: \[main\]/);
  assert.doesNotMatch(release, /pull_request|workflow_dispatch|ASC_ISSUER/);
  assert.match(release, /github\.ref_protected/);
  assert.match(release, /environment: pixel-paws-testflight/);
  assert.match(release, /ios-prepare\.sh/);
  assert.match(readFileSync(new URL('../.github/scripts/ios-prepare.sh', import.meta.url), 'utf8'), /npm ci --ignore-scripts/);
  assert.match(release, /Sign and export[\s\S]*DISTRIBUTION_P12[\s\S]*Upload to App Store Connect[\s\S]*ASC_KEY/);
  assert.doesNotMatch(read('ios-check.yml'), /secrets\.|pixel-paws-testflight/);
});
