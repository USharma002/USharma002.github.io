/* Shared code for the transformation widgets.
   Conventions (Lengyel): column vectors, P' = M P, matrices stored row-major in arrays of 16.
   The display view is right-handed: x right, y up, z toward the viewer before orbiting. */
'use strict';
const TF = (() => {
    const $ = id => document.getElementById(id);
    const deg = Math.PI / 180;

    /* ---------- theme ---------- */
    const C = {};
    const drawers = [];
    function readColors() {
        const cs = getComputedStyle(document.documentElement);
        ['bg', 'text', 'fg', 'muted', 'grid', 'faint', 'ax-x', 'ax-y', 'ax-z', 'hi', 'vol'].forEach(k => C[k] = cs.getPropertyValue('--' + k).trim());
        C.border = C.grid; C.obj = C.muted;
        C.axes = [C['ax-x'], C['ax-y'], C['ax-z']];
        drawers.forEach(f => f());
    }
    function applyTheme() {
        let dark = null;
        try {
            if (window.parent !== window) dark = window.parent.document.body.classList.contains('dark');
        } catch (e) { /* cross-origin: fall back to prefers-color-scheme */ }
        if (dark === null) document.documentElement.removeAttribute('data-theme');
        else document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        readColors();
    }
    function initTheme() {
        applyTheme();
        try {
            if (window.parent !== window)
                new MutationObserver(applyTheme).observe(window.parent.document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (e) {}
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    }
    const onTheme = f => drawers.push(f);

    /* ---------- 4x4 matrices ---------- */
    const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    function mul(...Ms) {
        return Ms.reduce((A, B) => {
            const R = new Array(16).fill(0);
            for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
                let s = 0;
                for (let k = 0; k < 4; k++) s += A[4 * i + k] * B[4 * k + j];
                R[4 * i + j] = s;
            }
            return R;
        });
    }
    const apply = (M, p) => {
        const w = p.length > 3 ? p[3] : 1, r = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) r[i] = M[4 * i] * p[0] + M[4 * i + 1] * p[1] + M[4 * i + 2] * p[2] + M[4 * i + 3] * w;
        return r;
    };
    const divide = q => [q[0] / q[3], q[1] / q[3], q[2] / q[3]];
    const xf = (M, p) => divide(apply(M, p));                    // apply, then divide by w
    const T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
    const S = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
    const Rx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; };
    const Ry = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; };
    const Rz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
    const lerp = (A, B, t) => A.map((a, i) => a + (B[i] - a) * t);
    // Homogeneous clip space and NDC are left-handed (Lengyel 5.5.1: -n -> -1, -f -> 1). The 3D views are
    // drawn right-handed, so NDC is displayed through ZFLIP = S(1, 1, -1): +z then points into the screen,
    // the view matches what the camera sees, and the drawn z axis points away from the viewer.
    const ZFLIP = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];
    // Lengyel (5.52): M_frustum, OpenGL glFrustum()
    const frustum = (l, r, b, t, n, f) => [
        2 * n / (r - l), 0, (r + l) / (r - l), 0,
        0, 2 * n / (t - b), (t + b) / (t - b), 0,
        0, 0, -(f + n) / (f - n), -2 * n * f / (f - n),
        0, 0, -1, 0];
    // glOrtho()
    const ortho = (l, r, b, t, n, f) => [
        2 / (r - l), 0, 0, -(r + l) / (r - l),
        0, 2 / (t - b), 0, -(t + b) / (t - b),
        0, 0, -2 / (f - n), -(f + n) / (f - n),
        0, 0, 0, 1];
    /* vectors */
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = a => scl(a, 1 / Math.hypot(a[0], a[1], a[2]));
    // Camera from position E, target C, up U. Returns its axes, the camera-to-world transform and M_view = its inverse.
    function lookAt(E, Cp, U) {
        const f = norm(sub(Cp, E)), r = norm(cross(f, U)), u = cross(r, f);
        const toWorld = [r[0], u[0], -f[0], E[0], r[1], u[1], -f[1], E[1], r[2], u[2], -f[2], E[2], 0, 0, 0, 1];
        const view = [r[0], r[1], r[2], -dot(r, E), u[0], u[1], u[2], -dot(u, E), -f[0], -f[1], -f[2], dot(f, E), 0, 0, 0, 1];
        return { f, r, u, toWorld, view };
    }

    /* ---------- meshes ---------- */
    const cube = (s = 1) => ({
        v: [[-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s], [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]],
        f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]]
    });
    // House: base [-.5,.5]^3 with a roof and a chimney on the +x side, so its orientation is visible.
    const house = () => ({
        v: [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5],
            [-.5, .95, 0], [.5, .95, 0],
            [.2, .6, -.25], [.35, .6, -.25], [.35, .6, -.1], [.2, .6, -.1], [.2, 1.0, -.25], [.35, 1.0, -.25], [.35, 1.0, -.1], [.2, 1.0, -.1]],
        f: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [0, 4, 7, 3],
            [3, 8, 9, 2], [7, 6, 9, 8], [3, 7, 8], [2, 9, 6],
            [10, 11, 15, 14], [11, 12, 16, 15], [12, 13, 17, 16], [13, 10, 14, 17], [14, 15, 16, 17]]
    });
    const pyramid = () => ({
        v: [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5], [0, .6, 0]],
        f: [[0, 1, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]]
    });
    const mapMesh = (m, fn) => ({ v: m.v.map(fn), f: m.f });
    /* Clip a camera-space mesh to the slab between the near plane z = -n and the far plane z = -f
       (Sutherland-Hodgman on each face), as the pipeline does before projection. */
    function clipPoly(P, n, f) {
        const cut = (Q, inside, z0) => {
            const out = [];
            for (let i = 0; i < Q.length; i++) {
                const a = Q[i], b = Q[(i + 1) % Q.length], ia = inside(a), ib = inside(b);
                if (ia) out.push(a);
                if (ia !== ib) { const t = (z0 - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, z0]); }
            }
            return out;
        };
        let Q = cut(P, p => p[2] <= -n, -n);
        if (Q.length >= 3) Q = cut(Q, p => p[2] >= -f, -f);
        return Q.length >= 3 ? Q : null;
    }
    function clipMesh(m, n, f) {
        const v = [], F = [];
        m.f.forEach(fc => { const Q = clipPoly(fc.map(i => m.v[i]), n, f); if (Q) { F.push(Q.map((_, k) => v.length + k)); v.push(...Q); } });
        return { v, f: F };
    }

    /* ---------- colour helpers ---------- */
    function rgb(c) {
        if (c.startsWith('#')) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
        const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
    }
    const alpha = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
    const mix = (c1, c2, t) => { const a = rgb(c1), b = rgb(c2); return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`; };

    /* ---------- orbit view on a canvas ---------- */
    class View {
        constructor(canvas, o = {}) {
            this.cv = canvas; this.ctx = canvas.getContext('2d');
            this.yaw = o.yaw ?? -0.6; this.pitch = o.pitch ?? 0.42;
            this.extent = o.extent ?? 3; this.target = o.target ?? [0, 0, 0]; this.persp = o.persp ?? 0.08;
            this.offY = o.offY ?? 0;     // screen offset of the view centre, px (room for an overlay)
            this.draw = o.draw || (() => {}); this.onOrbit = o.onOrbit || null;
            this.items = []; this.pending = false; this.W = 1; this.H = 1;
            new ResizeObserver(() => this.resize()).observe(canvas);
            if (o.orbit !== false) this.bindOrbit(); else canvas.classList.add('flat');
            this.resize();
        }
        resize() {
            const r = this.cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
            this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
            this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d);
            this.ctx.setTransform(d, 0, 0, d, 0, 0);
            this.render(true);
        }
        bindOrbit() {
            let drag = null;
            this.cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; this.cv.setPointerCapture(e.pointerId); });
            this.cv.addEventListener('pointermove', e => {
                if (!drag) return;
                this.setOrbit(this.yaw + (e.clientX - drag[0]) * 0.01, this.pitch + (e.clientY - drag[1]) * 0.01);
                drag = [e.clientX, e.clientY];
                if (this.onOrbit) this.onOrbit(this.yaw, this.pitch);
            });
            const end = () => drag = null;
            this.cv.addEventListener('pointerup', end); this.cv.addEventListener('pointercancel', end);
        }
        setOrbit(y, p) { this.yaw = y; this.pitch = Math.max(-1.45, Math.min(1.45, p)); this.render(); }
        // world -> [screen x, screen y, depth (larger = nearer)]
        P(p) {
            const x = p[0] - this.target[0], y = p[1] - this.target[1], z = p[2] - this.target[2];
            const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
            const x1 = cy * x + sy * z, z1 = -sy * x + cy * z;
            const y2 = cp * y - sp * z1, z2 = sp * y + cp * z1;
            const k = 1 / (1 - this.persp * z2 / this.extent);
            const s = Math.min(this.W, this.H) / (2.2 * this.extent);
            return [this.W / 2 + x1 * s * k, this.H / 2 + this.offY - y2 * s * k, z2];
        }
        render(now) {
            if (now) { this.pending = false; this._render(); return; }
            if (this.pending) return;
            this.pending = true;
            requestAnimationFrame(() => { if (this.pending) { this.pending = false; this._render(); } });
        }
        _render() {
            this.ctx.clearRect(0, 0, this.W, this.H);
            this.items = [];
            this.draw(this);
            this.items.sort((a, b) => a.z - b.z || a.k - b.k);
            for (const it of this.items) it.fn(this.ctx);
        }
        /* primitives (queued, painter-sorted) */
        line(a, b, color, o = {}) {
            const A = this.P(a), B = this.P(b);
            this.items.push({
                z: o.z ?? (A[2] + B[2]) / 2 + (o.bias || 0), k: 1, fn: c => {
                    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]);
                    c.strokeStyle = color; c.lineWidth = o.w || 1.2; c.setLineDash(o.dash || []); c.stroke(); c.setLineDash([]);
                }
            });
        }
        poly(pts, fill, stroke, o = {}) {
            const Q = pts.map(p => this.P(p));
            this.items.push({
                z: o.z ?? Q.reduce((s, q) => s + q[2], 0) / Q.length, k: 0, fn: c => {
                    c.beginPath(); Q.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath();
                    if (fill) { c.fillStyle = fill; c.fill(); }
                    if (stroke) { c.strokeStyle = stroke; c.lineWidth = o.w || 0.8; c.lineJoin = 'round'; c.stroke(); }
                }
            });
        }
        arrow(a, b, color, o = {}) {
            const A = this.P(a), B = this.P(b);
            this.items.push({
                z: o.z ?? Math.max(A[2], B[2]) + 0.01, k: 2, fn: c => {
                    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, h = Math.min(8, L * 0.4);
                    c.strokeStyle = c.fillStyle = color; c.lineWidth = o.w || 1.6;
                    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0] - ux * h * 0.8, B[1] - uy * h * 0.8); c.stroke();
                    c.beginPath(); c.moveTo(B[0], B[1]); c.lineTo(B[0] - ux * h - uy * h * 0.45, B[1] - uy * h + ux * h * 0.45);
                    c.lineTo(B[0] - ux * h + uy * h * 0.45, B[1] - uy * h - ux * h * 0.45); c.closePath(); c.fill();
                    if (o.label) label(c, o.label, B[0] + ux * 9, B[1] + uy * 9, color);
                }
            });
        }
        dot(p, color, o = {}) {
            const A = this.P(p);
            this.items.push({
                z: o.z ?? A[2] + 0.02, k: 3, fn: c => {
                    c.beginPath(); c.arc(A[0], A[1], o.r || 3.5, 0, 7); c.fillStyle = color; c.fill();
                    if (o.label) label(c, o.label, A[0] + 8, A[1] - 8, color, 'left');
                }
            });
        }
        text(p, s, color, o = {}) {
            const A = this.P(p);
            this.items.push({ z: 1e9, k: 4, fn: c => label(c, s, A[0] + (o.dx || 0), A[1] + (o.dy || 0), color, o.align) });
        }
        // Coordinate axes of the frame M (object-to-world), length L
        axes(M = I(), L = 1, o = {}) {
            const O = xf(M, [0, 0, 0]), names = o.names || ['x', 'y', 'z'];
            // o.faint: the same x/y/z colours, lighter, for a reference frame (e.g. world axes)
            const a = o.alpha ?? (o.faint ? 0.45 : 1);
            [[L, 0, 0], [0, L, 0], [0, 0, L]].forEach((e, i) =>
                this.arrow(O, xf(M, e), alpha(o.color || C.axes[i], a), { label: names[i], w: o.w || (o.faint ? 1.2 : undefined) }));
        }
        // Grid in the plane y = const; M (optional) moves it along with the scene.
        grid(n = 4, step = 1, y = 0, M = null, a = 1) {
            const P = M ? (p => xf(M, p)) : (p => p), col = a < 1 ? alpha(C.grid, 0.15 * a) : C.grid;
            const o = { z: -1e9, w: 0.8 };
            for (let i = -n; i <= n; i++) {
                this.line(P([i * step, y, -n * step]), P([i * step, y, n * step]), col, o);
                this.line(P([-n * step, y, i * step]), P([n * step, y, i * step]), col, o);
            }
        }
        // Shaded mesh. vertices already in world coordinates.
        // base: an object type ('house', 'pyramid', 'cube'), coloured as in lookat.html, or a CSS colour.
        mesh(m, base, o = {}) {
            if (TYPES[base]) return this.solid(m, TYPES[base], o);
            const L = norm([0.4, 0.8, 0.5]);
            const src = o.normals || m;     // optional mesh (same faces) whose geometry sets the shading
            for (const f of m.f) {
                const pts = f.map(i => m.v[i]), q = f.map(i => src.v[i]);
                const n = cross(sub(q[1], q[0]), sub(q[2], q[0]));
                const len = Math.hypot(...n);
                const s = len > 1e-12 ? Math.abs(dot(scl(n, 1 / len), L)) : 0.5;
                const k = o.fade ?? 1;     // 0..1, for fading a mesh in or out
                const fill = alpha(mix(C.bg, base, 0.25 + 0.55 * s), (o.alpha ?? 0.92) * k);
                this.poly(pts, fill, o.edge ?? alpha(C.text, 0.55 * k), { w: 0.7 });
            }
        }
        // Opaque solid with lookat.html shading: colour = base + range * max(0.1, n.L)
        solid(m, T, o = {}) {
            const L = norm([0.5, 0.8, 0.5]), src = o.normals || m, k = o.fade ?? 1;
            const edge = o.edge ?? `rgba(255,255,255,${0.5 * k})`;
            for (const f of m.f) {
                const q = f.map(i => src.v[i]);
                const n = cross(sub(q[1], q[0]), sub(q[2], q[0])), len = Math.hypot(...n) || 1;
                let d = dot(scl(n, 1 / len), L) * (o.flip ? -1 : 1);
                d = Math.max(0.1, d);
                const c = T.map(([b0, r]) => Math.round(b0 + r * d));
                this.poly(f.map(i => m.v[i]), `rgba(${c[0]},${c[1]},${c[2]},${k})`, edge, { w: 0.6 });
            }
        }
        // Translucent hexahedron (8 corners, cube() order), drawn like the volumes in the post's figures
        glass(c, o = {}) {
            const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
            const a = o.alpha ?? 1;
            faces.forEach(f => this.poly(f.map(i => c[i]), alpha(C.vol, 0.07 * a * (o.fill ?? 1)), null));
            this.wire(c, alpha(C.vol, 0.9 * a), { w: 1.3 });
        }
        // Flat image of meshes through Mndc (to normalized device coordinates), drawn in the rectangle
        // [-1,1] x [-1,1] shown with aspect ratio a (height / width). items: [{ m: mesh, type }].
        // Shading uses the meshes' own geometry, so it matches the 3D view. Returns NDC -> canvas mapping.
        image(items, Mndc, a, o = {}) {
            const fit = o.fit ?? 0.44, cy = (o.cy ?? 0.5) * this.H;   // size (fraction of the pane) and vertical centre
            const c = this.ctx, W = this.W, H = this.H, s = o.scale || Math.min(W * fit, (H * fit) / a);
            const X = x => W / 2 + x * s, Y = y => cy - y * a * s, L = norm([0.5, 0.8, 0.5]);
            const faces = [];
            items.forEach(({ m, type }) => m.f.forEach(f => {
                const q = f.map(i => xf(Mndc, m.v[i])), w = f.map(i => m.v[i]);
                if (f.some(i => apply(Mndc, m.v[i])[3] <= 1e-6)) return;     // behind the camera
                faces.push({ q, w, type, z: q.reduce((u, p) => u + p[2], 0) / q.length });
            }));
            faces.sort((A, B) => B.z - A.z);                                     // larger z_ndc is farther
            c.save(); c.beginPath(); c.rect(X(-1), Y(1), 2 * s, 2 * a * s); c.clip();
            for (const fa of faces) {
                const n = cross(sub(fa.w[1], fa.w[0]), sub(fa.w[2], fa.w[0])), len = Math.hypot(...n) || 1;
                const d = Math.max(0.1, dot(scl(n, 1 / len), L)), col = TYPES[fa.type].map(([b0, r]) => Math.round(b0 + r * d));
                c.beginPath(); fa.q.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath();
                c.fillStyle = `rgb(${col.join(',')})`; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 0.6; c.stroke();
            }
            c.restore();
            c.strokeStyle = o.border || alpha(C.vol, 0.9); c.lineWidth = 1.3; c.strokeRect(X(-1), Y(1), 2 * s, 2 * a * s);
            return { X, Y, s };
        }
        // Wire box between corners a and b
        box(a, b, color, o = {}) {
            const c = [[a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0], b[1], a[2]], [a[0], b[1], a[2]], [a[0], a[1], b[2]], [b[0], a[1], b[2]], [b[0], b[1], b[2]], [a[0], b[1], b[2]]];
            this.wire(c, color, o);
        }
        // 12 edges of a hexahedron given 8 corners (same order as cube())
        wire(c, color, o = {}) {
            [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
                .forEach(([i, j]) => this.line(c[i], c[j], color, o));
        }
    }
    function label(c, s, x, y, color, align = 'center') {
        c.font = 'italic bold 15px "Cambria Math", "Latin Modern Math", "Times New Roman", serif'; c.textAlign = align; c.textBaseline = 'middle';
        c.lineWidth = 3; c.strokeStyle = C.bg; c.strokeText(s, x, y);
        c.fillStyle = color; c.fillText(s, x, y);
    }

    // Object colours from lookat.html: per channel [base, range]
    const TYPES = {
        house: [[26, 139], [156, 60], [199, 44]],
        pyramid: [[20, 14], [50, 147], [20, 74]],
        cube: [[50, 189], [20, 48], [20, 48]],
        camera: [[30, 50], [30, 50], [30, 50]],
    };

    /* ---------- UI helpers ---------- */
    function seg(el, labels, i0, cb) {
        const box = document.createElement('div'); box.className = 'seg';
        const bs = labels.map((l, i) => {
            const b = document.createElement('button'); b.innerHTML = l; if (i === i0) b.className = 'on';
            b.onclick = () => { bs.forEach(x => x.className = ''); b.className = 'on'; cb(i); };
            box.appendChild(b); return b;
        });
        el.appendChild(box);
        return i => { bs.forEach(x => x.className = ''); bs[i].className = 'on'; };
    }
    function slider(el, name, min, max, step, val, cb, fmt = v => v.toFixed(2)) {
        const g = document.createElement('label'); g.className = 'grp';
        g.innerHTML = `<i>${name}</i><input type="range" min="${min}" max="${max}" step="${step}" value="${val}"><b></b>`;
        const inp = g.querySelector('input'), out = g.querySelector('b');
        const upd = () => { out.textContent = fmt(+inp.value); cb(+inp.value); };
        inp.addEventListener('input', upd);
        out.textContent = fmt(val);
        el.appendChild(g);
        return { get v() { return +inp.value; }, set v(x) { inp.value = x; out.textContent = fmt(x); } };
    }
    const num = (x, d = 2) => { const s = (Math.abs(x) < 5e-7 ? 0 : x).toFixed(d); return s === '-0.00' ? '0.00' : s; };
    // Matrix as HTML. M row-major with r rows and c columns; colCls optional class per column.
    function matHTML(M, r = 4, c = 4, d = 2, colCls = []) {
        let h = '<span class="mat"><table>';
        for (let i = 0; i < r; i++) {
            h += '<tr>';
            for (let j = 0; j < c; j++) h += `<td class="${colCls[j] || ''}">${num(M[c * i + j], d)}</td>`;
            h += '</tr>';
        }
        return h + '</table></span>';
    }
    const vecHTML = (v, d = 2, cls = '') => matHTML(v, v.length, 1, d, [cls]);
    // Simple tween; calls cb(t) each frame with eased t from 0 to 1.
    function tween(ms, cb) {
        const t0 = performance.now();
        let id = 0;
        const step = now => {
            const u = Math.min(1, (now - t0) / ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
            cb(e);
            if (u < 1) id = requestAnimationFrame(step);
        };
        id = requestAnimationFrame(step);
        return () => cancelAnimationFrame(id);
    }

    /* Animate a scalar state (e.g. a continuous step index) to a target.
       Duration grows with the distance, so skipping several steps plays through them. */
    function animator(get, set, render, msPerUnit = 750) {
        let id = 0;
        return (to, done) => {
            cancelAnimationFrame(id);
            const from = get(), d = Math.abs(to - from);
            if (d < 1e-6) { set(to); render(); if (done) done(); return; }
            const ms = Math.max(350, d * msPerUnit), t0 = performance.now();
            const step = now => {
                const u = Math.min(1, (now - t0) / ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                set(u < 1 ? from + (to - from) * e : to); render();
                if (u < 1) id = requestAnimationFrame(step); else if (done) done();
            };
            id = requestAnimationFrame(step);
        };
    }
    // Split a continuous step s in [0, n] into segment k and progress e within it.
    const segOf = (s, n) => { const k = Math.min(n - 1, Math.floor(s)); return [k, s - k]; };

    // On small screens the numeric readout is hidden behind a toggle button (see tf.css).
    function initReadouts() {
        document.querySelectorAll('.readout').forEach(ro => {
            const b = document.createElement('button'); b.className = 'ro-toggle'; b.textContent = 'Matrix';
            b.onclick = () => { const o = ro.classList.toggle('open'); b.textContent = o ? 'Hide' : 'Matrix'; };
            // shown only on narrow screens, even if an older cached tf.css is in use
            const mq = matchMedia('(max-width: 560px)'), sync = () => { b.style.display = mq.matches ? '' : 'none'; };
            mq.addEventListener('change', sync); sync();
            ro.parentNode.insertBefore(b, ro);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initReadouts); else initReadouts();

    initTheme();
    return { $, deg, C, onTheme, I, mul, apply, divide, xf, T, S, Rx, Ry, Rz, lerp, frustum, ortho, sub, add, scl, dot, cross, norm, lookAt,
        ZFLIP, cube, house, pyramid, mapMesh, clipMesh, alpha, mix, View, seg, slider, matHTML, vecHTML, num, tween, animator, segOf };
})();
