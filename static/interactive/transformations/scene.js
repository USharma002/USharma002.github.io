/* Scene shared by every pipeline widget (and lookat.html): three models, each with an object-to-world
   transform M_model = T R S, and a camera at E looking at C with up direction U.
   Colours come from the model type (see TYPES in tf.js); lookat.html uses the same values. */
'use strict';
const SCENE = (() => {
    const models = [
        { name: 'house', mesh: TF.house(), s: [2.2, 2.2, 2.2], r: 0.6, t: [-3.5, 1.1, 0.9] },
        { name: 'pyramid', mesh: TF.pyramid(), s: [2.6, 3.5, 2.6], r: -0.3, t: [3.1, 1.75, -2.0] },
        { name: 'cube', mesh: TF.cube(0.4), s: [2.2, 2.2, 2.2], r: 0.4, t: [0.4, 0.88, 3.5] },
    ];
    models.forEach(m => {
        m.S = TF.S(...m.s); m.R = TF.Ry(m.r); m.T = TF.T(...m.t);
        m.M = TF.mul(m.T, m.R, m.S);
        m.world = TF.mapMesh(m.mesh, p => TF.xf(m.M, p));
    });
    // The camera stands back far enough that the whole scene is inside its view frustum.
    const cam = { E: [-6.5, 8, 8.5], C: [0, 1, 0], U: [0, 1, 0], fov: 60, n: 1, f: 18, a: 0.75 };
    cam.L = TF.lookAt(cam.E, cam.C, cam.U);
    // Camera drawn as a small frustum in its own (camera) space
    function cameraLines(v, toWorld, color, k = 1.2) {
        const e = 1 / Math.tan(cam.fov * TF.deg / 2), r = k / e, t = cam.a * k / e;
        const c = [[-r, -t, -k], [r, -t, -k], [r, t, -k], [-r, t, -k]].map(p => TF.xf(toWorld, p));
        const O = TF.xf(toWorld, [0, 0, 0]);
        c.forEach((p, i) => { v.line(O, p, color, { w: 1.3 }); v.line(p, c[(i + 1) % 4], color, { w: 1.3 }); });
        const top = TF.xf(toWorld, [0, t * 1.5, -k]);
        v.line(c[2], top, color); v.line(c[3], top, color);   // small roof marks the camera's up direction
    }
    return { models, cam, cameraLines };
})();
