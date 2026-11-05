# Cat integration

The original user-supplied GLB is packaged at src/assets/models/mikan-cat.glb. GLTFLoader and SkeletonUtils preserve its rig and embedded Idle, Walk and PawWave animations. Runtime scale is 1.6, +Z is forward and tabletop Y is 0.75. Edge margin is 0.352 m. The camera follows at 50-degree elevation, with no horizontal orbit.

Idle/Walk blend with movement. K and SWAT play PawWave once over 0.75 seconds, briefly stopping movement/turning. A fixed forward physical region handles hits, not individual claw meshes. Restart resets animation, camera and physics. Loading errors show Retry. No model regeneration or CDN is used. Team records must retain source ownership and redistribution permission. See physics-integration.md for action tuning and limitations.
