import type { Play } from "@/lib/types";

export const weaksideFlareSlip: Play = {
  name: "Weakside Flare Slip",
  tag: "Ball Screen",
  desc: "Very simple action, and works great against switch defense. Slip screens are a great counter because defenders usually anticipate the switch and move early. A back/flare screen also naturally puts the screener closer to the rim which makes the slip even more effective.",
  players: {
    "1": [0, 32],
    "2": [-13, 26],
    "3": [13, 26],
    "4": [23, 4],
    "5": [21, 17],
  },
  roster: {
    "1": { name: "Guard 1", pos: "PG" },
    "2": { name: "Shooter 2", pos: "SG" },
    "3": { name: "Wing 3", pos: "SF" },
    "4": { name: "Forward 4", pos: "PF" },
    "5": { name: "Post 5", pos: "C" },
  },
  ballStart: "1",
  phases: [
    {
      label: "Phase 1",
      text: "4 jogs toward 2 and sells the flare screen, making it look like the action is for 2.",
      actions: [
        {
          marker: "screen",
          path: "M21.427 4.069 C-5.204 5.347 -16.703 11.397 -13.070 22.220",
          move: { id: "4", to: [-13.07, 22.22] },
        },
        {
          marker: "arrow",
          path: "M-14.364 25.238 C-15.977 24.036 -17.659 21.740 -19.410 18.350",
          move: { id: "2", to: [-19.41, 18.35] },
        },
      ],
    },
    {
      label: "Phase 2",
      text: "As soon as the defense reacts, 4 cuts hard to the basket.",
      detail:
        "The screen itself is not the focus. The timing of the slip is what matters. As soon as the defender jumps to switch, 4 should roll. Even if there's no contact, that's fine. The goal is to beat the switch before it happens.",
      actions: [
        {
          marker: "arrow",
          path: "M-11.893 21.174 C-8.792 18.417 -5.686 15.655 -2.577 12.890",
          move: { id: "4", to: [-1.52, 11.95] },
        },
        {
          marker: "arrow",
          dashed: true,
          path: "M-0.120 30.430 L-1.400 13.520",
          ball: { from: "1", to: "4" },
        },
      ],
    },
  ],
};
