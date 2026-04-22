// Copyright: Your Name. Apache 2.0
// Auto-generated fixture from /tmp/iverson-out.json (Claude extraction of
// Basketball For Coaches p.65-66 "Iverson Ram") with straight-line paths
// synthesized between move endpoints. Intended as a test-bench for the
// Path B multi-phase viewer. IP note: slug should be renamed before any
// public surface (Iverson is on the denylist).

import type { V7Play } from "@/lib/plays/v7-types";

export const iversonRamV7: V7Play = {
  "name": "Iverson Ram",
  "tag": "Pick & Roll",
  "desc": "Wings exchange sides off staggered screens before 5 sprints up to set an on-ball screen for 2 in an isolated pick-and-roll.",
  "coachNote": "Call this when you want your best ball-handler in a clean pick-and-roll with no help defender, as 4's down screen on 5's defender clears the lane.",
  "concepts": {
    "counters": [
      "man-to-man",
      "switching defense",
      "weak-side help defense"
    ],
    "bestFor": "Dynamic ball-handler at 2; mobile big at 5 who can set screens and roll; smart cutter at 3",
    "related": []
  },
  "players": {
    "1": [
      0,
      33
    ],
    "2": [
      -17,
      22
    ],
    "3": [
      17,
      22
    ],
    "4": [
      -6,
      18
    ],
    "5": [
      6,
      18
    ]
  },
  "roster": {
    "1": {
      "name": "PG",
      "pos": "PG"
    },
    "2": {
      "name": "SG",
      "pos": "SG"
    },
    "3": {
      "name": "SF",
      "pos": "SF"
    },
    "4": {
      "name": "PF",
      "pos": "PF"
    },
    "5": {
      "name": "C",
      "pos": "C"
    }
  },
  "defense": {
    "X1": [
      0,
      30
    ],
    "X2": [
      -17,
      19
    ],
    "X3": [
      17,
      19
    ],
    "X4": [
      -6,
      15
    ],
    "X5": [
      6,
      15
    ]
  },
  "ballStart": "1",
  "phases": [
    {
      "label": "Wings Begin Exchange",
      "text": "The play begins with the two wing players exchanging sides. 2 will go over top receiving a screen from 4.",
      "spotlightText": {
        "1": "Hold the ball at the top and read the wings — your dribble direction signals who goes over.",
        "2": "Cut hard over the top of 4's screen, timing your curl to receive the pass.",
        "3": "Prepare to cut under — read 5's screen on the low block and time your move with 2's cut.",
        "4": "Step out and set a firm screen for 2 cutting over the top — stay wide.",
        "5": "Move to the low block and prepare to screen for 3 going under."
      },
      "actions": [
        {
          "marker": "screen",
          "path": "M -6 18 L -6 18",
          "move": {
            "id": "4",
            "to": [
              -6,
              18
            ]
          }
        },
        {
          "marker": "arrow",
          "path": "M -17 22 L 17 22",
          "move": {
            "id": "2",
            "to": [
              17,
              22
            ]
          }
        }
      ],
      "defenseActions": [
        {
          "id": "X2",
          "to": [
            -10,
            20
          ],
          "desc": "X2 fights over the screen chasing 2."
        },
        {
          "id": "X4",
          "to": [
            -6,
            17
          ],
          "desc": "X4 hedges slightly to slow 2's curl."
        }
      ]
    },
    {
      "label": "3 Cuts Under Screen",
      "text": "3 will go under receiving a screen from 5 on the low block.",
      "spotlightText": {
        "1": "Stay at the top and continue reading the exchange — stay patient before making your pass.",
        "2": "Continue your cut to the right wing and get ready to receive the pass from 1.",
        "3": "Cut tight under 5's low-block screen and relocate to the left wing — stay ready.",
        "4": "Hold your position after screening 2 and prepare for your next action.",
        "5": "Set a hard screen on X3 at the low block, sealing them as 3 cuts under."
      },
      "actions": [
        {
          "marker": "screen",
          "path": "M 6 18 L 5 7",
          "move": {
            "id": "5",
            "to": [
              5,
              7
            ]
          }
        },
        {
          "marker": "arrow",
          "path": "M 17 22 L -17 22",
          "move": {
            "id": "3",
            "to": [
              -17,
              22
            ]
          }
        }
      ],
      "defenseActions": [
        {
          "id": "X3",
          "to": [
            14,
            19
          ],
          "desc": "X3 tries to go under the screen to stay with 3."
        },
        {
          "id": "X5",
          "to": [
            5,
            7
          ],
          "desc": "X5 holds position near the block while 5 screens."
        }
      ]
    },
    {
      "label": "1 Passes to 2",
      "text": "1 opens up the angle with a dribble and makes the pass to 2 as they come off of 4's screen. Occasionally this will be open for 2 to turn and drive to the rim.",
      "spotlightText": {
        "1": "Take one dribble to the right side to open the passing angle, then hit 2 as they clear 4's screen.",
        "2": "Catch the pass off 4's screen — read X2 immediately. If they're trailing, turn and attack the rim.",
        "3": "Settle on the left wing after your cut and space the floor.",
        "4": "Hold your screen position until 2 catches, then prepare to screen down on X5.",
        "5": "Release from the low block and get ready to sprint up for the on-ball screen."
      },
      "actions": [
        {
          "marker": "arrow",
          "path": "M 0 33 L 4 31",
          "move": {
            "id": "1",
            "to": [
              4,
              31
            ]
          }
        },
        {
          "marker": "arrow",
          "path": "M 17 22 L 17 22",
          "move": {
            "id": "2",
            "to": [
              17,
              22
            ]
          }
        }
      ],
      "defenseActions": [
        {
          "id": "X1",
          "to": [
            4,
            28
          ],
          "desc": "X1 slides with 1's dribble move."
        },
        {
          "id": "X2",
          "to": [
            15,
            21
          ],
          "desc": "X2 scrambles to close out on 2 after the catch."
        }
      ]
    },
    {
      "label": "1 Clears, 3 Drops",
      "text": "1 then clears out to the opposite wing to create space and 3 rotates down to the corner.",
      "spotlightText": {
        "1": "Clear hard to the left wing — your movement pulls X1 away and creates driving lanes.",
        "2": "Hold your position on the right wing and wait for 5's screen — the play is setting up for you.",
        "3": "Rotate down from the left wing into the left corner to spread the floor and remove help defenders.",
        "4": "Begin your down screen on X5 to free 5 to sprint up — timing is everything here.",
        "5": "Read 4's screen on your defender and sprint up to set the on-ball screen for 2."
      },
      "actions": [
        {
          "marker": "arrow",
          "path": "M 4 31 L -17 22",
          "move": {
            "id": "1",
            "to": [
              -17,
              22
            ]
          }
        },
        {
          "marker": "arrow",
          "path": "M -17 22 L -22 5",
          "move": {
            "id": "3",
            "to": [
              -22,
              5
            ]
          }
        }
      ],
      "defenseActions": [
        {
          "id": "X1",
          "to": [
            -17,
            20
          ],
          "desc": "X1 follows 1 to the left wing."
        },
        {
          "id": "X3",
          "to": [
            -20,
            7
          ],
          "desc": "X3 chases 3 down to the corner."
        }
      ]
    },
    {
      "label": "4 Screens Down on X5",
      "text": "4 screens down on 5's defender as 5 sprints up and sets an on-ball screen for 2.",
      "spotlightText": {
        "1": "Hold the left wing — your spacing is keeping the help side occupied.",
        "2": "Read 5 sprinting up and set your feet to receive the screen cleanly — the pick-and-roll is live.",
        "3": "Stay in the corner — your presence prevents the weak-side defender from helping on the roll.",
        "4": "Plant a hard down screen on X5, giving 5 a clean release to sprint to 2 — hold the block.",
        "5": "Sprint hard off 4's screen and set a tight on-ball screen for 2 — your speed getting there is the key to this play."
      },
      "actions": [
        {
          "marker": "screen",
          "path": "M -6 18 L 5 10",
          "move": {
            "id": "4",
            "to": [
              5,
              10
            ]
          }
        },
        {
          "marker": "arrow",
          "path": "M 5 7 L 17 18",
          "move": {
            "id": "5",
            "to": [
              17,
              18
            ]
          }
        }
      ],
      "defenseActions": [
        {
          "id": "X5",
          "to": [
            10,
            14
          ],
          "desc": "X5 is caught on 4's down screen, slow to recover."
        },
        {
          "id": "X4",
          "to": [
            5,
            12
          ],
          "desc": "X4 scrambles down to engage 4's new position."
        }
      ]
    },
    {
      "label": "2 Attacks Off Screen",
      "text": "2 dribbles off 5's screen and makes the best basketball play to create a score.",
      "spotlightText": {
        "1": "Stay spaced on the left wing — be ready for a kick-out if the defense collapses.",
        "2": "Attack hard off 5's screen — read X2 and X5. Drive, pull up, or kick out to the open man.",
        "3": "Stay in the corner — you're the safety valve if both defenders collapse.",
        "4": "Roll or pop after your down screen — you may be open on the short roll as defenders rotate.",
        "5": "After setting the screen, roll hard to the rim — with X5 screened out, you have a clear path."
      },
      "actions": [
        {
          "marker": "arrow",
          "path": "M 17 22 L 8 18",
          "move": {
            "id": "2",
            "to": [
              8,
              18
            ]
          }
        },
        {
          "marker": "arrow",
          "path": "M 17 18 L 10 10",
          "move": {
            "id": "5",
            "to": [
              10,
              10
            ]
          }
        },
        {
          "marker": "shot",
          "path": "M 8 18 L 8 18",
          "move": {
            "id": "2",
            "to": [
              8,
              18
            ]
          }
        }
      ],
      "defenseActions": [
        {
          "id": "X2",
          "to": [
            12,
            20
          ],
          "desc": "X2 attempts to go over the screen to stay with 2."
        },
        {
          "id": "X5",
          "to": [
            14,
            16
          ],
          "desc": "X5 late recovering after 4's down screen."
        }
      ]
    }
  ],
  "branchPoint": {
    "prompt": "Read the defense — how is 5's on-ball screen covered?",
    "subprompt": "Watch X2 and X5 as 2 comes off the screen.",
    "options": [
      {
        "label": "Switch",
        "desc": "X2/X5 switch — 5 slips or rolls to the rim against a smaller defender.",
        "icon": "→",
        "phase": {
          "label": "5 Rolls to Rim",
          "text": "If X2 and X5 switch, 5 rolls hard to the rim against a smaller switched defender, and 2 delivers the pass for the easy finish.",
          "spotlightText": {
            "1": "Stay spaced — do not collapse into the paint.",
            "2": "Feel the switch immediately and dump it down to 5 rolling to the rim.",
            "3": "Hold the corner — your spacing keeps weak-side help pinned.",
            "4": "Drift to the short corner or elbow for a secondary option if the roll is denied.",
            "5": "The moment you feel the switch, roll hard to the rim — you have a size advantage, go finish."
          },
          "actions": [
            {
              "marker": "arrow",
              "path": "M 10 10 L 3 4",
              "move": {
                "id": "5",
                "to": [
                  3,
                  4
                ]
              }
            },
            {
              "marker": "arrow",
              "path": "M 8 18 L 12 18",
              "move": {
                "id": "2",
                "to": [
                  12,
                  18
                ]
              }
            }
          ],
          "defenseActions": [
            {
              "id": "X2",
              "to": [
                17,
                20
              ],
              "desc": "X2 now guarding 5 on the roll — mismatched."
            },
            {
              "id": "X5",
              "to": [
                14,
                22
              ],
              "desc": "X5 picks up 2 after switch, out of position."
            }
          ]
        }
      },
      {
        "label": "Drop / No Switch",
        "desc": "X5 drops to protect the rim — 2 takes the pull-up jumper at the free-throw line.",
        "icon": "↗",
        "phase": {
          "label": "2 Pull-Up Jumper",
          "text": "If X5 drops and X2 chases over the screen, 2 pulls up for the mid-range jumper at the elbow or free-throw line area.",
          "spotlightText": {
            "1": "Hold the left wing — stay ready for a reset if 2 passes out.",
            "2": "Feel X5 dropping — gather and rise up for the pull-up jumper. Don't over-dribble.",
            "3": "Stay in the corner — if the pull-up is denied, you may get a skip pass.",
            "4": "Drift to the elbow as a secondary outlet if 2 passes out of the pull-up.",
            "5": "Hold your screen and occupy X5 — your presence is creating the space for 2's jumper."
          },
          "actions": [
            {
              "marker": "arrow",
              "path": "M 8 18 L 6 19",
              "move": {
                "id": "2",
                "to": [
                  6,
                  19
                ]
              }
            },
            {
              "marker": "shot",
              "path": "M 6 19 L 6 19",
              "move": {
                "id": "2",
                "to": [
                  6,
                  19
                ]
              }
            }
          ],
          "defenseActions": [
            {
              "id": "X5",
              "to": [
                5,
                12
              ],
              "desc": "X5 drops to protect the rim, conceding the mid-range."
            },
            {
              "id": "X2",
              "to": [
                10,
                20
              ],
              "desc": "X2 chases over the screen, a step slow."
            }
          ]
        }
      }
    ]
  }
} as V7Play;
