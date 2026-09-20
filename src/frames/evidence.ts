import {
  TAU,
  MONO,
  mk,
  rng,
  rect,
  poly,
  line,
  ellipse,
  grad,
  glow,
  txt,
  textBox,
  layer,
  subtract,
  finish,
  grain,
  sensor,
} from './sensor';
import type { Ctx, Rect } from './sensor';

function burn(x: Ctx, s: string, X: number, Y: number, size = 19, align: CanvasTextAlign = 'left') {
  x.save();
  x.shadowColor = '#000';
  x.shadowBlur = 2;
  x.shadowOffsetY = 1;
  const b = textBox(x, s, X, Y, size, '#d4e3dc', '500', align);
  x.restore();
  return b;
}

function neon(x: Ctx, s: string, X: number, Y: number, size: number, color: string) {
  x.save();
  x.shadowColor = color;
  x.shadowBlur = 18;
  txt(x, s, X, Y, size, color, '700');
  x.shadowBlur = 4;
  txt(x, s, X, Y, size, '#f4e9df', '700');
  x.restore();
}

function texture(x: Ctx, W: number, H: number, seed: number, n: number, opacity = 0.09) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const X = r() * W,
      Y = r() * H;
    rect(x, X, Y, 1 + r() * 3, 0.5 + r(), `rgba(175,184,176,${r() * opacity})`);
  }
}

function palm(x: Ctx, X: number, Y: number, h: number, seed = 1) {
  const r = rng(seed);
  x.save();
  x.translate(X, Y);
  line(
    x,
    [
      [0, 0],
      [h * 0.025, -h * 0.44],
      [h * 0.09, -h * 0.86],
    ],
    '#111c22',
    Math.max(3, h * 0.025),
  );
  const cx = h * 0.09,
    cy = -h * 0.86;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i * Math.PI) / 8,
      dx = Math.cos(a) * h * 0.35,
      dy = Math.sin(a) * h * 0.16 + h * 0.05;
    x.strokeStyle = '#111a21';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(cx, cy);
    x.quadraticCurveTo(cx + dx * 0.65, cy + dy - h * 0.13, cx + dx, cy + dy);
    x.stroke();
    for (let j = 1; j < 15; j++) {
      const t = j / 15,
        px = cx + dx * t,
        py = cy + (dy - h * 0.19) * t + h * 0.19 * t * t;
      line(
        x,
        [
          [px, py],
          [px + dx * 0.055, py + h * (0.02 + r() * 0.035)],
        ],
        '#142128',
        1.3,
      );
    }
  }
  x.restore();
}
/* Fixed architecture and reflections, with atmospheric depth. */
function street(
  x: Ctx,
  W: number,
  H: number,
  { seed = 4, night = true }: { seed?: number; night?: boolean } = {},
) {
  const r = rng(seed),
    horizon = H * 0.43;
  rect(
    x,
    0,
    0,
    W,
    H,
    grad(x, 0, 0, 0, horizon, [
      [0, night ? '#101426' : '#202235'],
      [0.55, night ? '#352238' : '#735063'],
      [1, night ? '#68515a' : '#d29281'],
    ]),
  );
  for (let i = 0; i < 9; i++) {
    const yy = horizon * (0.1 + i * 0.075);
    rect(x, 0, yy, W, 5 + r() * 12, `rgba(116,107,124,${0.012 + r() * 0.025})`);
  }
  glow(x, W * 0.66, horizon, H * 0.55, '#db7897', 0.13);
  for (let i = 0; i < 18; i++) {
    const bx = (i * W) / 17,
      bw = W / 18 + (r() * W) / 25,
      bh = H * (0.035 + r() * 0.16);
    rect(x, bx, horizon - bh, bw, bh, '#30323a');
    for (let wy = horizon - bh + 10; wy < horizon; wy += 12)
      for (let wx = bx + 6; wx < bx + bw - 3; wx += 9)
        if (r() > 0.66) rect(x, wx, wy, 2, 3, '#918473');
  }
  // road and foreground have a single deep vanishing point.
  rect(
    x,
    0,
    horizon,
    W,
    H - horizon,
    grad(x, 0, horizon, 0, H, [
      [0, '#302d34'],
      [0.28, '#212731'],
      [1, '#0c131b'],
    ]),
  );
  for (let i = 0; i < 1300; i++) {
    const yy = horizon + r() * (H - horizon),
      dep = (yy - horizon) / (H - horizon),
      xx = r() * W;
    rect(
      x,
      xx,
      yy,
      (1 + r() * 22) * dep,
      Math.max(0.5, dep * 1.8),
      `rgba(133,132,145,${r() * 0.09})`,
    );
  }
  // Left art deco hotel: facade, side plane, cornices, individual window glass.
  poly(
    x,
    [
      [0, H * 0.14],
      [W * 0.27, H * 0.23],
      [W * 0.29, horizon + H * 0.12],
      [0, H * 0.67],
    ],
    grad(x, 0, 0, W * 0.29, 0, [
      [0, '#3e4148'],
      [0.65, '#4a4550'],
      [1, '#292c36'],
    ]),
  );
  for (let floor = 0; floor < 5; floor++) {
    const y = H * (0.19 + floor * 0.082);
    line(
      x,
      [
        [0, y],
        [W * 0.277, y + H * (0.075 - floor * 0.007)],
      ],
      '#73706e',
      3,
    );
    for (let j = 0; j < 7; j++) {
      const xx = j * W * 0.037,
        yy = y + H * 0.012 + j * H * 0.011;
      rect(x, xx + 6, yy, W * 0.022, H * 0.047, '#161e28');
      if (r() > 0.45) {
        rect(
          x,
          xx + 7,
          yy + 1,
          W * 0.018,
          H * 0.041,
          grad(x, xx, yy, xx + W * 0.02, yy, [
            [0, '#bd9b74'],
            [1, '#66545a'],
          ]),
        );
        line(
          x,
          [
            [xx + W * 0.016, yy],
            [xx + W * 0.016, yy + H * 0.045],
          ],
          '#222a34',
          2,
        );
      }
    }
  }
  poly(
    x,
    [
      [W * 0.81, H * 0.24],
      [W, H * 0.15],
      [W, H * 0.66],
      [W * 0.78, H * 0.54],
    ],
    '#222b37',
  );
  for (let i = 0; i < 7; i++)
    line(
      x,
      [
        [W * 0.81, H * (0.26 + i * 0.045)],
        [W, H * (0.17 + i * 0.07)],
      ],
      '#424653',
      2,
    );
  line(
    x,
    [
      [0, H * 0.6],
      [W * 0.54, horizon],
      [W, H * 0.62],
    ],
    '#b1a494',
    2,
  );
  // perspective lane lines, reflective sections.
  for (let i = 0; i < 6; i++) {
    const t0 = 0.1 + i * 0.14,
      t1 = t0 + 0.055;
    line(
      x,
      [
        [W * 0.58 - W * 0.35 * t0 * t0, horizon + (H - horizon) * t0 * t0],
        [W * 0.58 - W * 0.35 * t1 * t1, horizon + (H - horizon) * t1 * t1],
      ],
      'rgba(208,194,165,.42)',
      1 + i * 0.7,
    );
  }
  for (const [xx, yy, color] of [
    [W * 0.1, H * 0.49, '#ef4692'],
    [W * 0.27, H * 0.43, '#55d5d3'],
    [W * 0.84, H * 0.47, '#ffb361'],
  ] as [number, number, string][]) {
    glow(x, xx, yy, H * 0.2, color, 0.19);
    for (let i = 0; i < 100; i++) {
      const t = r(),
        Y = yy + H * 0.07 + t * (H - yy),
        spread = (0.02 + t * 0.1) * W;
      rect(
        x,
        xx + (r() - 0.5) * spread,
        Y,
        r() * W * 0.04 + 1,
        1 + r() * 2,
        `rgba(${color === '#55d5d3' ? '60,190,190' : color === '#ef4692' ? '219,64,121' : '222,159,101'},${(1 - t) * r() * 0.16})`,
      );
    }
  }
  palm(x, W * 0.18, H * 0.64, H * 0.45, 1);
  palm(x, W * 0.82, H * 0.6, H * 0.32, 2);
  palm(x, W * 0.71, H * 0.51, H * 0.18, 3);
  for (const X of [W * 0.36, W * 0.76]) {
    const Y = horizon + H * 0.075;
    line(
      x,
      [
        [X, Y],
        [X, Y - H * 0.24],
        [X + W * 0.03, Y - H * 0.26],
      ],
      '#252b32',
      3,
    );
    glow(x, X + W * 0.03, Y - H * 0.26, H * 0.1, '#edca9c', 0.7);
    rect(x, X + W * 0.021, Y - H * 0.262, W * 0.027, 2, '#fff4d8');
  }
}
/* Same coupe in both photographs. Semantic regions measured on transformed layers. */
function coupe(x: Ctx, X: number, Y: number, S = 1) {
  function local(k: Ctx, fn: (q: Ctx) => void) {
    k.save();
    k.translate(X, Y);
    k.scale(S, S);
    fn(k);
    k.restore();
  }
  // Wet contact shadow and taillight reflections lie outside the body target.
  local(x, (k) => {
    ellipse(k, 304, 259, 283, 32, 'rgba(0,0,0,.78)');
    for (const xx of [101, 478]) {
      glow(k, xx, 273, 83, '#f01935', 0.38);
      for (let i = 0; i < 12; i++)
        rect(
          k,
          xx - 24 - i * 2,
          279 + i * 5,
          48 + i * 4,
          1.2,
          `rgba(228,39,61,${0.08 - i * 0.005})`,
        );
    }
    ellipse(k, 91, 240, 37, 55, '#080b0e');
    ellipse(k, 488, 236, 33, 54, '#080b0e');
    ellipse(k, 91, 244, 25, 36, '#161b20');
    ellipse(k, 488, 240, 22, 35, '#1b2025');
  });
  const body = layer(x, (k) =>
    local(k, (q) => {
      q.beginPath();
      q.moveTo(27, 203);
      q.bezierCurveTo(24, 183, 32, 163, 48, 148);
      q.lineTo(121, 107);
      q.lineTo(184, 35);
      q.bezierCurveTo(248, 15, 347, 13, 409, 37);
      q.lineTo(466, 111);
      q.bezierCurveTo(513, 129, 542, 156, 550, 184);
      q.lineTo(545, 237);
      q.quadraticCurveTo(315, 282, 38, 246);
      q.closePath();
      q.fillStyle = grad(q, 0, 24, 0, 264, [
        [0, '#491a2b'],
        [0.22, '#922c3b'],
        [0.42, '#cc4d50'],
        [0.53, '#7c1e2c'],
        [0.84, '#561728'],
        [1, '#261723'],
      ]);
      q.fill();
      // Broad environment reflections follow the paint curvature; clipped to the metal.
      q.save();
      q.clip();
      q.fillStyle = grad(q, 20, 0, 545, 0, [
        [0, 'rgba(51,187,210,.18)'],
        [0.21, 'rgba(196,122,129,.06)'],
        [0.57, 'rgba(0,0,0,.12)'],
        [0.9, 'rgba(250,172,144,.13)'],
        [1, 'rgba(17,29,56,.27)'],
      ]);
      q.fillRect(0, 0, 580, 270);
      q.save();
      q.filter = 'blur(5px)';
      q.beginPath();
      q.moveTo(65, 120);
      q.bezierCurveTo(188, 154, 421, 140, 510, 115);
      q.lineTo(525, 135);
      q.bezierCurveTo(380, 168, 156, 172, 54, 136);
      q.closePath();
      q.fillStyle = 'rgba(220,187,175,.16)';
      q.fill();
      q.restore();
      const paintR = rng(421);
      for (let i = 0; i < 1100; i++) {
        const px = paintR() * 560,
          py = paintR() * 270;
        rect(q, px, py, 0.7, 0.7, `rgba(244,211,200,${paintR() * 0.045})`);
      }
      q.restore();
      // quarter-panel reflection and sculpted shoulder line.
      q.beginPath();
      q.moveTo(41, 160);
      q.bezierCurveTo(210, 191, 418, 180, 529, 156);
      q.lineTo(546, 188);
      q.bezierCurveTo(398, 218, 172, 212, 31, 190);
      q.closePath();
      q.fillStyle = grad(q, 0, 159, 0, 208, [
        [0, '#e66c69'],
        [0.16, '#aa3e48'],
        [0.65, '#722332'],
        [1, '#50212d'],
      ]);
      q.fill();
      line(
        q,
        [
          [57, 148],
          [143, 115],
          [441, 114],
          [510, 145],
        ],
        'rgba(253,174,151,.55)',
        2,
      );
      line(
        q,
        [
          [54, 161],
          [179, 178],
          [377, 177],
          [519, 159],
        ],
        '#ef8980',
        1.2,
      );
      // Rear glass with defroster lines, dashboard shadow and sky reflections.
      poly(
        q,
        [
          [143, 111],
          [194, 43],
          [393, 44],
          [446, 111],
        ],
        grad(q, 0, 40, 0, 123, [
          [0, '#141c28'],
          [0.4, '#4d4b60'],
          [0.6, '#262b3a'],
          [1, '#111921'],
        ]),
      );
      poly(
        q,
        [
          [200, 47],
          [391, 48],
          [409, 73],
          [182, 73],
        ],
        'rgba(161,117,148,.18)',
      );
      for (let i = 0; i < 6; i++)
        line(
          q,
          [
            [186 - i * 6, 57 + i * 9],
            [400 + i * 6, 57 + i * 9],
          ],
          'rgba(189,143,134,.12)',
          1,
        );
      poly(
        q,
        [
          [247, 111],
          [247, 85],
          [273, 81],
          [286, 113],
        ],
        '#171c24',
      );
      poly(
        q,
        [
          [351, 111],
          [351, 87],
          [378, 84],
          [391, 113],
        ],
        '#171c24',
      );
      // Broad angled reflected lights in rear glass.
      q.save();
      q.beginPath();
      q.moveTo(143, 111);
      q.lineTo(194, 43);
      q.lineTo(393, 44);
      q.lineTo(446, 111);
      q.closePath();
      q.clip();
      q.filter = 'blur(2px)';
      line(
        q,
        [
          [226, 40],
          [191, 115],
        ],
        'rgba(167,202,203,.15)',
        9,
      );
      line(
        q,
        [
          [373, 39],
          [413, 115],
        ],
        'rgba(219,170,178,.12)',
        15,
      );
      q.restore();
      // trunk seam, soft badge, rubber bumper and chrome trim.
      line(
        q,
        [
          [72, 169],
          [178, 188],
          [378, 188],
          [512, 172],
        ],
        '#41151e',
        2,
      );
      line(
        q,
        [
          [174, 187],
          [174, 218],
          [380, 218],
          [380, 187],
        ],
        '#3c1920',
        1,
      );
      rect(q, 274, 176, 30, 4, '#b9a9a4');
      poly(
        q,
        [
          [39, 230],
          [194, 246],
          [390, 244],
          [543, 219],
          [542, 238],
          [385, 261],
          [169, 260],
          [38, 246],
        ],
        grad(q, 0, 227, 0, 261, [
          [0, '#171d24'],
          [0.5, '#2c2e33'],
          [1, '#11171e'],
        ]),
      );
      line(
        q,
        [
          [51, 229],
          [174, 244],
          [389, 242],
          [532, 220],
        ],
        '#6b6163',
        1.5,
      );
      for (const [xx, yy, ww] of [
        [59, 184, 98],
        [426, 180, 96],
      ]) {
        rect(q, xx - 3, yy - 4, ww + 6, 25, '#31131b');
        rect(
          q,
          xx,
          yy,
          ww,
          17,
          grad(q, 0, yy, 0, yy + 17, [
            [0, '#ffbbb2'],
            [0.3, '#ff3c50'],
            [1, '#991022'],
          ]),
        );
        for (let i = 0; i < ww; i += 5) rect(q, xx + i, yy, 1, 17, 'rgba(64,0,12,.3)');
      }
      line(
        q,
        [
          [148, 117],
          [124, 151],
        ],
        '#441321',
        1,
      );
      line(
        q,
        [
          [447, 117],
          [476, 147],
        ],
        '#441321',
        1,
      );
      rect(q, 72, 246, 28, 7, '#11151a');
    }),
  );
  const plate = layer(x, (k) =>
    local(k, (q) => {
      rect(q, 229, 207, 116, 34, '#171c23');
      rect(
        q,
        232,
        209,
        110,
        29,
        grad(q, 0, 209, 0, 238, [
          [0, '#e8debc'],
          [1, '#aaa898'],
        ]),
      );
      txt(q, 'LEONIDA', 287, 216, 6, '#6f6952', '700', 'center');
      txt(q, '4QK-882', 287, 232, 17, '#1b2632', '700', 'center');
      ellipse(q, 238, 213, 1.2, 1.2, '#615e51');
      ellipse(q, 336, 213, 1.2, 1.2, '#615e51');
    }),
  );
  local(x, (q) => {
    glow(q, 105, 193, 54, '#fd344c', 0.35);
    glow(q, 477, 188, 48, '#fd344c', 0.34);
  });
  return { body: subtract(body, plate), plate };
}

export function cctvFrame() {
  const W = 1280,
    H = 720,
    [c, x] = mk(W, H),
    r = rng(77);
  rect(
    x,
    0,
    0,
    W,
    H,
    grad(x, 0, 0, 0, H, [
      [0, '#11191c'],
      [0.5, '#444a43'],
      [1, '#1e282c'],
    ]),
  );
  // Elevated corner camera: ceiling, back wall, tiled floor converge on the shop rear.
  poly(
    x,
    [
      [0, 0],
      [1280, 0],
      [1080, 156],
      [301, 133],
    ],
    grad(x, 0, 0, 0, 160, [
      [0, '#111b1c'],
      [1, '#515b52'],
    ]),
  );
  poly(
    x,
    [
      [0, 0],
      [301, 133],
      [302, 367],
      [0, 617],
    ],
    '#303d3b',
  );
  poly(
    x,
    [
      [301, 133],
      [1080, 156],
      [1150, 391],
      [302, 367],
    ],
    '#465047',
  );
  poly(
    x,
    [
      [0, 617],
      [302, 367],
      [1150, 391],
      [1280, 720],
      [0, 720],
    ],
    grad(x, 0, 370, 0, 720, [
      [0, '#62625b'],
      [1, '#282f2d'],
    ]),
  );
  for (let i = -6; i < 12; i++)
    line(
      x,
      [
        [625 + i * 36, 375],
        [625 + i * 180, 720],
      ],
      'rgba(17,27,28,.6)',
      1.3,
    );
  for (const yy of [395, 421, 457, 508, 578, 677])
    line(
      x,
      [
        [0, yy + 26],
        [1280, yy],
      ],
      'rgba(16,28,28,.57)',
      1.4,
    );
  // Overhead lighting pools on reflective floor; clipped by actual floor polygon.
  x.save();
  x.beginPath();
  x.moveTo(0, 617);
  x.lineTo(302, 367);
  x.lineTo(1150, 391);
  x.lineTo(1280, 720);
  x.lineTo(0, 720);
  x.closePath();
  x.clip();
  x.save();
  x.filter = 'blur(17px)';
  poly(
    x,
    [
      [444, 408],
      [520, 411],
      [332, 716],
      [238, 716],
    ],
    'rgba(164,191,171,.12)',
  );
  poly(
    x,
    [
      [894, 420],
      [963, 425],
      [1048, 718],
      [927, 718],
    ],
    'rgba(141,181,165,.1)',
  );
  x.restore();
  x.restore();
  // Ceiling tubes and haze.
  for (const p of [
    [
      [270, 60],
      [560, 79],
    ],
    [
      [700, 92],
      [967, 105],
    ],
  ] as [number, number][][]) {
    line(x, p, '#101a1b', 13);
    x.save();
    x.shadowColor = '#cbffe8';
    x.shadowBlur = 15;
    line(x, p, '#c0d5bd', 5);
    x.restore();
  }
  glow(x, 680, 165, 460, '#a8c3aa', 0.22);
  // Refrigerated cabinets; reflections sit on dark glass, not outlines.
  for (let j = 0; j < 4; j++) {
    const X = 666 + j * 93;
    rect(x, X, 170, 89, 217, '#171f22');
    rect(
      x,
      X + 4,
      174,
      82,
      204,
      grad(x, X, 0, X + 82, 0, [
        [0, '#34474b'],
        [0.25, '#1e3035'],
        [0.7, '#273a3e'],
        [1, '#52706c'],
      ]),
    );
    for (let yy = 209; yy < 365; yy += 42) {
      rect(x, X + 6, yy + 28, 74, 3, '#62746b');
      for (let i = 0; i < 8; i++) {
        const bx = X + 8 + i * 9;
        rect(
          x,
          bx,
          yy + 2,
          6,
          25,
          ['#7f7250', '#787a5a', '#6d4a43', '#c0bfa2'][Math.floor(r() * 4)],
        );
        rect(x, bx, yy + 10, 6, 7, '#969587');
      }
    }
    rect(x, X + 7, 176, 2, 196, '#b4d9c5');
    line(
      x,
      [
        [X + 27, 180],
        [X + 14, 375],
      ],
      'rgba(158,196,185,.17)',
      7,
    );
    rect(x, X + 75, 249, 3, 44, '#95a299');
  }
  // Deep left shelves: fixed stocked packaging, perspective shelf faces.
  for (let row = 0; row < 4; row++) {
    const yy = 184 + row * 70;
    poly(
      x,
      [
        [0, yy - 44],
        [480, yy + 19],
        [475, yy + 72],
        [0, yy + 11],
      ],
      '#192728',
    );
    for (let i = 0; i < 30; i++) {
      const xx = i * 16,
        base = yy + xx * 0.13;
      const hh = 25 + r() * 22;
      rect(
        x,
        xx,
        base - hh,
        11 + r() * 3,
        hh,
        ['#8c6d43', '#365958', '#85794e', '#624d46', '#9c9980'][Math.floor(r() * 5)],
      );
      rect(x, xx + 1, base - hh * 0.64, 9, hh * 0.24, 'rgba(201,193,158,.5)');
    }
    poly(
      x,
      [
        [0, yy + 9],
        [487, yy + 72],
        [487, yy + 79],
        [0, yy + 17],
      ],
      '#acaca0',
    );
    line(
      x,
      [
        [0, yy + 10],
        [484, yy + 73],
      ],
      '#a6b4a5',
      1,
    );
  }
  // Exterior doorway, signage and fluorescent spill.
  poly(
    x,
    [
      [1093, 126],
      [1264, 78],
      [1280, 447],
      [1137, 388],
    ],
    '#101922',
  );
  line(
    x,
    [
      [1102, 128],
      [1143, 387],
    ],
    '#81b7b0',
    4,
  );
  glow(x, 1230, 286, 260, '#b44182', 0.28);
  line(
    x,
    [
      [1194, 150],
      [1214, 308],
    ],
    '#ee71a8',
    4,
  );
  neon(x, 'OPEN', 1123, 202, 19, '#d967a1');
  // Background clerk, behind the counter.
  ellipse(x, 970, 322, 24, 29, '#564941');
  poly(
    x,
    [
      [945, 348],
      [991, 348],
      [1025, 450],
      [928, 445],
    ],
    '#202e2f',
  );
  // Contact, trouser folds and shoes establish weight on the floor.
  x.save();
  x.filter = 'blur(12px)';
  ellipse(x, 597, 664, 93, 23, 'rgba(0,0,0,.51)');
  x.restore();
  poly(
    x,
    [
      [534, 554],
      [587, 563],
      [580, 655],
      [559, 678],
      [530, 670],
    ],
    grad(x, 530, 0, 591, 0, [
      [0, '#16272b'],
      [0.46, '#313e3d'],
      [1, '#131f26'],
    ]),
  );
  poly(
    x,
    [
      [587, 562],
      [644, 552],
      [654, 652],
      [638, 675],
      [612, 669],
    ],
    grad(x, 594, 0, 654, 0, [
      [0, '#14232a'],
      [0.5, '#35413e'],
      [1, '#17272b'],
    ]),
  );
  line(
    x,
    [
      [551, 580],
      [547, 630],
      [552, 654],
    ],
    'rgba(142,151,132,.16)',
    3,
  );
  line(
    x,
    [
      [628, 581],
      [641, 644],
    ],
    'rgba(142,151,132,.15)',
    2,
  );
  ellipse(
    x,
    541,
    675,
    30,
    11,
    grad(x, 0, 665, 0, 687, [
      [0, '#303b39'],
      [1, '#0c1b21'],
    ]),
  );
  ellipse(x, 637, 671, 27, 10, '#132127');
  // Subject: naturally asymmetrical pose, directional face lighting and fabric.
  const jacket = layer(x, (k) => {
    k.beginPath();
    k.moveTo(522, 382);
    k.bezierCurveTo(490, 393, 473, 430, 459, 480);
    k.lineTo(474, 540);
    k.lineTo(511, 533);
    k.lineTo(525, 476);
    k.lineTo(535, 575);
    k.quadraticCurveTo(591, 601, 650, 571);
    k.lineTo(656, 469);
    k.lineTo(704, 473);
    k.lineTo(715, 445);
    k.lineTo(655, 410);
    k.quadraticCurveTo(632, 387, 608, 381);
    k.closePath();
    k.fillStyle = grad(k, 476, 0, 673, 0, [
      [0, '#18282b'],
      [0.22, '#3b5050'],
      [0.52, '#51645d'],
      [0.75, '#2e4140'],
      [1, '#18292c'],
    ]);
    k.fill();
    line(
      k,
      [
        [566, 395],
        [579, 443],
        [587, 575],
      ],
      '#0d2227',
      3,
    );
    line(
      k,
      [
        [520, 430],
        [539, 452],
        [526, 497],
      ],
      '#718077',
      2,
    );
    line(
      k,
      [
        [608, 421],
        [627, 461],
        [620, 553],
      ],
      '#1b3032',
      4,
    );
    line(
      k,
      [
        [492, 447],
        [481, 474],
        [487, 505],
      ],
      '#708078',
      2,
    );
    line(
      k,
      [
        [630, 417],
        [668, 445],
        [697, 456],
      ],
      '#7a8580',
      3,
    );
    poly(
      k,
      [
        [525, 387],
        [565, 409],
        [552, 432],
        [511, 402],
      ],
      '#172e31',
    );
    poly(
      k,
      [
        [575, 404],
        [608, 383],
        [632, 399],
        [597, 431],
      ],
      '#1d3335',
    );
    line(
      k,
      [
        [505, 434],
        [548, 449],
      ],
      '#b7b9a0',
      7,
    );
    line(
      k,
      [
        [602, 448],
        [643, 441],
      ],
      '#b2b69e',
      7,
    );
    txt(k, 'VICE', 609, 477, 13, '#c0bfa9', '700');
    line(
      k,
      [
        [540, 499],
        [566, 504],
      ],
      '#243b3a',
      2,
    );
  });
  // exposed wrist, hand extended toward the register.
  poly(
    x,
    [
      [700, 445],
      [718, 444],
      [733, 455],
      [747, 457],
      [744, 469],
      [715, 472],
      [703, 465],
    ],
    grad(x, 700, 0, 747, 0, [
      [0, '#8d7b66'],
      [1, '#5a5148'],
    ]),
  );
  const face = layer(x, (k) => {
    k.beginPath();
    k.moveTo(540, 322);
    k.bezierCurveTo(538, 296, 554, 286, 577, 289);
    k.bezierCurveTo(600, 291, 614, 308, 612, 330);
    k.lineTo(621, 346);
    k.lineTo(610, 352);
    k.quadraticCurveTo(610, 374, 588, 384);
    k.lineTo(562, 371);
    k.lineTo(547, 350);
    k.closePath();
    k.fillStyle = grad(k, 538, 300, 615, 352, [
      [0, '#413f37'],
      [0.36, '#9f9076'],
      [0.66, '#b4a184'],
      [1, '#5c594c'],
    ]);
    k.fill();
    ellipse(k, 546, 339, 6, 12, '#857963');
    poly(
      k,
      [
        [541, 319],
        [549, 294],
        [574, 285],
        [598, 294],
        [608, 312],
        [591, 309],
        [579, 302],
        [557, 317],
      ],
      '#202929',
    );
    line(
      k,
      [
        [581, 327],
        [596, 326],
      ],
      '#41473d',
      3,
    );
    line(
      k,
      [
        [583, 333],
        [591, 334],
      ],
      '#252e2a',
      2,
    );
    line(
      k,
      [
        [599, 334],
        [601, 349],
        [610, 350],
      ],
      '#746851',
      1.5,
    );
    line(
      k,
      [
        [592, 362],
        [608, 360],
      ],
      '#4c4e3f',
      2,
    );
    line(
      k,
      [
        [566, 357],
        [579, 373],
        [594, 374],
      ],
      'rgba(48,55,44,.7)',
      4,
    );
  });
  // Counter cuts foreground without hiding either target.
  poly(
    x,
    [
      [810, 423],
      [1280, 491],
      [1280, 720],
      [716, 720],
    ],
    grad(x, 720, 420, 1280, 700, [
      [0, '#7a8272'],
      [0.3, '#454f48'],
      [1, '#16272a'],
    ]),
  );
  poly(
    x,
    [
      [810, 423],
      [1280, 491],
      [1262, 520],
      [791, 453],
    ],
    '#a0a396',
  );
  line(
    x,
    [
      [810, 423],
      [1280, 491],
    ],
    '#c3c3ae',
    2,
  );
  poly(
    x,
    [
      [892, 365],
      [984, 374],
      [980, 431],
      [887, 420],
    ],
    '#17272a',
  );
  poly(
    x,
    [
      [902, 374],
      [975, 381],
      [972, 416],
      [899, 410],
    ],
    grad(x, 0, 373, 0, 418, [
      [0, '#668c79'],
      [1, '#294e45'],
    ]),
  );
  txt(x, 'CASH', 907, 401, 11, '#b9d1ac');
  poly(
    x,
    [
      [890, 430],
      [985, 442],
      [1010, 465],
      [879, 448],
    ],
    '#283a39',
  );
  texture(x, W, H, 8, 1300, 0.08);
  sensor(x, { scale: 0.57, noise: 18, scan: 0.1, bleed: 0.075, tear: true, vignettePower: 0.72 });
  rect(x, 0, 0, W, 62, 'rgba(3,12,13,.57)');
  const time = burn(x, '2026-05-14  04:12:07', 24, 38, 20),
    cam = burn(x, 'CAM 04 / RAMIREZ MINI MART', 1256, 38, 20, 'right');
  burn(x, '● REC', 24, 686, 17);
  burn(x, '704×576 / H.264 / 08 FPS', 1256, 686, 15, 'right');
  return finish(
    c,
    '01 · CCTV still',
    'Exhibit A / Ceiling camera, Ramirez Mini Mart / 04:12:07',
    [
      ['face', face],
      ['jacket', jacket],
    ],
    [
      ['timecode', time],
      ['camera-id', cam],
    ],
  );
}

export function trafficCam() {
  const W = 1280,
    H = 720,
    [c, x] = mk(W, H);
  street(x, W, H, { seed: 14, night: true });
  neon(x, 'SEABREEZE', 21, 284, 21, '#db659d');
  neon(x, 'HOTEL', 87, 312, 15, '#80d4d1');
  const car = coupe(x, 317, 293, 1.07);
  // headlamp bloom from an oncoming vehicle, atmospheric reflection.
  glow(x, 1050, 351, 80, '#d7d5c2', 0.5);
  glow(x, 1090, 355, 68, '#d7d5c2', 0.5);
  rect(x, 1045, 350, 10, 4, '#e8e1c5');
  rect(x, 1086, 354, 9, 3, '#e8e1c5');
  sensor(x, { scale: 0.74, noise: 12, scan: 0.035, bleed: 0.04, vignettePower: 0.64 });
  rect(x, 0, 0, W, 46, 'rgba(0,5,10,.7)');
  burn(x, 'LSP / AUTOMATED VEHICLE CAPTURE', 25, 29, 16);
  burn(x, 'LANE 02    NBOUND    048 KM/H', 1255, 29, 16, 'right');
  rect(x, 0, 654, W, 66, '#071216');
  const ts = burn(x, '14 MAY 2026  04:19:41', 25, 683, 19),
    unit = burn(x, 'TC-1180 / OCEAN DR @ 11TH', 1255, 683, 18, 'right');
  txt(x, 'FRAME 008194   /   ANPR BUFFER   /   EXP 1:250', 25, 706, 11, '#718d90');
  txt(x, 'CAPTURE COMPLETE', 1255, 706, 11, '#718d90', '400', 'right');
  return finish(
    c,
    '02 · Traffic cam',
    'Exhibit B / Ocean Drive ANPR capture / Rear view, northbound',
    [
      ['plate', car.plate],
      ['red-car', car.body],
    ],
    [
      ['timestamp', ts],
      ['unit-id', unit],
    ],
  );
}

export function policeReport() {
  const W = 1000,
    H = 1300,
    [c, x] = mk(W, H);
  rect(
    x,
    0,
    0,
    W,
    H,
    grad(x, 0, 0, W, H, [
      [0, '#c8c2ad'],
      [0.12, '#e8e1ca'],
      [0.55, '#e0d9c3'],
      [1, '#c3bea9'],
    ]),
  );
  // Scanner falloff, creases, dust and uneven toner; fixed paper geometry.
  for (const X of [14, 980]) {
    const g = x.createLinearGradient(X - 12, 0, X + 12, 0);
    g.addColorStop(0, '#0000');
    g.addColorStop(0.5, '#4d4d393b');
    g.addColorStop(1, '#0000');
    rect(x, X - 12, 0, 24, H, g);
  }
  line(
    x,
    [
      [497, 0],
      [503, 386],
      [499, 787],
      [506, 1300],
    ],
    'rgba(98,88,68,.13)',
    3,
  );
  line(
    x,
    [
      [501, 0],
      [507, 386],
      [503, 787],
      [510, 1300],
    ],
    'rgba(255,255,237,.3)',
    2,
  );
  rect(x, 0, 644, W, 2, 'rgba(114,99,76,.1)');
  rect(x, 0, 647, W, 1, 'rgba(255,255,234,.27)');
  texture(x, W, H, 218, 8500, 0.13);
  txt(x, 'LEONIDA STATE POLICE', 66, 91, 32, '#292d28', '700');
  txt(x, 'BUREAU OF CRIMINAL INVESTIGATION', 68, 123, 14, '#55594f');
  txt(x, 'FORM 19-B', 930, 80, 13, '#535849', '700', 'right');
  txt(x, 'REV. 03/26', 930, 103, 11, '#6c7160', '400', 'right');
  line(
    x,
    [
      [65, 145],
      [935, 145],
    ],
    '#474d42',
    2,
  );
  rect(x, 65, 162, 870, 37, '#343c33');
  txt(x, 'INCIDENT REPORT / PRELIMINARY FILING', 81, 187, 17, '#e5dfc7', '700');
  const rows = [
    ['CASE NUMBER', '26-4471 / DISTRICT 04'],
    ['DATE / TIME', '14 MAY 2026 / 05:02 EDT'],
    ['LOCATION', 'RAMIREZ MINI MART, OCEAN DRIVE'],
    ['CLASSIFICATION', 'ROBBERY / VEHICLE THEFT'],
  ];
  for (let i = 0; i < rows.length; i++) {
    const Y = 244 + i * 43;
    txt(x, rows[i][0], 78, Y, 13, '#676c5e');
    txt(x, rows[i][1], 310, Y, 17, '#333b31');
    line(
      x,
      [
        [76, Y + 12],
        [920, Y + 12],
      ],
      'rgba(73,81,66,.22)',
      1,
    );
  }
  txt(x, '01 / IDENTIFIED PARTIES', 78, 438, 14, '#5a6453', '700');
  rect(x, 66, 456, 868, 173, 'rgba(126,132,109,.07)');
  txt(x, 'SUSPECT', 79, 494, 14, '#68705f');
  const name = textBox(x, 'J. DUVAL', 310, 494, 23, '#282f28', '700');
  txt(x, 'VEHICLE', 79, 542, 14, '#68705f');
  const vehicle = textBox(x, 'RED COUPE / 4QK-882', 310, 542, 22, '#282f28', '700');
  txt(x, 'REPORTING OFFICER', 79, 593, 14, '#68705f');
  txt(x, 'R. ALVAREZ / BADGE 2291', 310, 593, 17, '#3e473b');
  txt(x, '02 / INITIAL ACCOUNT', 78, 678, 14, '#5a6453', '700');
  const lines = [
    'Store camera 04 records a subject entering the premises',
    'at approximately 04:12. A vehicle departs northbound.',
    'Traffic capture TC-1180 and one public phone image',
    'have been associated with this incident for review.',
    '',
    'Identification remains provisional. Original capture',
    'files are queued for transfer to the state archive.',
  ];
  lines.forEach((s, i) => txt(x, s, 79, 720 + i * 29, 17, '#40483d'));
  line(
    x,
    [
      [78, 961],
      [567, 961],
    ],
    '#777d69',
    1,
  );
  txt(x, 'REPORTING OFFICER SIGNATURE', 79, 984, 11, '#707764');
  x.save();
  x.strokeStyle = '#485653';
  x.lineWidth = 1.7;
  x.beginPath();
  x.moveTo(120, 943);
  x.bezierCurveTo(156, 906, 102, 968, 181, 934);
  x.bezierCurveTo(144, 965, 216, 921, 238, 940);
  x.bezierCurveTo(263, 962, 278, 915, 340, 941);
  x.stroke();
  x.restore();
  const stamp = layer(x, (k) => {
    k.save();
    k.translate(697, 981);
    k.rotate(-0.105);
    k.strokeStyle = '#883f39';
    k.lineWidth = 3;
    k.strokeRect(-4, -4, 220, 118);
    k.lineWidth = 1;
    k.strokeRect(3, 3, 206, 104);
    txt(k, 'EVIDENCE', 106, 37, 23, '#883f39', '700', 'center');
    txt(k, 'SEALED', 106, 67, 25, '#883f39', '700', 'center');
    txt(k, 'LSP / 26-4471', 106, 94, 12, '#883f39', '700', 'center');
    k.restore();
  });
  const hash = layer(x, (k) => {
    rect(k, 66, 1160, 868, 77, 'rgba(111,118,99,.13)');
    k.strokeStyle = '#787c66';
    k.lineWidth = 1;
    k.strokeRect(66.5, 1160.5, 867, 76);
    txt(k, 'CHAIN OF CUSTODY / 9F2C-77A1-B430-6E08', 81, 1187, 16, '#434f40', '700');
    const r = rng(62);
    let bx = 716;
    while (bx < 916) {
      const bw = 1 + Math.floor(r() * 3);
      rect(k, bx, 1172, bw, 33, '#525c48');
      bx += bw + 1 + Math.floor(r() * 2);
    }
    txt(k, 'REGISTERED 05:02 EDT  /  ARCHIVE TRANSFER PENDING', 81, 1218, 12, '#6a725e');
  });
  // Nongeometric paper grain after print; no target-affecting transforms.
  grain(x, W, H, 4);
  txt(x, 'CONFIDENTIAL / INTERNAL USE ONLY', 66, 1272, 11, '#727967');
  txt(x, 'PAGE 1 OF 1', 934, 1272, 11, '#727967', '400', 'right');
  return finish(
    c,
    '03 · Police report',
    'Exhibit C / Flatbed scan / Preliminary identification, unverified',
    [
      ['suspect-name', name],
      ['vehicle-line', vehicle],
    ],
    [
      ['evidence-stamp', stamp],
      ['custody-hash', hash],
    ],
  );
}

export function newsFrame() {
  const W = 1280,
    H = 720,
    [c, x] = mk(W, H),
    r = rng(845);
  rect(
    x,
    0,
    0,
    W,
    H,
    grad(x, 0, 0, 0, 520, [
      [0, '#202639'],
      [0.35, '#64445c'],
      [0.7, '#b57780'],
      [1, '#d2a28a'],
    ]),
  );
  for (let i = 0; i < 32; i++) {
    const Y = 25 + i * 9;
    rect(x, 0, Y, W, 3 + r() * 5, `rgba(37,33,53,${r() * 0.045})`);
  }
  glow(x, 932, 315, 255, '#f2b798', 0.25);
  // Long lens: layered waterfront towers with haze and irregular windows.
  for (let depth = 0; depth < 3; depth++) {
    const base = 370 + depth * 41;
    for (let i = 0; i < 16; i++) {
      const bx = i * 90 - 20 + depth * 17,
        bw = 35 + r() * 65,
        bh = 40 + r() * (95 + depth * 65);
      rect(x, bx, base - bh, bw, bh, depth === 0 ? '#6a626b' : depth === 1 ? '#4e4b5a' : '#303b49');
      rect(x, bx + bw - 6, base - bh, 6, bh, 'rgba(16,24,38,.18)');
      if (i % 4 === 0) {
        rect(x, bx + 7, base - bh - 9, bw - 14, 9, depth === 0 ? '#716871' : '#454854');
        line(
          x,
          [
            [bx + bw / 2, base - bh],
            [bx + bw / 2, base - bh - 29],
          ],
          '#514c5a',
          2,
        );
      }
      for (let yy = base - bh + 9; yy < base - 5; yy += 11)
        for (let xx = bx + 5; xx < bx + bw - 4; xx += 8)
          if (r() > 0.5) rect(x, xx, yy, 2 + r() * 2, 4, `rgba(226,196,157,${0.1 + r() * 0.43})`);
    }
  }
  rect(
    x,
    0,
    452,
    W,
    105,
    grad(x, 0, 452, 0, 557, [
      [0, '#45535f'],
      [1, '#152737'],
    ]),
  );
  for (let i = 0; i < 900; i++) {
    const X = r() * W,
      Y = 452 + r() * 102;
    rect(x, X, Y, 2 + r() * 28, 1, `rgba(186,158,153,${r() * 0.16})`);
  }
  poly(
    x,
    [
      [0, 530],
      [1280, 508],
      [1280, 584],
      [0, 584],
    ],
    '#151e29',
  );
  palm(x, 91, 556, 238, 7);
  palm(x, 1165, 556, 207, 8);
  // Blown police light flare in the foreground, absent detailed vehicles.
  glow(x, 939, 507, 130, '#285acb', 0.42);
  glow(x, 1044, 503, 105, '#eb365e', 0.34);
  line(
    x,
    [
      [806, 509],
      [1117, 510],
    ],
    'rgba(123,115,225,.2)',
    2,
  );
  sensor(x, { scale: 0.8, noise: 6, scan: 0.026, bleed: 0.024, vignettePower: 0.35 });
  // Broadcast graphics remain crisp over the processed camera image.
  rect(x, 42, 40, 61, 27, '#c42649');
  txt(x, 'LIVE', 72, 59, 15, '#fff', '700', 'center');
  rect(x, 103, 40, 170, 27, 'rgba(13,24,37,.82)');
  txt(x, 'VICE BEACH', 119, 59, 13, '#e9e8e5');
  const bug = layer(x, (k) => {
    rect(k, 1080, 37, 165, 61, '#c72348');
    txt(k, 'WEAZEL', 1162, 65, 25, '#fff', '700', 'center');
    rect(k, 1080, 74, 165, 24, '#f2eee8');
    txt(k, 'NEWS', 1162, 91, 16, '#202b39', '700', 'center');
  });
  rect(x, 39, 527, 202, 31, '#cf264c');
  txt(x, 'DEVELOPING STORY', 51, 549, 16, '#fff', '700');
  rect(x, 39, 558, 1205, 66, '#ecece6');
  rect(x, 39, 558, 8, 66, '#d3234e');
  txt(x, 'MANHUNT:', 62, 603, 34, '#142433', '700');
  const name = textBox(x, 'J. DUVAL', 273, 603, 34, '#142433', '700');
  txt(x, 'NAMED IN ROBBERY', 470, 603, 30, '#142433', '700');
  rect(x, 39, 624, 1205, 34, '#172d40');
  txt(x, 'POLICE SEEK', 62, 647, 17, '#bdc9d3', '700');
  const vehicle = textBox(x, 'RED COUPE / PLATE 4QK-882', 194, 647, 17, '#f2e9c9', '700');
  txt(x, 'OCEAN DRIVE', 1219, 647, 14, '#d5dee2', '400', 'right');
  const ticker = layer(x, (k) => {
    rect(k, 0, 677, W, 43, '#d9dedc');
    rect(k, 0, 677, 158, 43, '#b92044');
    txt(k, '18:41 EDT', 79, 706, 19, '#fff', '700', 'center');
    txt(
      k,
      'STATE POLICE REQUEST WITNESSES  /  ARCHIVE UPDATE EXPECTED TONIGHT',
      177,
      705,
      17,
      '#273c47',
      '700',
    );
  });
  return finish(
    c,
    '04 · News broadcast',
    'Exhibit D / Evening bulletin / Broadcast graphics over a waterfront live feed',
    [
      ['headline-name', name],
      ['strap-vehicle', vehicle],
    ],
    [
      ['channel-bug', bug],
      ['ticker', ticker],
    ],
  );
}

export function witnessPhoto() {
  const W = 900,
    H = 1200,
    [c, x] = mk(W, H);
  street(x, W, H, { seed: 211, night: true });
  neon(x, 'PALM COURT', 8, 474, 26, '#dd72a0');
  neon(x, 'ROOMS / VACANCY', 12, 503, 12, '#8bddce');
  // Street-level phone view: dim foreground, lamp veiling glare, wet surface.
  const car = coupe(x, 188, 575, 1.04);
  poly(
    x,
    [
      [0, 1150],
      [0, 871],
      [172, 851],
      [472, 1040],
      [482, 1200],
    ],
    grad(x, 0, 880, 380, 1200, [
      [0, '#48454a'],
      [1, '#202c36'],
    ]),
  );
  line(
    x,
    [
      [0, 865],
      [171, 846],
      [479, 1041],
    ],
    '#8d8782',
    4,
  );
  line(
    x,
    [
      [0, 898],
      [160, 879],
      [426, 1049],
    ],
    '#151e2a',
    3,
  );
  // Foreground post blocks part of the street, away from target car.
  rect(
    x,
    38,
    247,
    19,
    738,
    grad(x, 38, 0, 57, 0, [
      [0, '#0b1420'],
      [0.55, '#3b454b'],
      [1, '#141e29'],
    ]),
  );
  glow(x, 42, 235, 206, '#c9e5ce', 0.36);
  rect(x, 17, 231, 50, 8, '#eef6de');
  // deterministic lens moisture / flare, optical artifacts instead of line art.
  for (const [X, Y, R] of [
    [676, 244, 24],
    [790, 381, 13],
    [552, 446, 9],
    [250, 293, 18],
  ]) {
    x.save();
    x.filter = 'blur(4px)';
    ellipse(x, X, Y, R, R * 0.7, 'rgba(179,185,190,.10)');
    x.restore();
  }
  sensor(x, { scale: 0.77, noise: 13, scan: 0, bleed: 0.07, vignettePower: 0.77 });
  // Metadata belongs to the exported post, not the camera scene.
  rect(x, 0, 0, W, 73, 'rgba(7,14,23,.82)');
  txt(x, '@vicebeachcam', 26, 34, 18, '#e2e7e7', '700');
  txt(x, 'PUBLIC POST / ORIGINAL MEDIA', 26, 57, 10, '#94a5b0');
  txt(x, '04:17', 873, 43, 20, '#dfe9e8', '400', 'right');
  rect(x, 0, 1080, W, 120, '#09151d');
  const geo = layer(x, (k) => {
    txt(k, 'OCEAN DRIVE · VICE BEACH', 26, 1111, 18, '#9bd5cc', '700');
    txt(k, '25.7617 N / 80.1918 W', 26, 1136, 12, '#77969c');
  });
  const device = textBox(x, 'iFruit 14 / 14 MAY 2026 04:17 / IMG_0841', 26, 1176, 15, '#a8b5bc');
  return finish(
    c,
    '05 · Witness photo',
    'Exhibit E / Public phone post / Same coupe, a different camera',
    [['red-car', [...car.body, car.plate]]],
    [
      ['geotag', geo],
      ['device-meta', device],
    ],
  );
}

export const GENS = [cctvFrame, trafficCam, policeReport, newsFrame, witnessPhoto];
export const generateAll = () => GENS.map((f) => f());
