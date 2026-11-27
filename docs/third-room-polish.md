# Third-room interaction polish

Current local changes add floor-contact fracture for light string (2), snow globe (11) and lantern (17), reusing physical triangular shards with floor collision. These props keep the existing scoring IDs and protected-item penalties. Reset restores them and removes fragments.

The fire prototype starts at the fireplace frontage (prop bounds reaching z < -2.6 in front of the fireplace, overlapping |x| < 1 and y < 1.15). After 0.7 seconds, flames can ignite a nearby combustible prop with 0.8 seconds of sustained proximity within a 0.12 m expanded collision envelope. Glass baubles, globe, lantern and metal bell do not ignite. Burning props retain rigid bodies and gradually darken rather than disappearing. Reset removes fire and restores source materials. No physical heat/fluid simulation is claimed.

The mantel gains six decorative copies (garland, ribbon, two holly sprigs, two stockings), outside the scoring roster. Tree fairy-light materials glow and briefly dim on staggered six-second cycles. Camera framing changes from 1.15 to 1.02 times the shared frustum, about 13% magnification relative to the previous third-room view.

BGM base gain is reduced from 0.22 to 0.12; per-object contact and landing gains increase to 1.10 and 1.35. Saved music/effects sliders remain respected. Glass-container and third-room glass landings select the original synthesized glass-break variants retained from the local audio draft, replacing the landing pop without changing the first-contact pop. No new cat model is included.

Tests cover first-floor fracture and reset, fire spread and material restoration, alongside existing physics, scoring and audio regressions. Chrome smoke checks confirm scene loading, active fire, globe fracture and reset without page errors. Real-phone listening and artistic review remain pending. Teammate review is required before merging to main.
