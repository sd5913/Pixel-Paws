/** Deterministic mesh authoring; meters, Y-up, base-center origin. npm install; npm run generate. */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// GLTFExporter uses FileReader in browsers. Node supplies Blob; bridge its reader API.
globalThis.FileReader = class {readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});} readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.();});}};
const blue = new T.Color('#9dcbd8'), cream = new T.Color('#fff0d7');
const profile = [[0,0],[.031,0],[.035,.003],[.036,.008],[.044,.090],[.044,.093],[.042,.096],[.040,.096],[.038,.093],[.038,.090],[.0305,.013],[.028,.007],[0,.007]];
// Profile travels across underside, up outer wall, over rolled lip, down inner wall, across floor.
const body = new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),12);
function removeDegenerates(g){const p=g.attributes.position,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),out=[];for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k));a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)out.push(...ids);}g.setIndex(out);return g;}
removeDegenerates(body);
function paint(g,fn){const p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){const c=fn(p.getX(i),p.getY(i),p.getZ(i));colors.push(c.r,c.g,c.b);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;}
paint(body,(x,y,z)=>{const r=Math.hypot(x,z);return y>=.093?cream:blue;});
class HandlePath extends T.Curve {getPoint(t,target=new T.Vector3()){const a=-Math.PI/2+t*Math.PI;return target.set(.038+.032*Math.cos(a)+.003*Math.sin(a),.05+.029*Math.sin(a),0);}}
const handle = new T.TubeGeometry(new HandlePath(),8,.0062,6,false);
paint(handle,()=>blue);
// Close both end disks. Hidden ceramic overlaps are intentional, not boolean-unioned.
function cap(t){const curve=new HandlePath(),p=curve.getPoint(t),tan=curve.getTangent(t);const g=new T.CircleGeometry(.0062,6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),tan.multiplyScalar(t===0?-1:1)));g.translate(...p);return paint(g,()=>blue);}
const ceramic=new T.MeshStandardMaterial({name:'Pastel blue satin ceramic + warm lip',color:0xffffff,vertexColors:true,roughness:.65,metalness:0});
const pawMat=new T.MeshStandardMaterial({name:'Cream raised paw enamel',color:cream,roughness:.7,metalness:0});
// Split vertices at every triangle, then bake face normals into the exported GLB.
// Flat shading is in the asset itself; no viewer-specific material flag is needed.
function facet(g){const flat=g.toNonIndexed();flat.computeVertexNormals();flat.setIndex(Array.from({length:flat.attributes.position.count},(_,i)=>i));return flat;}
const group=new T.Group(); group.name='Cloud Paw Mug';
const shell=new T.Mesh(facet(mergeGeometries([body,handle,cap(0),cap(1)])),ceramic);shell.name='Ceramic body, rolled rim, inner bowl and solid handle';group.add(shell);
// Small ceramic applique on +Z face, follows the tapered surface. All details are geometry.
const stamps=[];
for(const [x,y,sx,sy] of [[0,.044,.007,.0057],[-.009,.054,.003,.0042],[-.0036,.059,.0031,.0041],[.0036,.059,.0031,.0041],[.009,.054,.003,.0042]]){const r=.036+(y-.008)*(.008/.082),z=r-Math.tan(Math.PI/12)*Math.abs(x);const g=removeDegenerates(new T.SphereGeometry(1,8,4));g.scale(sx,sy,.0015);g.translate(x,y,z+.0002);stamps.push(g);}
const paw=new T.Mesh(facet(mergeGeometries(stamps)),pawMat);paw.name='Raised paw emblem';group.add(paw);
group.userData={units:'meters',upAxis:'Y',pivot:'base center',front:'+Z',handle:'+X',collision:'Use compound convex colliders; do not use a single convex hull if handle aperture matters.'};
const scene=new T.Scene();scene.add(group);
const data=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
const path=fileURLToPath(new URL('mug.glb',import.meta.url));await writeFile(path,Buffer.from(data));
const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3());let tris=0,verts=0;group.traverse(m=>{if(m.isMesh){tris+=m.geometry.index.count/3;verts+=m.geometry.attributes.position.count;}});
const spec={triangles:tris,vertices:verts,dimensionsMeters:size.toArray(),bounds:{min:box.min.toArray(),max:box.max.toArray()},bytes:data.byteLength,materials:2,drawCalls:2,textures:0};await writeFile(new URL('asset-spec.json',import.meta.url),JSON.stringify(spec,null,2));console.log(spec);
