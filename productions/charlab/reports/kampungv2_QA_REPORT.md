# QA Report: Kampung Rawa Sari v2 (G2 Stills)

Inspector: qa-inspector, 2026-11-22
Inputs: `out/kampungv2/stills/f0005..f0175` (18 slides) and regression stills for setlab, kampungupgrade, kucingoyen and youtubebanner, compared against the `before/` baseline in the session scratchpad.
Location note: the request asked for `out/kampungv2/QA_REPORT.md`, but `out/*` belongs to render-engineer (docs/04), so this report is filed under the QA-owned `productions/charlab/reports/`.

## `npm run check`
PASS, exit 0. `tsc --noEmit` is clean, node tests are 16/16 pass, and python tests are 3/3 OK.

## Scores per requested area (1-10)
| Area | Score | Note |
|---|---|---|
| 1. Grounding | 7 | All billboards on FIK lt2/lt3, the school, the bridge and the sidewalks stand on the floor and have contact shadows. Problems: a rod passes through the desks (f0065), a gas tap bisects the actor (f0105), a cable crosses the grass (f0125), and a beam floats with no support (f0165). |
| 2. Scale / readability | 6 | Desks and doors look plausible next to 1.78 m actors. Several signs are thin, cut off or too small to read. |
| 3. Motivated light | 7 | Most glows have a source. Warung Bu Sri has light with no visible fixture, one window blows out, and streetlamps glow at noon. |
| 4. Visual quality | 5 | Red-brown blotches on the grass, visible world edges, red "blood" spots on the SD wall, whiteboards mounted over windows. |
| 5. Regressions | 5 | Banner hero composition is broken (a pole and a bollard sit dead centre). The Kost poster now has a brick texture. The Kampus lab heading is gone. Several "after" stills were never re-rendered. |

Look scores: color 6, lighting 7, ink 8, textures 5, characters 8, depth 7, composition 6.
G2 rule "no area below 5" is met at the threshold, but fixes 1-6 should be done before asking for approval.

## Fix list (by severity)
1. **youtubebanner f0000.jpg** (set-designer). A new power pole with crossarm stands dead centre behind the "WARKOP 24 JAM" sign and runs out the top of the frame. A grey bollard or box sits dead centre on the curb in front of the cast. Both are inside the banner safe area. The FIK block now fills the right third and replaces the old blue building and "Kampus IT" sign. Hide these via `hideNames` or move them. The deliverable PNGs `f0000.png` and `f0001.png` are stale (19:56) and still show the old world.
2. **Grass, all exteriors: f0125, f0165, f0175, kampungupgrade f0030/f0045** (set-designer, `generate_pbr_textures.py`). The grass has large dark red-brown blotches that read as blood or camouflage. Use a green-family variation only, or lower the contrast.
3. **setlab f0060 (Kost)** (set-designer, kost.glb material). The "</> S1 INFORMATIKA" poster shows a red brick texture behind the text, so the poster gets the wall material. The chair also picked up streaky dark-red wood.
4. **setlab f0090 (KampusSet)** (set-designer). The new lab lost the whiteboard heading "LAB S1 TEKNIK INFORMATIKA". The flowchart boxes (MULAI/INPUT/PROSES) now sit behind the three actors' heads. A red-white flag and a "LA..." sign are cut by the right edge. None of the "4 PC Lab, Meja Dosen" from the subtitle is in shot. The camera or the whiteboard needs to move so the board reads above the heads.
5. **World edge visible: f0075, f0085, f0115** (set-designer). On the right of the school (f0075/f0085) the grass ends and sky shows below the horizon. On the left of the west street (f0115) the road and grass end in sky, and top right shows a floating grass "island" with a tree and a cone mountain. Extend the ground or add backdrop buildings.
6. **SD wall f0095** (set-designer, `weathered_paint_mint`). The mint walls have red-pink spots and dark streaks that read as blood spatter. The "Visi Misi" boards are blank (plain green/blue) while the slide promises them. The "JADWAL PIKET" sign is cut by the left edge.
7. **Whiteboard over windows: f0035, f0065, f0095, f0105** (set-designer). The board overlaps the back-wall windows, whose frames poke out above and beside it. In f0095 a window behind it glows solid yellow. Move the windows or the board.
8. **f0065 lab jaringan** (set-designer). A thin vertical rod rises from the desk row and pierces each desk. The desks touch or overlap each other and have no monitors (only flat dark slabs).
9. **f0105 Lab IPA** (cinematographer for the slide pose, set-designer for the tap). The camera is almost on top of the front bench. A gas-tap rod lines up exactly with the actor's centreline and reads as a pole through his body. The room reads as a narrow corridor. Raise or pull back the camera, or offset it laterally.
10. **f0125 bridge** (set-designer). A black cable line runs across the grass on the right (sagging cable meeting the terrain, or a stray edge). The right pole is cut at the top edge. Streetlamps glow at noon.
11. **f0165 / f0175 Tio** (set-designer). A long wooden beam crosses the top-left of the frame with no visible support on the left. The bakmie cart sign is unreadable (small red-on-magenta), especially at night. Blue stools at the bottom edge are cut into blobs. In f0175 a lit window sits right behind Tio's head as a hot halo (character-animator or cinematographer: shift the spot about 0.5 m). The 'bakmie' rightProp is not visible.
12. **f0145 Warung Bu Sri malam** (set-designer and light-colorist). The shelves are lit by the new point light at (-92, 2.8, 12.6), but no bulb or tube is visible. Add a visible fixture under the canopy.
13. **f0025 FIK facade sore** (set-designer and light-colorist). "FAKULTAS ILMU KOMPUTER" is thin yellow on a purple-washed facade and barely readable, so give it unlit text with an outline. "FIK RAWA SARI" is hidden behind the banner and "E KAMPUS IT" is cut at the right edge. The whole frame is a single lavender value, so the amber/sore grade flattens contrast.
14. **f0075 / f0085 school** (set-designer). The facade signs "SD NEGERI RAWA SARI 04" and "SMA NEGERI ..." are unreadable at this distance. In f0085 the left high-rise has one window blown out by bloom (light-colorist).
15. **f0135 bengkel** (set-designer). The side walls are semi-transparent, so the bengkel reads as a glass box. The scooters look child-size next to the actor. A streetlamp glows at noon.
16. **f0155 gang** (set-designer). A tree stands in the middle of the paved gang with no planter. The slide promises a gapura but none is visible. Brick texture on the right wall is over-scaled (huge bricks).
17. **f0035 / f0045 / f0105 interiors** (set-designer). The cracked-plaster grime is heavy for a campus, and f0035 shows a horizontal seam where the upper and lower wall textures meet. f0045 mentions a projector but none is visible.
18. **f0005 overview** (light-colorist). Heavy milky haze washes out the whole map, and the south field of box houses has no paths or roads.
19. **kampungupgrade f0060/f0075 sore** (set-designer). A new windowless grey box building breaks the sunset skyline behind the area pedagang. Mbak Yuni overlaps the es-buah cart's left post with a second figure stacked behind her, and Bang Utoh is half-hidden by a pos ronda pillar. The actor layout is the same in the f0075 baseline, so it is pre-existing, but it is still a defect.
20. **Regression process** (render-engineer). These "after" files were not re-rendered and are byte-identical to the baseline:
    - kampungupgrade f0120 (21:38)
    - kucingoyen f0160, f0170, f0192, f0217 (19:07)
    - youtubebanner f0001.jpg, f0000.png, f0001.png

    The kampungupgrade before-baseline f0030/f0060/f0090 is 1440x810, while the after files are 960x540. Re-render these so the comparison is complete.
21. **setlab f0000/f0030 Warkop** (render-engineer to investigate). The plain wall and floor became brick and tile, but `warkop.glb` and `kost.glb` are unchanged (16:19). Either the setlab baseline is stale or texture loading is not deterministic. Render setlab twice and diff the results.

## Regression differences (all visible)
- setlab f0000/f0030: brick wall, tiled floor, textured counter and sign frame. Benign if intended, but the cause is unconfirmed (item 21).
- setlab f0060: Kost wall noise, floor tile, brick poster (item 3, unwanted).
- setlab f0090: whole Kampus lab replaced, FIK badge, projector. Heading lost (item 4, unwanted).
- kampungupgrade f0030/f0045/f0060/f0075: new background houses and a grey block. Tio has his new look. Fine except the grey block (item 19).
- kampungupgrade f0090/f0105/f0119: extra pole and cables behind the 2-storey house and at the warkop. Acceptable.
- kampungupgrade f0000: identical.
- kucingoyen f0090/f0150/f0180/f0204: the background tower behind the warkop is now the grey FIK building. Acceptable.
- kucingoyen f0000/f0030/f0060/f0232: only JPEG-level noise.
- youtubebanner f0000: left house replaced, FIK on the right, a centre pole and a centre bollard (item 1, unwanted).
