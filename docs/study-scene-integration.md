# Study desk gameplay scene

Original desk/mug GLBs and preview layout are reused from the team's study-desk work. Tests verify approved SHA-256 hashes. The gameplay layout is src/scenes/study-desk-gameplay.scene.json. Desk scale [2.2,1,3.3] and a 90-degree Y turn produce a 2.97 by 3.96 m tabletop at Y=0.75. Movement bounds follow transformed surface corners.

Five mugs have stable unique IDs and playtest scales 3.6, 4.2, 4.8, 5.4 and 6. Visuals and colliders scale together; mass stays 0.25. Scoring ignores size: toppling earns 10, falling completes each object's total to 20, so a full clear totals 100.

loadStudyScene() supplies roster, tabletop bounds and visual reset. desk-physics.js connects actual body simulation/reset, the cat proxy and swat impulses to the teammate's shared physics events. Real pushing and scoring are connected. Runner hazards/pickups are removed. See physics-integration.md for detection thresholds and limitations. Verify initial stability, movement, swat range, edge limits, settlement and Restart/Replay in the normal preview. Debug scoring has a separate synthetic roster.
