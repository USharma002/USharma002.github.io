---
author: ["Utkarsh Sharma"]
title: "A comprehensive look into the Importance Sampling and Path Guiding for Path Tracing"
date: "2025-12-22"
description: "Exploring the Importance Sampling Techniques to reduce variance in Monte Carlo Path Tracing"
summary: "Exploring the Importance Sampling Techniques to reduce variance in Monte Carlo Path Tracing"
tags: ["Generative Modelling", "Computer Graphics", "Ray Tracing"]
categories: ["machine-learning", "computer-graphics"]
series: ["Notes"]
ShowToc: true
TocOpen: true
math: true
---

## Introduction to Monte Carlo Path Tracing

The goal of photorealistic rendering is to create an image of a $3D$ scene that is indistinguishable from a photograph of the same scene.  For the most part, we will be satisfied with an accurate simulation of the physics of light and its interaction with matter, relying on our understanding of display technology to present the best possible image to the viewer.

We mostly work with equations that model light as particles that travel along rays. This leads to a more efficient computational approach based on a key operation known as **ray tracing**.

These notes work towards the **path tracing** algorithm and then, in the second half, towards the methods that learn *where to sample* inside it.

On the difference between ray tracing and path tracing: ray tracing is the general framework, the machinery of casting rays and finding intersections, while path tracing is one specific way to use that machinery, namely as an unbiased Monte Carlo estimator of the rendering equation. Whitted-style ray tracing, photon mapping and bidirectional path tracing are all ray tracing too; they differ in which paths they build and how they weight them. (There is also a reasonable informal discussion in <a href="https://discussions.unity.com/t/whats-the-difference-between-ray-tracing-and-path-tracing/801306">this Unity forum thread</a>.)

The plan is: establish the radiometric quantities, write the rendering equation and its alternate formulations, build up Monte Carlo integration and importance sampling from probability basics, assemble those into a path tracer, and then ask the question the second half is about, which is how to choose the sampling distribution well.

### Assumptions

- **Light travels in straight lines.** Its path is unbent within a uniform medium.
- **Lambert's cosine law.** The incident angle $\theta$ dictates how much a surface is illuminated.
<iframe src="/interactive/cosine_forshortening.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="430"
        frameborder="0"
        style="border-radius:8px;">
</iframe>

- **Light is additive.** Contributions from multiple sources sum, which is what lets us split the integral apart and estimate it piecewise.
- **Light source size affects shadow softness.** A larger emitter subtends a larger solid angle, widening the penumbra.
- **Inverse square law.** Intensity decreases with the square of the distance from the source.
$$\text{Intensity} \propto \frac{1}{r^2}$$

<iframe src="/interactive/inverse_square_law.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="430"
        frameborder="0"
        style="border-radius:8px;">
</iframe>

Three further assumptions are implicit in everything that follows, and they are worth stating because they bound what the model can represent:

- **Geometric optics.** Light is treated as particles travelling along trajectories. Interference, diffraction and polarization are outside the model.
- **Steady state.** The light distribution is assumed to have settled; we do not model temporal effects such as temperature changes affecting infrared radiation.
- **Vacuum between surfaces.** Radiance is constant along a ray through empty space, so transport happens only at surfaces. Participating media (fog, smoke, skin, clouds) break this assumption and need the volumetric formulation, which these notes do not cover.

### Scene Components
Although there are many ways to write a ray tracer, all such systems simulate at least the following objects and phenomena:

- **Cameras**: A camera model determines how and from where the scene is viewed, including how an image of the scene is recorded on a sensor. Many rendering systems generate viewing rays starting at the camera that are then traced into the scene to determine which objects are visible at each pixel.

{{< 
figure src="/images/path_tracing/basics/camera.png"
id="fig-camera"
caption="Camera/Sensor/Eye"
width="30%" 
>}}

- **Ray-object intersections**: We must be able to tell precisely where a given ray intersects a given geometric object. In addition, we need to determine certain properties of the object at the intersection point, such as a surface normal or its material.

{{< 
figure src="/images/path_tracing/basics/ray.png"
id="fig-ray-triangle"
caption="Ray r(t) and Ray-Triangle Intersection"
width="80%" 
>}}

For faster ray-triangle intersection, a **bounding volume hierarchy (BVH)** is normally used. A simplified visualization of it is given below: 
{{< 
fullscreen-iframe 
id="bvh" 
src="/interactive/bvh.html" 
height="430" 
>}}

- **Light Sources**: Without lighting, there would be little point in rendering a scene. A ray tracer must model the distribution of light throughout the scene, including not only the locations of the lights themselves but also the way in which they distribute their energy throughout space.

- **Visibility**: In order to know whether a given light deposits energy at a point on a surface, we must know whether there is an uninterrupted path from the point to the light source. Fortunately, this question is easy to answer in a ray tracer, since we can just construct the ray from the surface to the light, find the closest ray–object intersection, and compare the intersection distance to the light distance. 

{{< 
figure src="/images/path_tracing/basics/visibility.svg"
id="fig-visibility"
caption="Visibility"
width="80%" 
>}}

- **Light scattering at surfaces**:  Each object must provide a description of its appearance, including information about how light interacts with the object’s surface, as well as the nature of the reradiated (or scattered) light. Models for surface scattering are typically parameterized so that they can simulate a variety of appearances. 

{{< 
figure src="/images/path_tracing/basics/scattering.svg"
id="fig-scattering"
caption="Scattering"
width="80%" 
>}}


- **Indirect light transport**: Because light can arrive at a surface after bouncing off or passing through other surfaces, it is usually necessary to trace additional rays to capture this effect. 

- **Ray propagation**:  We need to know what happens to the light traveling along a ray as it passes through space. If we are rendering a scene in a vacuum, light energy remains constant along a ray. Although true vacuums are unusual on Earth, they are a reasonable approximation for many environments. More sophisticated models are available for tracing rays through fog, smoke, the Earth’s atmosphere, and so on. 

{{< 
figure src="/images/path_tracing/basics/path_tracing.svg"
id="fig-path-tracing-overview"
caption="Path Tracing Overview"
width="80%" 
>}}




## Mathematical Preliminaries

Before the rendering equation can say anything precise we need units for light, a way to write the transport problem, and the probability machinery to estimate it. This part supplies all three.

### Radiometry

This section follows the treatment in Delio Vicini's PhD thesis [[20]](#ref-20). It works within the geometric-optics and steady-state assumptions [listed above](#assumptions).

In geometric optics we think of light as photon particles travelling at light speed along trajectories in 3D space. A photon has a wavelength $\lambda$ and can be emitted, scattered or absorbed. The pixel response of a virtual camera sensor depends on the number of incident photons and their energy, which is determined by the wavelength:

$$
\begin{equation}
E = \frac{hc}{\lambda},
\label{eq:photon-energy}
\end{equation}
$$

where $h = 6.626 \times 10^{-34}\,\mathrm{m^2 kg/s}$ is Planck's constant, $c = 299\,792\,458\,\mathrm{m/s}$ the speed of light, and $\lambda$ the photon's wavelength in metres. The human visual system is sensitive to wavelengths from 380 nm to 700 nm.

We could model individual photon events, but there is no need at this granularity: the numbers of photons involved are large enough that their total energy can safely be assumed continuous, since a typical camera sensor collects around $10^5$ photons per pixel. Applications such as single-photon imaging, where photons must be modelled individually, are a different matter.

**Energy.** The total energy of photons in a region of space, say emitted by a surface $S \subset \mathbb{R}^3$, over a time interval $[0, t]$ is written $Q(t)$, measured in joules $\mathrm{J}$.

**Radiant flux.** The radiant flux, or power, is the infinitesimal temporal change of that energy:

$$
\begin{equation}
\Phi(t) = \frac{\mathrm{d}Q(t)}{\mathrm{d}t},
\label{eq:radiant-flux}
\end{equation}
$$

measured in watts $\mathrm{W = J/s}$. When rendering a scene in steady state we care about flux rather than total energy, since the intensity of a light source is specified in watts, not in total energy emitted over an interval. Since our scenes are static, the explicit dependency of $\Phi$ on $t$ is dropped from here on.

**Irradiance.** For a surface $S$, the irradiance is the density of *incident* flux per area:

$$
\begin{equation}
E(\mathbf{x}) = \frac{\mathrm{d}\Phi(\mathbf{x})}{\mathrm{d}A(\mathbf{x})},
\label{eq:irradiance}
\end{equation}
$$

with units $\mathrm{W/m^2}$. The corresponding *outgoing* quantity is called **radiant exitance**.

This definition is a derivative of flux with respect to the area measure $\mathrm{d}A$, or more precisely the **Radon–Nikodym derivative** of measures, meaning $E(\mathbf{x})$ is the function that integrates to the flux $\Phi$ under the area measure on $S$:

$$
\begin{equation}
\Phi(\mathbf{x}) = \int_S E(\mathbf{x})\, \mathrm{d}A(\mathbf{x}).
\label{eq:flux-from-irradiance}
\end{equation}
$$

The Radon–Nikodym derivative is uniquely defined up to sets of measure zero. A precise measure-theoretic derivation of all radiometric quantities is not needed here; Veach's thesis [[12]](#ref-12) covers it.

**Radiance.** The central quantity in rendering is radiance, defined as **flux per solid angle per projected area**. A **solid angle** measures the area subtended by an object on the unit sphere $\mathbb{S}^2$; its units are steradians $\mathrm{sr}$, and it is the two-dimensional analogue of ordinary one-dimensional angles. *Projected* area means a small surface patch perpendicular to the direction of interest. Formally:

$$
\begin{equation}
{\class{term-light}{L(\mathbf{x}, \boldsymbol{\omega})}} = \frac{\mathrm{d}^2 \Phi(\mathbf{x}, \boldsymbol{\omega})}{\mathrm{d}\sigma(\boldsymbol{\omega})\, \mathrm{d}A^{\perp}(\mathbf{x})},
\label{eq:radiance}
\end{equation}
$$

with units $\mathrm{W/(sr\,m^2)}$. The projected area measure relates to the standard area measure on a surface by

$$
\begin{equation}
\mathrm{d}A^{\perp}(\mathbf{x}) \coloneqq \lvert \boldsymbol{\omega} \cdot \mathbf{n} \rvert\, \mathrm{d}A(\mathbf{x}) = \lvert\cos\theta\rvert\, \mathrm{d}A(\mathbf{x}),
\label{eq:projected-area}
\end{equation}
$$

where $\mathbf{n}$ is the surface normal and $\theta$ the angle between the normal and $\boldsymbol{\omega}$.

{{< figure src="/images/path_tracing/radiometry/radiance.svg" id="fig-radiance" caption="Illustration of the terms used in the definition of radiance: the differential solid angle $\mathrm{d}\sigma(\boldsymbol{\omega})$ subtended on the unit sphere $\mathcal{S}^2$, the surface area element $\mathrm{d}A(\mathbf{x})$, and the projected area element $\mathrm{d}A^{\perp}(\mathbf{x})$ obtained by foreshortening $\mathrm{d}A(\mathbf{x})$ through $\lvert\cos\theta\rvert$. (Figure 3.1 from Vicini [[20]](#ref-20), reproduced with permission.)" width="85%" >}}

{{< figref "fig-radiance" >}} shows how the terms fit together. **This is where the cosine term in the rendering equation comes from.** The factor $\lvert\cos\theta\rvert = \lvert\boldsymbol{\omega}\cdot\mathbf{n}\rvert$ accounts for **foreshortening**: incident light at a grazing angle spreads over a larger surface patch. It is the same Lambert's cosine law listed among the assumptions above, now in its precise form.

The cosine is sometimes absorbed into the solid angle measure instead of the area measure, giving the **projected solid angle measure**:

$$
\begin{equation}
\mathrm{d}\sigma^{\perp}(\boldsymbol{\omega}) \coloneqq \lvert \boldsymbol{\omega} \cdot \mathbf{n} \rvert\, \mathrm{d}\sigma(\boldsymbol{\omega}),
\label{eq:projected-solid-angle}
\end{equation}
$$

commonly abbreviated $\mathrm{d}\boldsymbol{\omega}^{\perp} \coloneqq \mathrm{d}\sigma^{\perp}(\boldsymbol{\omega})$. Both conventions appear in the literature, and the papers later in these notes use both, so it is worth checking which one a given paper means.

**Incident and outgoing radiance.** We distinguish ${\class{term-light}{L_i}}$ from ${\class{term-light}{L_o}}$. For a point $\mathbf{x}$ that is *not* on a surface and not inside a participating medium,

$$
\begin{equation}
{\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega})}} = {\class{term-light}{L_o(\mathbf{x}, -\boldsymbol{\omega})}}.
\label{eq:radiance-invariance}
\end{equation}
$$

In other words, **radiance is constant along a ray through empty space**. This single property is what makes ray tracing work at all: it is why a renderer can follow a ray from the camera and only do work where it hits something. The property does *not* hold on surfaces or inside participating media, where incident radiance may be reflected or absorbed.

**Spectral radiance.** So far $L$ implicitly integrates over all wavelengths. To render RGB images we need spectrally resolved quantities, the most important being spectral radiance:

$$
\begin{equation}
{\class{term-light}{L(\mathbf{x}, \boldsymbol{\omega}, \lambda)}} = \frac{\mathrm{d}^3 \Phi(\mathbf{x}, \boldsymbol{\omega}, \lambda)}{\mathrm{d}\sigma(\boldsymbol{\omega})\, \mathrm{d}A^{\perp}(\mathbf{x})\, \mathrm{d}\lambda},
\label{eq:spectral-radiance}
\end{equation}
$$

where $\Phi$ is now the spectral energy of incident illumination. The wavelength dependency is not usually written out, but unless stated otherwise every use of radiance $L$ below means spectral radiance.

With these definitions in place, the quantities in the rendering equation stop being symbols and start being measurements: ${\class{term-light}{L_o}}$, ${\class{term-light}{L_e}}$ and ${\class{term-light}{L_i}}$ are all spectral radiances in $\mathrm{W/(sr\,m^2)}$, $\mathrm{d}\boldsymbol{\omega}$ is a solid angle in steradians, and the $(\boldsymbol{\omega}_i \cdot \mathbf{n})$ factor is the projected-area conversion of $\eqref{eq:projected-area}$.


### The Rendering Equation

At the heart of physically based rendering lies the **Rendering Equation**, introduced by James Kajiya (1986) [[1]](#ref-1). It provides a unified mathematical framework describing how light is transferred and redistributed in a scene. Intuitively, it says that the radiance leaving a surface point in some direction is the sum of the light the surface emits and the light it reflects from all incoming directions.

Formally:

$$
{\class{term-light}{L_o(x, \omega_o)}} = {\class{term-light}{L_e(x, \omega_o)}} + \int_{\Omega} {\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}\; {\class{term-light}{L_i(x, \omega_i)}}\; (\omega_i \cdot n)\; d\omega_i
$$

<div style="display:flex; gap:1.5rem; flex-wrap:wrap; justify-content:center; margin:1.25rem auto; padding:0.6rem 1rem; border:1px solid var(--border); border-radius:8px; font-size:0.85rem; max-width:580px;">
  <span class="term-key term-light">radiance / emission</span>
  <span class="term-key term-bsdf">BSDF / scattering</span>
  <span class="term-key" style="opacity:0.7;">geometry, visibility, measure</span>
</div>

Throughout these notes, light-carrying quantities are shown in <span class="term-light" style="font-weight:600;">orange</span> and
scattering quantities in <span class="term-bsdf" style="font-weight:600;">blue</span>, so the recursive structure stays visible as the
equations grow.

Where:

- ${\class{term-light}{L_o(x, \omega_o)}}$ - outgoing radiance from point $x$ toward direction $\omega_o$ (what the camera sees).  
- ${\class{term-light}{L_e(x, \omega_o)}}$ - emitted radiance from $x$ (non-zero if $x$ is a light source).  
- ${\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}$ - **BRDF** (Bidirectional Reflectance Distribution Function): ratio of the radiance scattered toward $\omega_o$ to the irradiance arriving from $\omega_i$ (units $\mathrm{sr}^{-1}$; it can exceed 1).
- ${\class{term-light}{L_i(x, \omega_i)}}$ - incoming radiance arriving at $x$ from direction $\omega_i$.  
- $(\omega_i \cdot n)$ - cosine foreshortening term (angle between incoming direction and surface normal $n$).  
- $\Omega$ - hemisphere of directions above the surface.

The rendering equation is read as follows.

- The integral accumulates contributions from *every* incoming direction over the hemisphere.  
- Because ${\class{term-light}{L_i}}$ itself depends on outgoing radiance from other points, the equation is recursive - it captures global illumination (indirect lighting, caustics, etc.).  
- Exact analytic solutions are generally impossible for complex scenes; we therefore rely on numerical approximation.

Path Tracing calculates an approximation for the rendering equation using Monte Carlo Integrals.


#### Rendering Equation Visualization
We can write this one big integral slightly differently as
$$
L(x\to v)={\class{term-light}{E_x}}+
\int_{\Omega} {\class{term-bsdf}{f_r}}
\left(
  {\class{term-light}{E_{x'}}}
  +
  \int_{\Omega'} {\class{term-bsdf}{f_r'}} \cdots \cos(\theta_{\omega'})\, d\omega'
\right)
\cos(\theta_{\omega})\, d\omega
$$

Which we can expand to get

$$
\begin{aligned}
L(x\to v) &= {\class{term-light}{E_x}} \\
&\quad + \int_{\Omega} {\class{term-bsdf}{f_r}}\,{\class{term-light}{E_{x'}}}\cos(\theta_{\omega})\,d\omega \\
&\quad + \int_{\Omega} {\class{term-bsdf}{f_r}} \int_{\Omega'} {\class{term-bsdf}{f_r'}}\,{\class{term-light}{E_{x''}}}\cos(\theta_{\omega'})\cos(\theta_{\omega})\,d\omega'\,d\omega \\
&\quad + \int_{\Omega} {\class{term-bsdf}{f_r}} \int_{\Omega'} {\class{term-bsdf}{f_r'}} \int_{\Omega''} {\class{term-bsdf}{f_r''}}\,{\class{term-light}{E_{x'''}}}\cos(\theta_{\omega''})\cos(\theta_{\omega'})\cos(\theta_{\omega})\,d\omega''\,d\omega'\,d\omega \\
&\quad + \cdots
\end{aligned}
$$

After expanding the rendering integral, we can easily visualize the components of the integral and how they contribute to the final image

{{< step-slider animate="false" noinvert=true >}}

- image: "/images/path_tracing/rendering_equation/full.png"
  title: "Incoming Radiance (Full Rendering Equation)"
  description: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    L(x\to v) &= E_x \\
    &\quad + \int_{\Omega} {\class{term-bsdf}{f_r}}\,E_{x'}\,\cos(\theta_\omega)\,d\omega \\
    &\quad + \int_{\Omega}\int_{\Omega'} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,E_{x''}\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega'\,d\omega \\
    &\quad + \int_{\Omega}\int_{\Omega'}\int_{\Omega''} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,{\class{term-bsdf}{f_r}}''\,E_{x'''}\,\cos(\theta_{\omega''})\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega''\,d\omega'\,d\omega \\
    &\quad + \cdots
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/1.png"
  title: "Emitted Radiance"
  description: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    L(x\to v) &= \class{mj-current}{E_x} \\
    &\quad + \class{mj-dim}{\int_{\Omega} {\class{term-bsdf}{f_r}}\,E_{x'}\,\cos(\theta_\omega)\,d\omega} \\
    &\quad + \class{mj-dim}{\int_{\Omega}\int_{\Omega'} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,E_{x''}\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega'\,d\omega} \\
    &\quad + \class{mj-dim}{\int_{\Omega}\int_{\Omega'}\int_{\Omega''} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,{\class{term-bsdf}{f_r}}''\,E_{x'''}\,\cos(\theta_{\omega''})\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega''\,d\omega'\,d\omega} \\
    &\quad + \class{mj-dim}{\cdots}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/2.jpg"
  title: "Direct Radiance (Only from the bounce 1)"
  description: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    L(x\to v) &= \class{mj-dim}{E_x} \\
    &\quad + \class{mj-current}{\int_{\Omega} {\class{term-bsdf}{f_r}}\,E_{x'}\,\cos(\theta_\omega)\,d\omega} \\
    &\quad + \class{mj-dim}{\int_{\Omega}\int_{\Omega'} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,E_{x''}\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega'\,d\omega} \\
    &\quad + \class{mj-dim}{\int_{\Omega}\int_{\Omega'}\int_{\Omega''} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,{\class{term-bsdf}{f_r}}''\,E_{x'''}\,\cos(\theta_{\omega''})\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega''\,d\omega'\,d\omega} \\
    &\quad + \class{mj-dim}{\cdots}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/3.jpg"
  title: "Indirect Radiance (Only from the bounce 2)"
  description: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    L(x\to v) &= \class{mj-dim}{E_x} \\
    &\quad + \class{mj-dim}{\int_{\Omega} {\class{term-bsdf}{f_r}}\,E_{x'}\,\cos(\theta_\omega)\,d\omega} \\
    &\quad + \class{mj-current}{\int_{\Omega}\int_{\Omega'} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,E_{x''}\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega'\,d\omega} \\
    &\quad + \class{mj-dim}{\int_{\Omega}\int_{\Omega'}\int_{\Omega''} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,{\class{term-bsdf}{f_r}}''\,E_{x'''}\,\cos(\theta_{\omega''})\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega''\,d\omega'\,d\omega} \\
    &\quad + \class{mj-dim}{\cdots}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/4.jpg"
  title: "Indirect Radiance (Only from the bounce 3)"
  description: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    L(x\to v) &= \class{mj-dim}{E_x} \\
    &\quad + \class{mj-dim}{\int_{\Omega} {\class{term-bsdf}{f_r}}\,E_{x'}\,\cos(\theta_\omega)\,d\omega} \\
    &\quad + \class{mj-dim}{\int_{\Omega}\int_{\Omega'} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,E_{x''}\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega'\,d\omega} \\
    &\quad + \class{mj-current}{\int_{\Omega}\int_{\Omega'}\int_{\Omega''} {\class{term-bsdf}{f_r}}\,{\class{term-bsdf}{f_r}}'\,{\class{term-bsdf}{f_r}}''\,E_{x'''}\,\cos(\theta_{\omega''})\,\cos(\theta_{\omega'})\,\cos(\theta_\omega)\,d\omega''\,d\omega'\,d\omega} \\
    &\quad + \class{mj-dim}{\cdots}
    \end{aligned}
    $$
    </div>

{{< /step-slider >}}

### Alternate Formulations of the Rendering Equation

The rendering equation above integrates over directions, but that is a choice, not a necessity. The same physical statement can be written as an integral over surface points, as an operator equation, or as an integral over whole light paths. These are not academic variations: **each one suggests a different thing to importance sample**, and the methods in the second half of these notes split along exactly these lines, with some learning a distribution over directions and one learning a distribution over paths.

The following formulations can be found in [Eric Veach's PhD thesis](https://graphics.stanford.edu/papers/veach_thesis/thesis.pdf) [[12]](#ref-12), or the [TU Wien Rendering Course](https://www.cg.tuwien.ac.at/courses/Rendering/VU/2021S) [[14]](#ref-14), which I have used as resources.

#### Classic Surface Rendering Equation
First, this is the standard rendering equation we'll see in most local path guiding papers. It picks a direction of contribution and integrates over all the direction of contribution (upper hemisphere / sphere). For a given direction, the radiance already includes all visible surfaces along that ray in that direction, so no explicit visibility term is needed.

This is the equation from [above](#the-rendering-equation), integrating over the hemisphere $\Omega$ of incident directions with the solid-angle measure.


#### Surface Area (Geometry-Explicit) Rendering Equation
This is the same formulation after a **change of variables**: instead of picking a direction, we integrate over every point on the surfaces of the scene. Because the map from directions to surface points only covers the points actually visible from $x$, an explicit **visibility function** $V(x,y)$ is needed to discard occluded points. The **geometry term** $G(x,y)$ is the Jacobian of that change of variables, gathered together with the foreshortening cosine the directional form already carried; the derivation below makes the split explicit. This form is also called the **three-point form**, since each term of the resulting expansion couples three consecutive path vertices.

$$
{\class{term-light}{L_o(x, \omega_o)}} =
{\class{term-light}{L_e(x, \omega_o)}}
+
\int_{A}
{\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}\;
{\class{term-light}{L_o(y, -\omega_i)}}\;
G(x,y)\;
V(x,y)\;
dA_y
$$

Where:

- $A$ - set of all surfaces in the scene (integration domain).  
- $y$ - surface point contributing light to $x$.  
- $\omega_i$ - direction from $x$ to $y$.  
- ${\class{term-light}{L_o(y, -\omega_i)}}$ - outgoing radiance from $y$ toward $x$.  
- ${\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}$ - BRDF at $x$.  
- $G(x,y)$ - geometry term:
  $$
  G(x,y) = \frac{\lvert\omega_i \cdot n_x\rvert\,\lvert-\omega_i \cdot n_y\rvert}{\|x - y\|^2}
  $$
- $V(x,y)$ - visibility function (1 if $x$ and $y$ are mutually visible, 0 otherwise).  
- $dA_y$ - differential surface area at $y$.

<blockquote style="margin: 1.5rem 0; padding: 0.8rem 1.2rem; border-left: 4px solid var(--site-link-color, #1565c0); background: var(--site-blockquote-bg, #f4f6fb); border-radius: 8px;">
<details>
<summary style="cursor: pointer;"><strong>Change of Variables: Solid Angle to Surface Area</strong></summary>

<div style="margin-top: 1rem;">

Start from the directional form, whose integrand is taken over the solid angle measure $\mathrm{d}\sigma(\omega_i)$ on the hemisphere $\Omega$:

$$ \int_{\Omega} {\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}\; {\class{term-light}{L_i(x, \omega_i)}}\; (\omega_i \cdot n_x)\; \mathrm{d}\sigma(\omega_i). $$

Let $y$ be the first surface point hit by the ray leaving $x$ in direction $\omega_i$, so that

$$ \omega_i = \frac{y - x}{\lVert y - x \rVert}. $$

**The differential solid angle subtended by a surface patch.** A patch of area $\mathrm{d}A(y)$ around $y$ is seen from $x$ at an angle. Only its component perpendicular to the viewing direction subtends solid angle, and by $\eqref{eq:projected-area}$ that component is

$$ \mathrm{d}A^{\perp}(y) = \lvert \cos\theta_y \rvert \, \mathrm{d}A(y), \qquad \cos\theta_y = -\omega_i \cdot n_y, $$

with $n_y$ the normal at $y$. A perpendicular area at distance $r$ subtends $\mathrm{d}A^{\perp}/r^2$ steradians, so

$$ \mathrm{d}\sigma(\omega_i) = \frac{\lvert -\omega_i \cdot n_y \rvert}{\lVert x - y \rVert^{2}} \, \mathrm{d}A(y). $$

**Identifying the Jacobian.** The ratio above is the Jacobian determinant of the map $y \mapsto \omega_i$ that carries the surface into the sphere of directions:

$$ \left\lvert \frac{\partial \sigma}{\partial A} \right\rvert = \frac{\lvert -\omega_i \cdot n_y \rvert}{\lVert x - y \rVert^{2}}. $$

It is the whole price of the change of variables: one cosine at the *emitting* end, and the inverse-square falloff.

**Changing the domain.** The map $y \mapsto \omega_i$ is a bijection only between $\Omega$ and the set of surface points directly visible from $x$. To integrate over all surfaces $A$ instead, every occluded point must be excluded explicitly, which is what the visibility function

$$ V(x,y) = \begin{cases} 1 & \text{if } x \text{ and } y \text{ are mutually visible} \\ 0 & \text{otherwise} \end{cases} $$

does. Substituting both, and replacing incident radiance by outgoing radiance at the other endpoint using the radiance invariance of $\eqref{eq:radiance-invariance}$, ${\class{term-light}{L_i(x, \omega_i)}} = {\class{term-light}{L_o(y, -\omega_i)}}$:

$$ \int_{A} {\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}\; {\class{term-light}{L_o(y, -\omega_i)}}\; (\omega_i \cdot n_x)\; \frac{\lvert -\omega_i \cdot n_y \rvert}{\lVert x - y \rVert^{2}}\; V(x,y)\; \mathrm{d}A_y. $$

**Collecting the geometric factors.** Grouping the two cosines and the inverse square into a single symbol,

$$ G(x,y) = \underbrace{(\omega_i \cdot n_x)}_{\text{foreshortening at } x} \cdot \underbrace{\frac{\lvert -\omega_i \cdot n_y \rvert}{\lVert x - y \rVert^{2}}}_{\text{Jacobian } \partial\sigma / \partial A}, $$

recovers the surface-area form exactly. The factor $(\omega_i \cdot n_x)$ is the Lambert foreshortening cosine that the directional form already carried; everything else in $G$ is the Jacobian.

</div>
</details>
</blockquote>

#### Operator Form of the Rendering Equation
This, as the name suggests, treats the transport of light rays as operator. This formulation is useful for proofs of convergence, existence etc.

$$
{\class{term-light}{L}} = {\class{term-light}{L_e}} + \mathcal{T} {\class{term-light}{L}}
$$

Where:

- $L$ - radiance function over all surface points and directions.  
- ${\class{term-light}{L_e}}$ - emitted radiance.  
- $\mathcal{T}$ - light transport operator defined by:
  $$
  (\mathcal{T}L)(x, \omega_o)
  =\int_{\Omega}{\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}\;{\class{term-light}{L_i(x, \omega_i)}}\;(\omega_i \cdot n)d\omega_i
  $$
  with ${\class{term-light}{L_i(x,\omega_i)}} = {\class{term-light}{L(r(x,\omega_i),-\omega_i)}}$, where $r(x,\omega_i)$ is the ray-casting function returning the closest surface hit from $x$ in direction $\omega_i$.
- Integration domain - hemisphere of directions above the surface.

This form emphasizes that global illumination is a fixed-point problem.

**Solution operator.** For simplicity of notation ${\class{term-light}{L_e}} = E$.
Rearrange:

$$L = E + \mathcal{T}L$$
$$L - \mathcal{T}L = E$$
$$(I - \mathcal{T})L = E$$

So the formal solution is:

$$
L = (I - \mathcal{T})^{-1} E
$$
and $\mathcal{S}$ is the solution operator
$$\mathcal{S} = (I - \mathcal{T})^{-1}, \qquad L = \mathcal{S}E$$

#### Neumann-Series Expansion

Using the Neumann-series identity:

$$
(I-\mathcal{T} )^{-1} = I + \mathcal{T} + \mathcal{T}^2 + \mathcal{T}^3 + \cdots
$$

(valid when $\lVert\mathcal{T}\rVert<1$, which holds for energy-conserving BSDFs in scenes that are not perfectly closed and lossless).

Substitute into the solution:

$$
\begin{aligned}
L &= (I-\mathcal{T} )^{-1}E \\
  &= (I + \mathcal{T}  + \mathcal{T} ^2 + \mathcal{T} ^3 + \cdots)\,E \\
  &= E + \mathcal{T}E + \mathcal{T}^2E + \mathcal{T}^3E + \cdots
\end{aligned}
$$

The following visualizes the individual components (similar to the one given in the rendering equation) but with appropriate operator formulation for clarity.

{{< step-slider animate="false" noinvert=true >}}

- image: "/images/path_tracing/rendering_equation/operator/E.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/operator/TE.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    \mathcal{T} {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/operator/TTE.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    \mathcal{T}^2 {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/operator/TTTE.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    \mathcal{T}^3 {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>
{{< /step-slider >}}


The following visualizes the accumulation of individual components:
{{< step-slider animate="false" noinvert=true >}}

- image: "/images/path_tracing/rendering_equation/operator/E.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/operator/E_TE.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    {\class{term-light}{L_e}} + \mathcal{T} {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/operator/E_TE_TTE.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    {\class{term-light}{L_e}} + \mathcal{T} {\class{term-light}{L_e}} + \mathcal{T}^2 {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/rendering_equation/operator/E_TE_TTE_TTTE.jpg"
  title: |
    <div class="eq-stack">
    $$
    \begin{aligned}
    {\class{term-light}{L_e}} + \mathcal{T} {\class{term-light}{L_e}} + \mathcal{T}^2 {\class{term-light}{L_e}} + \mathcal{T}^3 {\class{term-light}{L_e}}
    \end{aligned}
    $$
    </div>
{{< /step-slider >}}


#### Path Integral Formulation of Light Transport
This formulation integrates over the domain of all light transport paths. This lets us see the light transport as a contribution of different paths. This is very intuitive for Monte Carlo methods as it emphasises that different paths have different contributions and we are integrating over all possible paths (or at least approximating that integral). This also makes it easy to see that we can work with "good" paths directly instead of choosing the ray direction as in the classical formulation.

$$
I_j =
\int_{\mathcal{P}}
f_j(\bar{x})\;
d\mu(\bar{x})
$$

Where:

$$
f_j(\bar{x}) =
{\class{term-light}{L_e(x_0\to x_1)}}\;
G(x_0, x_1)\,V(x_0, x_1)
\prod_{i=1}^{k-1}
{\class{term-bsdf}{f_r(x_{i-1}\to x_i\to x_{i+1})}}\;
G(x_i, x_{i+1})\;
V(x_i, x_{i+1})
\; W_e^{(j)}(x_{k-1}\to x_k)
$$

And:

- $\mathcal{P}$ - set of all possible light paths of all lengths
  $$
  \bar{x} = (x_0, x_1, \ldots, x_k) \in \mathcal{P_k}
  $$
  $$
  \mathcal{P} = \bigcup_{k=1}^{\infty} \mathcal{P_k}
  $$
  with vertices on surfaces (volumes are excluded in these notes).  
- $x_0$ - point on a light source.  
- $x_k$ - point on the sensor (camera).  
- ${\class{term-bsdf}{f_r(x_{i-1}\to x_i\to x_{i+1})}}$ - scattering function (BRDF/BSDF) at vertex $x_i$, for light arriving from $x_{i-1}$ and leaving toward $x_{i+1}$.  
- $G(x_i, x_{i+1})$ - geometry term between consecutive vertices.  
- $V(x_i, x_{i+1})$ - visibility term.  
- $W_e^{(j)}$ - sensor importance (response) of pixel $j$.  
- $d\mu(\bar{x}) = \prod_{i=0}^{k} dA(x_i)$ - product area measure on path space.


{{< 
figure src="/images/path_tracing/paths/paths.png"
id="fig-paths"
caption="Sample paths from path space contributing to the final image"
width="80%" 
>}}

**Visualizing different paths.** 
We can see the interaction of light with Specular (S), Diffuse (D) objects. We can write all of the types of interaction of lights as regular expression $L(D | S)^*E$

<iframe src="/interactive/light_paths.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="500"
        frameborder="0"
        style="border-radius:8px;">
</iframe>

The following sections contain the basics of probability required to know about how the Path Tracing is approximating the integral and ensuring the approximation is close enough to the actual solution. The sections are taken from the online version of [Intro to Probability, Statistics and Random Processes](https://www.probabilitycourse.com/) [[11]](#ref-11). A more measure-theoretic treatment of Monte Carlo estimators is given by Owen [[13]](#ref-13).


### Probability Foundations

None of the formulations above has an analytic solution for a general scene. The rendering equation is an integral equation whose integrand contains the unknown itself, over a domain with arbitrary geometry and visibility. What we can do is *estimate* it, and the tool for that is Monte Carlo integration.

Because Monte Carlo integration is based on randomization, we'll first discuss some ideas from probability and statistics.

First we define a random variable.

> **Definition - Random Variable**
>
> A **random variable** $X$ is a function that maps outcomes from the sample space $\Omega$ to the set of real numbers $\mathbb{R}$:
>
> $$
X : \Omega \rightarrow \mathbb{R}
$$
>
> Each outcome $\omega \in \Omega$ is assigned a numerical value $X(\omega)$, representing the realization of the random variable.

We also define a Probability Mass Function. The probabilities of events $\lbrace X=x_k \rbrace$ are formally shown by the **probability mass function (PMF)** of $X$.

> **Definition - Probability Mass Function**
>
> Let $X$ be a discrete Random variable with range $R_X=\lbrace x_1, x_2, \dots \rbrace$ (finite or countably infinite). The function:
>
> $$
p_X(x_k) = P(X=x_k), \text{for k = }1, 2, \dots
$$
>
> is called the *probability* mass function (PMF) of $X$

Thus, the PMF specifies the probability measure that gives us probabilities of the possible values for a random variable.



$$
\boxed{
\begin{aligned}
&\text{Let } X \text{ be a discrete random variable with range } \mathcal{R}_X 
\text{ and PMF } p_X(x) = P(X = x). \\[6pt]
&\text{Then the PMF satisfies the following properties:} \\[10pt]
&1.\ \textbf{Non-negativity: } 0 \le p_X(x) \le 1, \quad \forall x \in \mathcal{R}_X \\[6pt]
&2.\ \textbf{Normalization: } \sum_{x \in \mathcal{R}_X} p_X(x) = 1 \\[6pt]
&3.\ \textbf{Additivity over sets: } 
P(X \in A) = \sum_{x \in A} p_X(x), \quad \forall A \subseteq \mathcal{R}_X
\end{aligned}
}
$$



The PMF is one way to describe the distribution of a discrete random variable and cannot be defined over continuous variables. The cumulative distribution function (CDF) of a random variable is another method to describe the distribution of random variables. The advantage of the CDF is that it can be defined for any kind of random variable (discrete, continuous, and mixed).

> **Definition - Cumulative Distribution Function**
>
> The cumulative distribution function (CDF) of random variable $X$ is defined as:
>
> $$F_X(x) = P(X \le x), \quad \text{for all } x\in\mathbb{R}$$
>
> $F_X$ is called the cumulative distribution function (CDF) of $X$

Note that the subscript $X$ indicates that this is the CDF of the random variable $X$. Also, note that the CDF is defined for all $x\in \mathbb{R}$

$$
\boxed{
\forall\, a \le b, \quad 
P(a < X \le b) = F_X(b) - F_X(a)
}
$$

> **Definition - Probability Density Function (PDF)**
>
> Let $X$ be a **continuous random variable**. The **probability density function (PDF)** of $X$ is a non-negative function $f_X(x)$ satisfying:
>
> $$
P(a \le X \le b) = \int_a^b f_X(x)\,dx
$$
>
> for all real numbers $a \le b$.
>
 The PDF must satisfy the following properties:

 $$
 \boxed{
 \begin{aligned}
 &1.\ \textbf{Non-negativity: } f_X(x) \ge 0, \quad \forall x \in \mathbb{R} \\[4pt]
 &2.\ \textbf{Normalization: } \int_{-\infty}^{\infty} f_X(x)\,dx = 1
 \end{aligned}
 }
 $$

 Unlike a PMF, the PDF itself does not give probabilities directly; instead, the probability that $X$ lies in an interval is given by the area under $f_X(x)$ over that interval.


> **Definition - Expected Value**
>
> Let $X$ be a **continuous random variable** with probability density function $f_X(x)$.  
> The **expected value** (or **mean**) of $X$, denoted by $\mathbb{E}[X]$, is defined as:
>
> $$
\boxed{
\mathbb{E}[X] = \int_{-\infty}^{\infty} x\, f_X(x)\, dx
 }
$$
>
The expected value represents the theoretical average value of $X$ - the value one would obtain as the limit of the sample mean if the random process were repeated infinitely many times.

> **Definition - Variance**
>
> Let $X$ be a **continuous random variable** with probability density function $f_X(x)$ and expected value $\mu = \mathbb{E}[X]$.  
> The **variance** of $X$, denoted by $\mathrm{Var}(X)$, measures the expected squared deviation of $X$ from its mean:
>
> $$
 \boxed{
 \mathrm{Var}(X) = \int_{-\infty}^{\infty} (x - \mu)^2\, f_X(x)\, dx
 }
 $$
>
> Equivalently, variance can also be expressed as:
>
> $$
 \boxed{
 \mathrm{Var}(X) = \mathbb{E}[X^2] - (\mathbb{E}[X])^2
 }
$$
>

The variance quantifies the spread or dispersion of the distribution - larger values indicate greater variability of $X$ around its mean.

#### Inverse Transform Sampling

The definitions above describe a distribution; this is how we **draw** from one. Every sampling routine in a renderer (a cosine-weighted direction, a point on an area light, the choice of which technique to use) is this single mechanism applied to uniform random numbers.

Let $U \sim \mathrm{Unif}[0,1]$ and let $X$ be the target random variable with CDF $F_X$. Assume for now that $F_X$ is continuous and strictly increasing, so that its inverse $F_X^{-1}$ is well defined. We look for a strictly increasing transformation

$$
T : [0,1] \to \mathbb{R},
$$

such that the transformed variable $T(U)$ has the same distribution as $X$:

$$
T(U) \overset{d}{=} X.
$$

Compute the CDF of $T(U)$:

$$
F_X(x) = \Pr(X \le x) = \Pr(T(U) \le x) = \Pr\left(U \le T^{-1}(x)\right),
$$

where the last step uses that $T$ is increasing. Because $U$ is uniform on $[0,1]$,

$$
\Pr(U \le y) = y, \qquad 0 \le y \le 1,
$$

and therefore $F_X(x) = T^{-1}(x)$. So $F_X$ is the inverse of $T$, which gives

$$
T(u) = F_X^{-1}(u), \qquad u \in [0,1],
$$

and the desired random variable is generated by

$$
\begin{equation}
X = F_X^{-1}(U).
\label{eq:inverse-cdf}
\end{equation}
$$

The inverse $F_X^{-1}$ is called the **quantile function**. When $F_X$ is flat or has jumps, as for a discrete or mixed distribution, the strict inverse does not exist and the **generalized inverse** is used instead:

$$
F_X^{-1}(u) = \inf \lbrace x \in \mathbb{R} : F_X(x) \ge u \rbrace,
$$

which makes $\eqref{eq:inverse-cdf}$ valid for any random variable. For a discrete distribution this reduces to walking the cumulative weights until they exceed $u$, normally done with a binary search, which is exactly how one of several light sources, or one component of a mixture, is picked.

Two facts about $\eqref{eq:inverse-cdf}$ carry into the rest of these notes. First, a sampler is a **map from the unit hypercube to the domain of interest**: the uniform numbers are the raw material and the map is the design choice. Second, the multidimensional case is handled one dimension at a time. Sample the **marginal** $p(u)$ by inverting its CDF, then sample the **conditional** $p(v \mid u)$ by inverting its CDF. That two-step procedure is the standard way to sample a 2D tabulated distribution.

<div style="overflow-x:auto;">
<iframe src="/interactive/inverse_transform_sampling.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="280"
        frameborder="0"
        style="border-radius:8px; min-width: 700px;">
</iframe>
</div>

### The Monte Carlo Estimator

With those definitions in hand we can state the estimator itself, and then derive the three properties that make it usable: that it converges to the right answer, how fast, and what controls the error.

Let $I$ be an integral of interest (the rendering equation for us), defined over $\Omega$:

$$
I = \int_{\Omega} f(x)\, dx
$$

where $\Omega$ is any reasonable integration domain.

#### From Integration to Expectation

The key insight of Monte Carlo integration is recognizing that any integral can be rewritten as an **expectation** of a random variable.

Given a probability density function (PDF) $p(x)$ defined over $\Omega$, we can decompose the integral as:

$$
I = \int_{\Omega} f(x)\, dx = \int_{\Omega} \frac{f(x)}{p(x)} p(x)\, dx
$$

By the definition of expected value for a continuous random variable $X$ with PDF $p(x)$:

$$
\mathbb{E}[g(X)] = \int_{\Omega} g(x) \cdot p(x)\, dx
$$

we can identify:

$$
I = \mathbb{E}\left[\frac{f(X)}{p(X)}\right]
$$

where $X$ is a random variable drawn from distribution $p(x)$.

<iframe src="/interactive/monte_carlo.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="420"
        frameborder="0"
        style="border-radius:8px;">
</iframe>


#### Conditions on $p(x)$

The PDF $p(x)$ must satisfy the following fundamental properties:

$$
\boxed{
\begin{aligned}
&1.\ \textbf{Non-negativity:}\quad p(x) \geq 0, \quad \forall x \in \Omega \\[8pt]
&2.\ \textbf{Normalization:}\quad \int_{\Omega} p(x)\, dx = 1 \\[8pt]
&3.\ \textbf{Support condition:}\quad p(x) > 0 \text{ wherever } f(x) \neq 0
\end{aligned}
}
$$

The third property is **crucial**: if $p(x) = 0$ at some point where $f(x) \neq 0$, the ratio $\frac{f(x)}{p(x)}$ becomes undefined or infinite, making the estimator invalid.

#### The Estimator

To approximate the expected value $\mathbb{E}[f(X)/p(X)]$, we draw $N$ independent samples $X_1, X_2, \ldots, X_N$ from $p(x)$ and compute their average:

$$
\boxed{
\hat{I}_{MC} = \frac{1}{N}\sum_{i=1}^{N} \frac{f(X_i)}{p(X_i)}, \quad X_i \stackrel{\text{i.i.d.}}{\sim} p(x)
}
$$

This is the **importance sampling** Monte Carlo estimator. The term "importance sampling" refers to the fact that we sample proportionally to how important each region is to the integral (weighted by $p(x)$).


#### Property 1: Unbiasedness

To prove that $\mathbb{E}[\hat{I}_{MC}] = I$, take the expectation of both sides:

$$
\begin{equation}
\begin{aligned}
\mathbb{E}\!\left[\hat{I}_{MC}\right]
  &= \mathbb{E}\!\left[\frac{1}{N}\sum_{i=1}^{N}\frac{f(X_i)}{p(X_i)}\right]
  && \text{[definition of the estimator]} \\[6pt]
  &= \frac{1}{N}\sum_{i=1}^{N}\mathbb{E}\!\left[\frac{f(X_i)}{p(X_i)}\right]
  && \text{[linearity of expectation]} \\[6pt]
  &= \frac{1}{N}\sum_{i=1}^{N}\int_{\Omega}\frac{f(x)}{p(x)}\,p(x)\,\mathrm{d}x
  && \text{[}X_i \sim p(x)\text{, i.i.d.]} \\[6pt]
  &= \frac{1}{N}\sum_{i=1}^{N}\int_{\Omega} f(x)\,\mathrm{d}x
  && \text{[}p(x) > 0 \text{ wherever } f(x) \neq 0\text{]} \\[6pt]
  &= \frac{1}{N}\cdot N\cdot I \;=\; I
  && \text{[}N\text{ identical terms]}
\end{aligned}
\label{eq:mc-unbiased}
\end{equation}
$$

$$
\boxed{\;\mathbb{E}\!\left[\hat{I}_{MC}\right] = I\;}
$$

The estimator is **unbiased**, meaning its expected value equals the true integral.

#### Property 2: Variance Derivation

$$
\begin{equation}
\begin{aligned}
\operatorname{Var}\!\left(\hat{I}_{MC}\right)
  &= \operatorname{Var}\!\left(\frac{1}{N}\sum_{i=1}^{N}\frac{f(X_i)}{p(X_i)}\right)
  && \text{[definition of the estimator]} \\[6pt]
  &= \frac{1}{N^{2}}\operatorname{Var}\!\left(\sum_{i=1}^{N}\frac{f(X_i)}{p(X_i)}\right)
  && \text{[}\operatorname{Var}(cY) = c^{2}\operatorname{Var}(Y)\text{]} \\[6pt]
  &= \frac{1}{N^{2}}\sum_{i=1}^{N}\operatorname{Var}\!\left(\frac{f(X_i)}{p(X_i)}\right)
  && \text{[independent} \Rightarrow \text{variances add]} \\[6pt]
  &= \frac{1}{N^{2}}\cdot N\cdot \operatorname{Var}\!\left[\frac{f(X)}{p(X)}\right]
  && \text{[identically distributed]} \\[6pt]
  &= \frac{1}{N}\operatorname{Var}\!\left[\frac{f(X)}{p(X)}\right]
\end{aligned}
\label{eq:mc-variance}
\end{equation}
$$

$$
\boxed{\;\operatorname{Var}\!\left(\hat{I}_{MC}\right) = \frac{1}{N}\operatorname{Var}\!\left[\frac{f(X)}{p(X)}\right]\;}
$$

#### Property 3: Convergence Rate and Standard Error

The **standard deviation** (standard error) of the estimator follows directly:

$$
\begin{aligned}
\sigma\!\left(\hat{I}_{MC}\right)
  &= \sqrt{\operatorname{Var}\!\left(\hat{I}_{MC}\right)}
  && \text{[definition of standard error]} \\[6pt]
  &= \sqrt{\frac{1}{N}\operatorname{Var}\!\left[\frac{f(X)}{p(X)}\right]}
  && \text{[by }\eqref{eq:mc-variance}\text{]} \\[6pt]
  &= \frac{1}{\sqrt{N}}\,\sqrt{\operatorname{Var}\!\left[\frac{f(X)}{p(X)}\right]}
  && \text{[}\sqrt{ab} = \sqrt{a}\sqrt{b}\text{]}
\end{aligned}
$$

The second factor does not depend on $N$, so

$$
\boxed{\;\sigma\!\left(\hat{I}_{MC}\right) = \mathcal{O}\!\left(N^{-1/2}\right)\;}
$$

This means the error decreases proportionally to $N^{-1/2}$, **independent of the dimensionality** of the problem. This is a major advantage over deterministic numerical integration methods, which suffer from the "curse of dimensionality."

**Key observation**: The error decreases as $\mathcal{O}\left(\frac{1}{\sqrt{N}}\right)$, so to reduce standard deviation by a factor of 4, we need 16 times more samples.


#### Summary: Properties of the Monte Carlo Estimator

$$
\boxed{
\begin{aligned}
&\text{1. Unbiasedness:}\quad \mathbb{E}[\hat{I}_{MC}] = I \\[8pt]
&\text{2. Variance:}\quad \text{Var}(\hat{I}_{MC}) = \frac{1}{N}\text{Var}\left[\frac{f(X)}{p(X)}\right] \\[8pt]
&\text{3. Convergence:}\quad \text{Error} = \mathcal{O}(N^{-1/2}) \\[8pt]
&\text{4. Standard Error:}\quad \sigma(\hat{I}_{MC}) \propto \frac{1}{\sqrt{N}}
\end{aligned}
}
$$

These properties make Monte Carlo integration particularly attractive for high-dimensional problems like rendering, where evaluating the rendering equation requires integrating over many dimensions (directions, wavelengths, time, etc.).

### Measuring Error and Efficiency

Every method in the second half of these notes is justified by an error number, so it is worth fixing what those numbers mean before reading them.

Variance is the natural quantity for a Monte Carlo estimator, but it is defined per pixel and against the estimator's own mean. When comparing renderings we instead compare against a converged **reference** image $I^{\text{ref}}$, over all $P$ pixels, writing $\hat{I}_i$ for the estimate of pixel $i$.

**Mean squared error** is the direct choice:

$$
\begin{equation}
\mathrm{MSE} = \frac{1}{P}\sum_{i=1}^{P} \left( \hat{I}_i - I^{\text{ref}}_i \right)^2.
\label{eq:mse}
\end{equation}
$$

MSE has a problem in rendering specifically: it is dominated by bright regions. A fixed absolute error in a highlight of value 100 contributes the same as the same absolute error in a shadowed region of value 0.01, even though the second is far more visible. Since rendered images are high dynamic range, this is not a corner case.

**Relative MSE** divides out the reference intensity:

$$
\begin{equation}
\mathrm{relMSE} = \frac{1}{P}\sum_{i=1}^{P} \frac{\left( \hat{I}_i - I^{\text{ref}}_i \right)^2}{\left(I^{\text{ref}}_i\right)^2 + \epsilon},
\label{eq:relmse}
\end{equation}
$$

with a small $\epsilon$ guarding against division by zero in black pixels. **Mean absolute percentage error** does the same with an absolute difference:

$$
\begin{equation}
\mathrm{MAPE} = \frac{1}{P}\sum_{i=1}^{P} \frac{\lvert \hat{I}_i - I^{\text{ref}}_i \rvert}{I^{\text{ref}}_i + \epsilon}.
\label{eq:mape}
\end{equation}
$$

Both weight dark and bright regions comparably, which is why path-guiding papers report them rather than plain MSE. Which of the two a paper uses matters when comparing across papers: MAPE is less sensitive to a few very wrong pixels than relMSE, because the error is not squared.

**Equal-sample-count versus equal-time.** These are two different questions and a method can win one while losing the other:

*   **Equal sample count** asks how much variance each sample buys. It isolates the quality of the sampling distribution.
*   **Equal time** asks how much variance each second buys. It includes the cost of *producing* the distribution: network inference, tree traversal, mixture fitting.

A method with a better distribution but expensive evaluation loses at equal time while winning at equal sample count. This is exactly the gap [SDMM](#spatio-directional-mixture-models-2022) reports against PPG, and the reason [NIS](#neural-importance-sampling-2019) describes its own overhead as prohibitive in simple scenes.

**Efficiency** combines both into one number:

$$
\begin{equation}
\text{Efficiency} = \frac{1}{\mathbb{V}[\hat{I}] \cdot T},
\label{eq:efficiency}
\end{equation}
$$

where $T$ is the time to compute the estimate. A technique is worth adopting only if it raises this quantity, since halving variance at triple the cost is a loss. This is the quantity [PPG's budget rule](#balancing-learning-and-rendering) implicitly optimizes when it decides how long to keep training, and it is the right lens for reading every comparison table below.


## Importance Sampling

A natural question arises: **what choice of $p(x)$ minimizes the variance?** This is crucial because:

$$
\text{Var}(\hat{I}_{MC}) = \frac{1}{N}\text{Var}\left[\frac{f(X)}{p(X)}\right]
$$

The variance depends directly on how we choose $p(x)$. Can we choose $p(x)$ to make it smaller?

Expanding the variance term:

$$
\begin{aligned}
\operatorname{Var}\!\left[\frac{f(X)}{p(X)}\right]
  &= \mathbb{E}\!\left[\left(\frac{f(X)}{p(X)}\right)^{2}\right]
   -\left(\mathbb{E}\!\left[\frac{f(X)}{p(X)}\right]\right)^{2}
  && \text{[}\operatorname{Var}(Y) = \mathbb{E}[Y^{2}] - \mathbb{E}[Y]^{2}\text{]} \\[6pt]
  &= \mathbb{E}\!\left[\left(\frac{f(X)}{p(X)}\right)^{2}\right] - I^{2}
  && \text{[by }\eqref{eq:mc-unbiased}\text{]}
\end{aligned}
$$

The second term is fixed, being the square of the integral we are computing, so minimizing the variance means minimizing the first:

$$
\begin{aligned}
\mathbb{E}\!\left[\left(\frac{f(X)}{p(X)}\right)^{2}\right]
  &= \int_{\Omega} \frac{f(x)^{2}}{p(x)^{2}}\,p(x)\,\mathrm{d}x
  && \text{[expectation under }p\text{]} \\[6pt]
  &= \int_{\Omega} \frac{f(x)^{2}}{p(x)}\,\mathrm{d}x
  && \text{[cancel one factor of }p\text{]}
\end{aligned}
$$

### The Optimal Choice: $p(x) \propto f(x)$

**Claim**: The variance is **minimized when $p(x)$ is proportional to $f(x)$**.

Let's assume:

$$
p^*(x) = \frac{|f(x)|}{\int_{\Omega} |f(x)|\, dx} = \frac{|f(x)|}{I}
$$

where $I = \int_{\Omega} |f(x)|\, dx$ (assuming $f(x) \geq 0$ for simplicity).

**What happens to the weighted ratio?**

$$
\frac{f(X)}{p^*(X)} = \frac{f(X)}{f(X)/I} = I \quad \text{(constant!)}
$$

Since $\frac{f(X)}{p^*(X)}$ is a constant:

$$
\text{Var}\left[\frac{f(X)}{p^*(X)}\right] = \text{Var}[I] = 0
$$

**This is the best possible case: zero variance!**

**Why this makes intuitive sense.** When $p(x) \propto f(x)$:

- **Regions where $f(x)$ is large**: We sample frequently, so each sample contributes significant information
- **Regions where $f(x)$ is small**: We sample rarely, which is fine because they don't contribute much anyway
- **Result**: Every sample carries roughly equal "importance" to the integral

By contrast, with uniform sampling $p(x) = \text{constant}$:

- We waste samples in regions where $f(x) \approx 0$ (unimportant)
- We don't sample enough where $f(x)$ is large (important)
- The ratio $\frac{f(X)}{p(X)}$ varies wildly, causing high variance

### The Catch

While optimal importance sampling with $p(x) \propto f(x)$ is theoretically perfect, it's **impractical**:

$$
p^*(x) = \frac{f(x)}{\int_{\Omega} f(x)\, dx}
$$

To construct this PDF, we already need to compute the integral we're trying to find! This is circular.

**In practice, we approximate**: Choose $p(x)$ to be proportional to $f(x)$ as best we can:

- In path tracing: $p(x)$ might be proportional to the BRDF and lighting
- In neural importance sampling: Use neural networks to learn $p(x) \approx f(x)$

The better our approximation $p(x) \approx c \cdot f(x)$, the lower the variance.


$$
\boxed{
\begin{aligned}
&\text{Best choice:}\quad p(x) \propto f(x) \Rightarrow \text{Var} = 0 \text{ (ideal)}\\[8pt]
&\text{General principle:}\quad \text{Var}(\hat I_{MC}) = \frac{1}{N}\left(\int_{\Omega} \frac{f(x)^2}{p(x)}\, dx - I^2\right)\\[8pt]
&\text{Practical strategy:}\quad \text{Choose } p(x) \text{ to approximate } f(x) \\[8pt]
&\qquad\qquad\text{Better approximation} \Rightarrow \text{Lower variance} \Rightarrow \text{Fewer samples needed}
\end{aligned}
}
$$

This is why **importance sampling is so powerful**: by choosing $p(x)$ wisely, we can dramatically reduce the number of samples needed to achieve a target accuracy.

{{< 
figure src="/images/path_tracing/sampling/importance_sampling_graph.png"
id="fig-importance-sampling"
caption="Importance Sampling PDF"
width="100%" 
>}}

<iframe src="/interactive/importance_sampling.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="670"
        frameborder="0"
        style="border-radius:8px;">
</iframe>

### What Are We Actually Sampling?

With the theory in place, the question becomes concrete: what *is* $p(x)$ when the integral is the rendering equation? The [alternate formulations](#alternate-formulations-of-the-rendering-equation) each suggest a different answer, because each integrates over a different domain.

Using the **classic surface form**, the domain is the sphere of directions, so $p$ is a density over the next direction $\boldsymbol{\omega}_i$. The zero-variance ideal from above says we want

$$
p(\boldsymbol{\omega}_i) \propto {\class{term-bsdf}{f_r(\mathbf{x}, \boldsymbol{\omega}_i, \boldsymbol{\omega}_o)}}\, {\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega}_i)}}\, (\boldsymbol{\omega}_i \cdot \mathbf{n}),
$$

the whole integrand. Each factor is a different proposition:

*   The <span class="term-bsdf">BSDF</span> and the cosine are **known analytically** at the shading point. Sampling proportional to them is standard and cheap, and is what BSDF sampling does.
*   The <span class="term-light">incident radiance</span> ${\class{term-light}{L_i}}$ is **exactly what we do not know**. Knowing it everywhere would mean having already solved the rendering equation.

So practical samplers approximate one factor and accept a mismatch on the other. BSDF sampling nails the material and ignores where the light is; light sampling nails the emitter and ignores the material. [MIS](#multiple-importance-sampling) combines them. But neither learns anything about ${\class{term-light}{L_i}}$ from the paths already traced, and that is precisely the gap the second half of these notes is about: **path guiding** methods build an approximation of ${\class{term-light}{L_i}}$, or of the full product, from the samples the renderer is generating anyway.

Using the **surface-area form** instead puts $p$ over scene points rather than directions, and using the **path-integral form** puts it over whole paths; the latter is what [Neural Importance Sampling](#primary-sample-space-path-sampling) exploits when it operates in primary sample space.



## Path Tracing

We now have every piece: a formulation of the rendering equation, an unbiased estimator for it, and a criterion for choosing the sampling density. Path tracing is what you get when you assemble them.

**Path tracing** is a rendering algorithm that simulates how light interacts with objects to generate physically plausible images. It is conceptually simple: follow the path of a ray of light through a scene as it interacts with and bounces off objects in an environment. 

With Russian roulette instead of a hard depth limit, it is an unbiased estimator of the rendering equation (the `max_depth` cutoff used in the code below introduces a small bias, see [Russian roulette](#russian-roulette)):

$$
{\class{term-light}{L_o(x, \omega_o)}} = {\class{term-light}{L_e(x, \omega_o)}} + \int_{\Omega} \boxed{\class{term-bsdf}{f_r(x, \omega_i, \omega_o)\;}}{\class{term-light}{L_i(x, \omega_i)}}\; (\omega_i \cdot n)\; d\omega_i
$$

### BxDF Functions
The concept behind all BxDF functions could be described as a black box with the inputs being two directions (which require four angles in total to define in 3D space, e.g., azimuth and elevation for both), one for the incoming (incident) ray and the second one for the outgoing (reflected or transmitted) ray at a given point of the surface. The output of this black box is the ratio of the radiance scattered into the outgoing direction to the irradiance arriving from the incoming direction (units $\mathrm{sr}^{-1}$, so it is a density and can exceed 1) for the given couple of angles


- **(BSDF) Bidirectional Scattering Distribution Function** accounts for
the light transport properties of the hit material. BSDF is a superset and the generalization of the **BRDF** and **BTDF**

- **BRDF (Bidirectional Reflectance Distribution Function)** considers
*only the reflection* of incoming light onto a surface

- **BTDF (Bidirectional Transmittance Distribution Function)** is similar to BRDF but for the opposite side of the surface when it is transmitted through the surface

(Some tend to use the term BSDF simply as a category name covering the whole family of BxDF functions.)

{{< 
figure src="/images/path_tracing/bsdf/BSDF_combined.png"
id="fig-bsdf-combined"
caption="BTDF + BRDF Visualization (uniform for both here)"
width="100%" 
>}}

We usually distinguish three basic material types:

- Perfectly diffuse  (light is scattered equally in/from all directions)
- Perfectly specular (light is reflected in/from exactly one direction)
- Glossy (mixture of the other two, specular highlights)

{{< 
figure src="/images/path_tracing/bsdf/BSDF.png"
id="fig-bsdf-types"
caption="Simple BSDF Visualization for Diffuse, Specular and Glossy Material"
width="100%" 
>}}

{{< 
figure src="/images/path_tracing/bsdf/BSDF_object.png"
id="fig-bsdf-objects"
caption="Objects with BSDF for Diffuse, Specular and Glossy Material"
width="100%" 
>}}


Now that we know about the BxDF functions which define the material properties, we can look at some example BSDF taken from Mitsuba renderer.

{{< 
figure src="/images/path_tracing/bsdf/bsdf_overview.jpg"
id="fig-bsdf-mitsuba"
caption="Schematic overview of the most important surface scattering models in Mitsuba 3. The arrows indicate possible outcomes of an interaction with a surface that has the respective model applied to it."
width="100%" 
>}}

More details on BSDFs can be found in the [Mitsuba 3 BSDF plugin documentation](https://mitsuba.readthedocs.io/en/stable/src/generated/plugins_bsdfs.html) or in [PBRT's reflection models chapter](https://www.pbr-book.org/4ed/Reflection_Models) [[2]](#ref-2).


We can also visualize how they look on hemisphere by using the interactive visualization below. This visualization uses baked bsdf for some materials in the Mitsuba 3 over a hemisphere.

{{< 
fullscreen-iframe 
id="fig-bsdf-eval" 
src="/interactive/bsdf_eval.html" 
height="500" 
>}}


**Mapping the (hemi)sphere to a grid.** 
As the distribution is on a sphere/hemisphere, when using some methods the hemisphere is mapped to a grid which is then predicted by the guiding method. The grid can be discrete/continuous based on methods, but some of the methods for conversion are:

{{< 
fullscreen-iframe 
id="fig-sphere-mapping" 
src="/interactive/sphere_mapping.html" 
height="500" 
>}}


### Path Tracing Algorithm Steps (Recursive)

1. **Generate camera ray** through pixel using sensor
{{< 
figure src="/images/path_tracing/algorithm/steps/init_cam.png"
id="fig-init-camera"
caption="Initialize Scene and Generate Rays using Sensor"
width="100%" 
>}}

2. **Trace ray** into scene, find nearest intersection. **(If miss: return the background/environment radiance; the pseudocode below assumes a black background and returns 0)**.
{{< 
figure src="/images/path_tracing/algorithm/steps/trace.png"
id="fig-trace-ray"
caption="Trace Ray and Find Intersection (Base Case Check)"
width="100%" 
>}}

3. **Initialize Radiance ($L$)** with surface emission (${\class{term-light}{L_e}}$). (Production tracers also add direct lighting here via **next-event estimation (NEE)**, combined with the BSDF-sampled hit through MIS so that light is not counted twice; the pseudocode below omits NEE for clarity.)
4. **Sample BSDF** to choose next direction and **calculate Throughput (color)**.
{{< 
figure src="/images/path_tracing/algorithm/steps/surface_intersection.png"
id="fig-surface-intersection"
caption="Query BSDF and calculate throughput (BSDF * Cos / PDF)"
width="100%" 
>}}

5. **Recursive Call:** Spawn new ray and call `Trace()` function for it.
{{< 
figure src="/images/path_tracing/algorithm/steps/sample_ray.png"
id="fig-sample-ray"
caption="Spawn ray and recurse: `L_in = Trace(new_ray)`"
width="100%" 
>}}

6. **Recursion Depth:** The function continues calling itself until max depth or Russian roulette termination.
{{< 
figure src="/images/path_tracing/algorithm/steps/repeat.png"
id="fig-repeat"
caption="Recursion continues (Logic repeats for new ray)"
width="100%" 
>}}

7. **Return Total Radiance:** Add indirect light to local emission (${\class{term-light}{L_e}} + \text{Throughput} \times L_{in}$) and return result.
{{< 
figure src="/images/path_tracing/algorithm/steps/final_ray.png"
id="fig-final-ray"
caption="Return combined radiance up the stack"
width="100%" 
>}}

Repeat the above process for all pixels (in parallel, as this is embarrassingly parallel) for some amount of **samples per pixel**

{{< 
figure src="/images/path_tracing/algorithm/steps/2spp.png"
id="fig-2spp"
caption="2 Samples Per Pixel"
width="100%" 
>}}

### Path Tracing Steps Overview

{{< step-slider animate="false" noinvert=true >}}
- image: "/images/path_tracing/algorithm/overview/init_cam.png"
  title: "Initialize Camera"
  description: "Initialize the Scene objects, lights and camera"

- image: "/images/path_tracing/algorithm/overview/trace1.png"
  title: "Trace Ray"
  description: "Trace the primary ray through pixel into the scene"

- image: "/images/path_tracing/algorithm/overview/si1.png"
  title: "Surface Intersection and Query BSDF"
  description: "Intersect with the scene geometry and query the info like BSDF (blue) to get material property"

- image: "/images/path_tracing/algorithm/overview/trace2.png"
  title: "Sample Next Ray Direction"
  description: "Use PDF (according to BRDF or some other guiding one) to sample the next ray direction"

- image: "/images/path_tracing/algorithm/overview/si2.png"
  title: "Surface Intersection and Query BSDF"
  description: "Intersect the new ray with the scene and query the BSDF at the second hit point."

- image: "/images/path_tracing/algorithm/overview/trace3.png"
  title: "Sample Next Ray Direction"
  description: "Sample the next direction again from the BSDF (or guiding) PDF at this vertex."

- image: "/images/path_tracing/algorithm/overview/trace3.png"
  title: "Max Depth Reached / Stopping Criterion"
  description: "Query the Light Emitted and backpropagate"

- image: "/images/path_tracing/algorithm/overview/back_1.png"
  title: "Backpropagate the Radiance"
  description: "Query the Light Emitted, add it to incoming radiance and backpropagate "

- image: "/images/path_tracing/algorithm/overview/back_2.png"
  title: "Backpropagate the Radiance"
  description: "Query the Light Emitted, add it to incoming radiance and backpropagate"

- image: "/images/path_tracing/algorithm/overview/back_3.png"
  title: "Backpropagate the Radiance"
  description: "Query the Light Emitted, add it to incoming radiance and backpropagate"
{{< /step-slider >}}


### Interactive Ray Tracer Visualization
{{< 
fullscreen-iframe 
id="rt_iframe" 
src="/interactive/ray_tracing.html" 
height="800" 
>}}

To show a real example, we can see the effects of max depth and samples per pixel in the renders below ({{< figref "fig-bathroom-spp" >}}). All of them are rendered using the PBRT renderer.

{{< 
figure src="/images/path_tracing/scenes/bathroom.png"
id="fig-bathroom-ref"
caption="Bathroom Scene Reference"
width="80%" 
>}}



{{< 
figure src="/images/path_tracing/scenes/bathroom_spp.png"
id="fig-bathroom-spp"
caption="Bathroom Scene Rendered at different spp (samples per pixel)"
width="100%" 
>}}

{{< 
figure src="/images/path_tracing/scenes/bathroom_depth.png"
id="fig-bathroom-depth"
caption="Bathroom Scene Rendered at different depth"
width="100%" 
>}}

### Recursive and Iterative Formulations

| Symbol | Meaning |
|--------|---------|
| $f$ | **Throughput** - cumulative product of BSDF, cosine and PDF terms: $f = \prod_{k=0}^{d-1} \frac{f_r^{(k)}\,\lvert\cos\theta_i^{(k)}\rvert}{p_i^{(k)}}$ (in the code, $f_r$ already includes $\lvert\cos\theta_i\rvert$) |
| $L$ | Accumulated radiance along the path |
| ${\class{term-light}{L_e}}$ | Emitted radiance at surface intersection |
| $\omega_i$ | Sampled direction from BSDF distribution |
| ${\class{term-bsdf}{f_r}}$ | BSDF value: ${\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}$ |
| $p_i$ | PDF of sampled direction |
| $q$ | Russian roulette survival probability |

**Input:** scene, ray, depth, $\text{max\_depth}$, $\text{rr\_depth}$  
**Output:** Radiance ${\class{term-light}{L_o(x, \omega_o)}}$

#### Recursive Formulation

```markdown
function PATHTRACE(scene, ray, depth)
    if depth ≥ max_depth then
        return 0
    end if

    si ← INTERSECT(ray, scene)
    if ¬si.valid() then
        return 0
    end if

    ωₒ ← -ray.d
    Lₑ ← si.emission(ωₒ)
    (ωᵢ, fᵣ, p_ωᵢ) ← BSDF-SAMPLE(si.bsdf, ωₒ) # function implicitly returns (fᵣ​ × ∣cosθ∣)
    β ← fᵣ / p_ωᵢ                             # one-bounce throughput

    if depth ≥ rr_depth then                   # decide BEFORE recursing
        q ← min(1, max(β.r, β.g, β.b))         # survival probability
        if RAND() ≥ q then
            return Lₑ
        end if
        β ← β / q
    end if

    next_ray ← RAY(si.p, ωᵢ)
    Lᵢ ← PATHTRACE(scene, next_ray, depth + 1)

    return Lₑ + β · Lᵢ
end function
```
**Recursion relation:**
$${\class{term-light}{L_o^{(d)}(x, \omega_o)}} = {\class{term-light}{L_e(x, \omega_o)}} + \frac{{\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}} \cdot {\class{term-light}{L_i^{(d+1)}(x, \omega_i)}}}{p(\omega_i)}$$

#### Loop Formulation
A corresponding loop version of the Path Tracing which is better for CUDA is as follows:

```markdown
function PATHTRACE(scene, ray):
    depth ← 0
    f ← 1                # throughput (path weight)
    L ← 0                # accumulated radiance

    while depth < max_depth
        si ← INTERSECT(ray, scene)
        if not si.valid():
            break

        bsdf ← si.bsdf()
        Lₑ ← si.emission()
        L ← L + f * Lₑ   # accumulate emitted radiance

        (ωᵢ, fᵣ, pᵢ) ← BSDF_SAMPLE(bsdf)   # function implicitly returns (fᵣ​ × ∣cosθ∣)
        if pᵢ == 0:
            break

        f ← f * (fᵣ / pᵢ)   # update throughput
        ray ← RAY(si.p, ωᵢ)

        # Russian roulette termination
        if depth ≥ rr_depth:
            q ← min(1, max(f.x, f.y, f.z))   # survival probability
            if RAND() ≥ q:
                break
            f ← f / q

        depth ← depth + 1

    return L
```

**Accumulation relation:**
$${\class{term-light}{L}} = \sum_{d=0}^{\infty} f^{(d)} \cdot {\class{term-light}{L_e^{(d)}}}$$
where $f^{(d)} = \prod_{k=0}^{d-1} \frac{\class{term-bsdf}{f_r^{(k)}}}{p_i^{(k)}}$ (with $f_r$ understood to include $\lvert\cos\theta_i\rvert$, as in the code)

**Equivalence.** 
Both formulations are mathematically equivalent. The recursive form (Alg. 1) naturally expresses the rendering equation recursion, while the iterative form (Alg. 2) is more efficient for GPU implementation:

- **Recursive:** Computes ${\class{term-light}{L_o}}$ by solving the implicit equation directly
- **Iterative:** Unrolls the recursion, accumulating contributions at each bounce with throughput $f$

The loop version materializes the infinite recursion by:
1. Maintaining **throughput** $f$ instead of computing implicit weights
2. **Accumulating** ${\class{term-light}{L_e}}$ contributions at each step (the `L ← L + f * Lₑ` line)
3. **Early termination** via Russian roulette when $f \approx 0$

#### Visualization of both recursive and iterative formulation

{{< step-slider animate="false" noinvert=true >}}
- image: "/images/path_tracing/algorithm/recursion/Slide17.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide18.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide19.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide20.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide21.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide22.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide23.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide24.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide25.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide26.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide27.PNG"
  title: "Recursive Ray Tracing Formulation"
  description: ""
{{< /step-slider >}}

{{< step-slider animate="false" noinvert=true >}}
- image: "/images/path_tracing/algorithm/recursion/Slide28.PNG"
  title: "Iterative Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide29.PNG"
  title: "Iterative Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide30.PNG"
  title: "Iterative Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide31.PNG"
  title: "Iterative Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide32.PNG"
  title: "Iterative Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide33.PNG"
  title: "Iterative Ray Tracing Formulation"
  description: ""

- image: "/images/path_tracing/algorithm/recursion/Slide34.PNG"
  title: "Iterative Ray Tracing Formulation"
  description: ""
{{< /step-slider >}}


#### How it matters for data collection
The recursive formulation provides **direct access to intermediate incoming 
radiance values at each intersection point along the path**. When recursively 
tracing a ray, at each bounce depth $d$, you immediately have:

- ${\class{term-light}{L_i}}^{(d)}$: incoming radiance at intersection $d$
- $\omega_i^{(d)}$: sampled direction at intersection $d$ 
- $x^{(d)}$: surface position and properties

In contrast, the iterative formulation only **accumulates the final radiance 
over the entire path**, computing a single value $L$ by threading throughput 
forward. The incoming radiance at intermediate intersections is never explicitly 
computed or stored.

To extract per-bounce training data from the iterative formulation, you must 
store each vertex's throughput and emitted radiance and run a cheap **reverse accumulation** 
after the path ends (linear in the path length) to recover each vertex's incident radiance.

### Path Tracing Integrator in Mitsuba

Mitsuba 3 is a research-oriented retargetable rendering system, written in portable C++17 on top of the Dr.Jit Just-In-Time compiler.

I am going to use the python bindings of Mitsuba and its components to show how a standard Path Tracer works. First we need to set up all the objects as given in the Assumptions.

First the Sensor/Camera generates the initial rays that we are  going to trace.

```python
class PinholeSensor(mi.Sensor):
    def __init__(self, props):
        super().__init__(props)
        self.m_fov = props.get('fov', 45.0)
        self.m_film = props.get('film')
        self.m_sampler = props.get('sampler')
        self.m_to_world = props.get('to_world', mi.ScalarTransform4f())
    
    def sample_ray(self, time, sample1, sample2, sample3, active=True):
        # sample1: 1D wavelength sample, sample2: 2D film position in [0,1]^2,
        # sample3: 2D aperture sample (unused by a pinhole)
        film_size = self.film().size()
        aspect = film_size[0] / film_size[1]
        
        # Normalized device coordinates (Mitsuba's film y axis points down, so flip y)
        ndc = mi.Vector2f(2.0 * sample2.x - 1.0, 1.0 - 2.0 * sample2.y)
        
        # Camera space direction (vertical fov)
        tan_fov = dr.tan(dr.deg2rad(self.m_fov) * 0.5)
        direction = mi.Vector3f(ndc.x * aspect * tan_fov, ndc.y * tan_fov, -1.0)
        
        # Transform to world space (vectorized transform for JIT variants)
        ray = mi.Transform4f(self.m_to_world) @ mi.Ray3f(o=mi.Point3f(0.0), d=dr.normalize(direction), time=time)
        return ray, mi.Color3f(1.0)
    
    def film(self): return self.m_film
    def sampler(self): return self.m_sampler

mi.register_sensor("pinhole", lambda props: PinholeSensor(props))


```

Then those Rays are Given to the Integrator which then traces the rays through the scene:

```python
class Simple(mi.SamplingIntegrator):
    def __init__(self, props=mi.Properties()):
        super().__init__(props)
        self.max_depth = props.get("max_depth") # Max Depth for Tracing
        self.rr_depth = props.get("rr_depth") # Depth After which Russian Roulette Starts

    def sample(self, scene: mi.Scene, sampler: mi.Sampler, ray_: mi.RayDifferential3f, medium: mi.Medium = None, active: bool = True):
        bsdf_ctx = mi.BSDFContext() # get the bsdf context

        ray = mi.Ray3f(ray_) # Copy the Rays given by the Sensor
        depth = mi.UInt32(0) # Initialize depth to 0
        f = mi.Spectrum(1.)  # initialize throughput to 1 
        L = mi.Spectrum(0.)  # Initialize Radiance to 0

        prev_si = dr.zeros(mi.SurfaceInteraction3f)

        loop = mi.Loop(name="Path Tracing", state=lambda: (
            sampler, ray, depth, f, L, active, prev_si))

        loop.set_max_iterations(self.max_depth)

        while loop(active):
            #  Intersect Ray with the Primitive in the Scene
            si: mi.SurfaceInteraction3f = scene.ray_intersect(
                ray, ray_flags=mi.RayFlags.All, coherent=dr.eq(depth, 0))

            # Get the BSDF of the intersected Primitive
            bsdf: mi.BSDF = si.bsdf(ray)

            # Direct emission
            ds = mi.DirectionSample3f(scene, si=si, ref=prev_si)
            Le = f * ds.emitter.eval(si) # Check if the primitive Emits light
            active_next = (depth + 1 < self.max_depth) & si.is_valid()

            # BSDF Sampling
            bsdf_sample, bsdf_val = bsdf.sample(
                bsdf_ctx, si, sampler.next_1d(), sampler.next_2d(), active_next)

            # Update loop variables
            ray = si.spawn_ray(si.to_world(bsdf_sample.wo))
            L = (L + Le)
            f *= bsdf_val

            prev_si = dr.detach(si, True)

            # Stopping criterion (russian roulette)
            active_next &= dr.neq(dr.max(f), 0)

            # Survival probability, capped below 1 (as in Mitsuba's own path.py)
            rr_prob = dr.minimum(dr.maximum(f.x, dr.maximum(f.y, f.z)), 0.95)
            rr_prob[depth < self.rr_depth] = 1.
            f *= dr.rcp(rr_prob)
            active_next &= (sampler.next_1d() < rr_prob)

            active = active_next
            depth += 1
        return (L, dr.neq(depth, 0), [])

mi.register_integrator("integrator", lambda props: Simple(props))
```


### How to sample Next Ray Direction?
Now the above illustration was using the normalized (or approximation of normalized) BRDF Function as sampling.  But there can be different ways/PDFs in which we can sample the next ray depending on the scene. A rough example is given below:

{{< step-slider animate="false" noinvert=true >}}
- image: "/images/path_tracing/sampling/scene_setup.png"
  title: "Scene Setup"
  description: |
    <div>
    Our scene consists of two <b><span style="color:#ff9900">light sources</span></b> (yellow), a surface with a specific <b><span style="color:#007bff">BRDF</span></b> (light blue lobe) representing the material property, and our chosen <b><span style="color:#a020f0">sampling PDF</span></b> (purple lobe) which dictates the direction of the next ray.
    </div>

- image: "/images/path_tracing/sampling/uniform_pdf.png"
  title: "Uniform Sampling PDF"
  description: |
    <div>
    The simplest strategy is <b><span style="color:#a020f0">Uniform Sampling</span></b>. This defines a constant probability density $p(\omega) = \frac{1}{2\pi}$ across the entire hemisphere $\Omega$, completely ignoring <b><span style="color:#ff9900">lighting</span></b> and <b><span style="color:#007bff">material properties</span></b>.
    </div>

- image: "/images/path_tracing/sampling/uniform_rays.png"
  title: "Uniform Sampling Rays"
  description: |
    <div>
    But since <b><span style="color:#a020f0">Uniform Sampling</span></b> ignores <b><span style="color:#ff9900">lighting</span></b> and <b><span style="color:#007bff">material properties</span></b>, a lot of the samples are wasted
    </div>
    
- image: "/images/path_tracing/sampling/diffuse_light_pdf.png"
  title: "Direct Light Sampling PDF"
  description: |
    <div>
    We can improve this using <b><span style="color:#a020f0">Direct Light Sampling</span></b> (Next Event Estimation) PDF. Here, the <b><span style="color:#a020f0">PDF</span></b> is non-zero only in directions pointing toward the <b><span style="color:#ff9900">light sources</span></b>, proportional to their power.
    </div>

- image: "/images/path_tracing/sampling/diffuse_light_rays.png"
  title: "(Diffuse) Direct Light Sampling Rays"
  description: |
    <div>
    <b><span style="color:#a020f0">Direct Light Sampling</span></b> works exceptionally well for <b>Diffuse Materials</b>. Since diffuse surfaces reflect light equally in all directions, hitting the <b><span style="color:#ff9900">light source</span></b> is the only thing that matters for reducing variance.
    </div>

- image: "/images/path_tracing/sampling/glossy_light_pdf.png"
  title: "(Glossy) Direct Light Sampling PDF"
  description: |
    <div>
    If the material is <b>Glossy</b>, the <b><span style="color:#007bff">BRDF</span></b> becomes a narrow lobe. Even if we hit a <b><span style="color:#ff9900">light source</span></b>, if that light isn't in the direction the material reflects, the contribution is multiplied by a near-zero <b><span style="color:#007bff">BRDF</span></b> value.
    </div>

- image: "/images/path_tracing/sampling/glossy_light_rays.png"
  title: "(Glossy) Direct Light Sampling Rays"
  description: |
    <div>
    In this glossy case, <b><span style="color:#a020f0">Direct Light Sampling</span></b> is actually inefficient. We are successfully hitting the <b><span style="color:#ff9900">lights</span></b>, but those samples are <b>wasted</b> because the material property prevents that light from reaching the camera.
    </div>

- image: "/images/path_tracing/sampling/glossy_brdf_pdf.png"
  title: "(Glossy) BRDF Sampling PDF"
  description: |
    <div>
    To fix this, we use <b><span style="color:#a020f0">BRDF Sampling</span></b>. We align our <b><span style="color:#a020f0">PDF</span></b> with the <b><span style="color:#007bff">material's reflection lobe</span></b>. This ensures we only sample directions where the surface is physically capable of reflecting radiance.
    </div>

- image: "/images/path_tracing/sampling/glossy_brdf_rays.png"
  title: "(Glossy) BRDF Sampling Rays"
  description: |
    <div>
    By prioritizing directions where the <b><span style="color:#007bff">BRDF</span></b> is large, we ensure that every ray we cast has a high potential to contribute to the final pixel color, significantly reducing <b>variance</b> for glossy reflections.
    </div>

{{< /step-slider >}}

In the above example, we see that for different scene or materials, different kind of PDF $p(x)$ are better choice. The two compared above are {{< figref "fig-pdf-bsdf" >}} and {{< figref "fig-pdf-nee" >}}: 

<div style="display:flex; justify-content:center; gap:20px;">

  <div style="flex:1; text-align:center;">
    {{< 
    figure src="/images/path_tracing/sampling/bsdf.png"
    id="fig-pdf-bsdf"
    caption="Diffuse BRDF PDF (Cosine Weighted)"
    width="100%" 
    >}}
  </div>

  <div style="flex:1; text-align:center;">
    {{< 
    figure src="/images/path_tracing/sampling/nee.png"
    id="fig-pdf-nee"
    caption="Next Event Estimation PDF"
    width="100%" 
    >}}
  </div>

</div>

Now we can use these different sampling strategies, but the problem is for some parts of the scene one strategy is better whereas for other parts, the other strategy could be better. In case of the multiple sampling strategies, what to do?

### Examples using a pair of scenes

I have used some renders from this [excellent blog post](https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html) on multiple importance sampling by **Nikita Lisitsa** [[17]](#ref-17).

Pair of scenes: one (on the left) with a diffuse plane and a small light source, another (on the right) with a metallic plane and a large light source.
One simple choice that works for diffuse materials (whose BRDF is constant) is to ignore $L_{in}$ and sample proportional to $(\omega_{in}\cdot n)$.
Both scenes are rendered with 64 spp, with uniform sampling as well as cosine weighted sampling:

<div style="display:flex; justify-content:center; gap:20px;">

  <div style="flex:1; text-align:center;">
    {{< dlider
      before="/images/path_tracing/mis/diffuse-uniform-64.png"
      after="/images/path_tracing/mis/diffuse-cosine-64.png"
      caption="Uniform Sampling vs. Cosine Weighted Sampling"
      width="100%"
      beforeLabel="Uniform Sampling"
      afterLabel="Cosine Weighted Sampling"
    >}}
  </div>

  <div style="flex:1; text-align:center;">
      {{< dlider
      before="/images/path_tracing/mis/metallic-uniform-64.png"
      after="/images/path_tracing/mis/metallic-cosine-64.png"
      caption="Uniform Sampling vs. Cosine Weighted Sampling"
      width="100%"
      beforeLabel="Uniform Sampling"
      afterLabel="Cosine Weighted Sampling"
    >}}
  </div>

</div>
<div style="text-align:center; font-size:0.9em; margin-bottom:20px; color:#666;">
  Images by <a href="https://lisyarus.github.io">Nikita Lisitsa</a> from this <a href="https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html">blog</a> <a href="#ref-17">[17]</a>
</div>

However, it helps little with either the diffuse plane or the metallic surface. In these cases, both the uniform distribution and the cosine-weighted one poorly approximate the integrated function

- For the diffuse surface, they are good approximations of the BRDF term, but they poorly approximate the incoming light since the light comes only from a handful of directions pointing to the small sphere 
- For the metallic surface, they are OK approximations of the incoming light (which now comes from a lot of directions, because the light source is quite big), but they are poor approximations of the BRDF term, which for nice polished metals wants to reflect light only in a certain direction, and not in a random one

Thus, we can use the following sampling strategies for the scenes respectively:
- Send random directions directly to the light source! This is called direct light sampling, or light importance sampling, or just light sampling
- For the metallic plane we can sample the microfacet BSDF itself: draw a microfacet normal from the **distribution of visible normals (VNDF)** and reflect $\omega_o$ about it. This concentrates rays around the mirror direction in proportion to the glossy lobe

<div style="display:flex; justify-content:center; gap:20px;">
  <div style="flex:1; text-align:center;">
    {{< dlider
      before="/images/path_tracing/mis/diffuse-uniform-64.png"
      after="/images/path_tracing/mis/diffuse-light-64.png"
      caption="Uniform Sampling vs. Direct Light Sampling"
      width="100%"
      beforeLabel="Uniform Sampling"
      afterLabel="Direct Light Sampling"
    >}}
  </div>
  <div style="flex:1; text-align:center;">
      {{< dlider
      before="/images/path_tracing/mis/metallic-uniform-64.png"
      after="/images/path_tracing/mis/metallic-vndf-64.png"
      caption="Uniform Sampling vs. VNDF Sampling"
      width="100%"
      beforeLabel="Uniform Sampling"
      afterLabel="VNDF Sampling"
    >}}
  </div>

</div>
<div style="text-align:center; font-size:0.9em; margin-bottom:20px; color:#666;">
  Images by <a href="https://lisyarus.github.io">Nikita Lisitsa</a> from this <a href="https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html">blog</a> <a href="#ref-17">[17]</a>
</div>

## Multiple Importance Sampling

### Product Function Integral

The sampling strategies above each match *one* factor of the integrand. That is the crux of the problem, and it is worth isolating before introducing the fix.

We are frequently faced with integrals that are a product of two or more functions, $\int f_a(x) f_b(x)\, \mathrm{d}x$. It is often possible to derive sampling strategies for the individual factors, but not one that matches their product. This situation is especially common in light transport, where the integrand is the product of the <span class="term-bsdf">BSDF</span>, the <span class="term-light">incident radiance</span> and a cosine factor.

To understand the challenge, assume for now the good fortune of having two sampling distributions $p_a$ and $p_b$ that match the distributions of $f_a$ and $f_b$ exactly (in practice this will not normally be the case). With Monte Carlo estimator, we have two options:

Sample using $p_a$, which gives estimator:

$$
\frac{f(X)}{p_a(X)} = cf_b(X)
$$
where $c$ is a constant equal to the integral of $f_a$, since $p_a(x) \propto f_a(x)$. The variance of this estimator is proportional to the variance of $f_b$, which may itself be high. Conversely, we might sample from $p_b$, though doing so gives us an estimator with variance proportional to the variance of $f_a$, which may similarly be high. In the more common case where the sampling distributions only approximately match one of the factors, the situation is usually even worse.

Unfortunately, the obvious solution of taking some samples from each distribution and averaging the two estimators is not much better. Because variance is additive, once variance has crept into an estimator, we cannot eliminate it by adding it to another low-variance estimator. 

#### MIS Motivating Example

The following is a Cornell Box scene with all diffuse materials. The sampling is done in following ways
- Uniform Sampling
- Cosine Weighted Sampling
- Direct Light Sampling
- MIS (Cosine Weighted + Direct Light Sampling)
- "Wrong" MIS (random choice between the two, without MIS weights)

In the Cornell box scene, we have a lot of diffuse light spreading around the scene, and using just direct light sampling produces a wrong image. The reason is that the requirement $f(x)>0 \Rightarrow p(x)>0$ is not fulfilled for this distribution: there are a lot of directions with non-zero values of our integrated function (namely, the diffuse reflections of light by the objects in the scene), but the distribution only samples a certain subset of directions (those leading directly to a light source).

So, we have a bunch of sampling strategies (i.e. a bunch of distributions), and each of them works in some cases and doesn't work in other cases. 

How can we combine several distributions at once? One obvious way would be to, say, each time we generate a sample, select one of the distributions at random and just use it in our calculations.

For example, if we have two distributions $p_1(x)$ and $p_2(x)$, we flip a fair coin, and with probability 1/2 our estimator is either $\frac{f(X)}{p_1(X)}$ or $\frac{f(X)}{p_2(X)}$. Using cosine-weighted distribution for p1, and direct light sampling for p2, we get the **Wrong MIS** (given below). This is biased: its expectation is $\tfrac12 I + \tfrac12\int_{p_2>0} f$, and light sampling misses all indirect light. The correct one-sample combination divides by the mixture density, $f(X)/(\tfrac12 p_1(X)+\tfrac12 p_2(X))$, which is exactly the balance heuristic below.

<div style="display:flex; justify-content:center; gap:20px;">

  <div style="flex:1; text-align:center;">
    {{< dlider
      before="/images/path_tracing/mis/box-uniform-64.png"
      after="/images/path_tracing/mis/box-cosine-64.png"
      caption="Uniform Sampling vs. Cosine Weighted Sampling"
      width="100%"
      beforeLabel="Uniform Sampling"
      afterLabel="Cosine Weighted Sampling"
    >}}
  </div>

  <div style="flex:1; text-align:center;">
      {{< dlider
      before="/images/path_tracing/mis/box-cosine-64.png"
      after="/images/path_tracing/mis/box-mis-64.png"
      caption="Cosine Weighted Sampling vs. MIS (Cosine Weighted and Direct Light Sampling)"
      width="100%"
      beforeLabel="Cosine Weighted Sampling"
      afterLabel="MIS"
    >}}

  </div>

</div>

<div style="display:flex; justify-content:center; gap:20px;">

  <div style="flex:1; text-align:center;">
    {{< dlider
      before="/images/path_tracing/mis/box-uniform-64.png"
      after="/images/path_tracing/mis/box-light-64.png"
      caption="Uniform Sampling vs. Direct Light Sampling"
      width="100%"
      beforeLabel="Uniform Sampling"
      afterLabel="Direct Light Sampling"
    >}}
  </div>

  <div style="flex:1; text-align:center;">
      {{< dlider
      before="/images/path_tracing/mis/box-mis-wrong-64.png"
      after="/images/path_tracing/mis/box-mis-64.png"
      caption="MIS Wrong vs. MIS (Cosine Weighted and Direct Light Sampling)"
      width="100%"
      beforeLabel="MIS Wrong"
      afterLabel="MIS"
    >}}

  </div>

</div>

<div style="text-align:center; font-size:0.9em; margin-bottom:20px; color:#666;">
  Images by <a href="https://lisyarus.github.io">Nikita Lisitsa</a> from this <a href="https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html">blog</a> <a href="#ref-17">[17]</a>
</div>


To get a correct combination of these pdf we have Multiple Importance Sampling

### The Balance and Power Heuristics

Multiple importance sampling (MIS) addresses exactly this issue, with an easy-to-implement variance reduction technique

The basic idea is that, when estimating an integral, we should draw samples from multiple sampling distributions, chosen in the hope that at least one of them will match the shape of the integrand reasonably well, even if we do not know which one this will be. MIS then provides a method to weight the samples from each technique that can eliminate large variance spikes due to mismatches between the integrand’s value and the sampling density. 

> **Definition - Multiple Importance Sampling**
> 
> With two sampling distributions $p_a$ and $p_b$ and a single sample taken from each one, $X\sim p_a$ and $Y\sim p_b$, the MIS Monte Carlo Estimator is defined as:
>$$w_a(X)\frac{f(X)}{p_a(X)} + w_b(Y)\frac{f(Y)}{p_b(Y)}$$
>
>where $w_a$ and $w_b$ are weighting functions chosen such that the expected value of this estimator is the value of integral of $f(x)$
>
> More generally, given $n$ sampling distributions $p_i$ with $n_i$ samples $X_{i,j}$ taken from the $i$-th  distribution, the MIS Monte Carlo estimator is:
$$F_n = \sum_{i=1}^{n}\frac{1}{n_i}\sum_{j=1}^{n_i}w_i(X_{i, j}) \frac{f(X_{i, j})}{p_i(X_{i, j})}$$

The full set of conditions on the weighting functions for the estimator to be unbiased are that they sum to 1 when $f(x)\neq 0$, $\sum_{i=1}^{n}w_i(x)=1$ and that $w_i(x)=0$ if $p_i(x)=0$.

In practice, a good choice for the weighting functions is given by the **balance heuristic**, which attempts to fulfill this goal by taking into account all the different ways that a sample could have been generated, rather than just the particular one that was used to do so. The balance heuristic's weighting function for the $i$-th sampling technique is:

$$
w_i(x) = \frac{n_ip_i(x)}{\sum_j n_j p_j(x)}
$$

The **power heuristic** often reduces variance even further. For an exponent $\beta$, the power heuristic is 

$$
w_i(x) = \frac{(n_ip_i(x))^\beta}{\sum_j (n_j p_j(x))^\beta}
$$


<iframe src="/interactive/mis.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="660"
        frameborder="0"
        style="border-radius:8px;">
</iframe>


{{< dlider
before="/images/path_tracing/mis/box-uniform-64.png"
after="/images/path_tracing/mis/box-mis-64.png"
caption="Uniform Sampling vs. MIS (Cosine Weighted and Direct Light Sampling)"
width="60%"
beforeLabel="Uniform Sampling"
afterLabel="MIS"
>}}

<div style="text-align:center; font-size:0.9em; margin-bottom:20px; color:#666;">
  Images by <a href="https://lisyarus.github.io">Nikita Lisitsa</a> from this <a href="https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html">blog</a> <a href="#ref-17">[17]</a>
</div>

### Russian Roulette

There is a problem left over from the [Neumann series](#neumann-series-expansion): the expansion has infinitely many terms, so a path could in principle bounce forever. Truncating at a fixed depth is simple but **biased**, because it throws away all the energy beyond that depth. Russian roulette removes the bias while still terminating.

It improves efficiency by skipping the evaluation of samples that would make a small contribution to the final result, at the cost of adding variance to the ones it keeps.

Select a survival probability $q$ (the same $q$ as in the path tracing pseudocode above). With probability $1-q$, terminate and contribute $c = 0$. With probability $q$, continue and weight by $\frac{1}{q}$:

$$
\boxed{
\hat{I}_{RR} = 
\begin{cases}
0 & \text{with probability } 1-q \\
\frac{\hat{I}_{MC}}{q} & \text{with probability } q
\end{cases}
}
$$

**Unbiasedness.**

$$
\mathbb{E}[\hat{I}_{RR}] = (1-q) \cdot 0 + q \cdot \frac{1}{q} \mathbb{E}[\hat{I}_{MC}] = \mathbb{E}[\hat{I}_{MC}] = I
$$

The estimator remains unbiased despite skipping samples: the surviving paths are scaled up by exactly enough to compensate for the ones that were killed.

**Choosing $q$.** The survival probability is not arbitrary. Since the point is to kill paths that contribute little, $q$ is chosen from the **path throughput** $f$, the running product of BSDF-over-PDF factors accumulated so far. A common choice is to continue with probability $q = \min(1, \max(f_r, f_g, f_b))$, so a path whose throughput has decayed to $0.1$ survives with probability $0.1$ and is boosted by $10\times$ if it does. Paths carrying full energy are never killed.

**The trade-off.** Russian roulette always *increases* variance, since it replaces a certain contribution with a random one of the same mean. It pays off because it reduces the expected cost per path by more than it raises variance, which is a win in the [efficiency](#measuring-error-and-efficiency) sense defined above. Applying it too aggressively, with survival probability $q$ near 0, produces the characteristic bright-speckle noise of a few surviving paths carrying enormous weights.

Russian roulette reappears in the second half: PPG adopts **adjoint-based** Russian roulette, where the termination probability additionally accounts for how much light the path is expected to find.

Next, we move from combining directions to combining whole paths.


### Combining Multiple Paths
We now have looked at different methods of combining different samples. We can now look at the [path integral formulation](#path-integral-formulation-of-light-transport) and look at individual paths instead of the next direction. We can observe that we can construct paths using multiple techniques and also combine all of them as visualized below. I've used the images from the [CMU 15-468: Physically Based Rendering and Advanced Image Synthesis](https://graphics.cs.cmu.edu/courses/15-468/2024_spring) course webpage [[18]](#ref-18), which can be referred to for more details.


In these slides (from CMU 15-468), $\mathbf{x}_0$ is the camera vertex and $\mathbf{x}_3$ the light vertex, the reverse of the path-integral notation above.

{{< step-slider animate="false" noinvert=true >}}
- image: "/images/path_tracing/paths/pt.png"
  title: "Path Construction: Path Tracing without NEE"
  description: |
    <div class="eq-stack" style="font-size: 0.8em;">
    <b>Path Probability Density (Joint PDF for Path Vertices):</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0, \mathbf{x}_1, \cdots, \mathbf{x}_{k-1}, \mathbf{x}_k)
    \end{aligned}
    $$
    <b>Path Probability Density:</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0) \\
    &\quad \times p(\mathbf{x}_1|\mathbf{x}_0) \\
    &\quad \times p(\mathbf{x}_2|\mathbf{x}_0\mathbf{x}_1) \\
    &\quad \times p(\mathbf{x}_3|\mathbf{x}_0\mathbf{x}_1\mathbf{x}_2)
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/paths/pt_nee.png"
  title: "Path Construction: Path Tracing with NEE"
  description: |
    <div class="eq-stack" style="font-size: 0.8em;">
    <b>Path Probability Density (Joint PDF for Path Vertices):</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0, \mathbf{x}_1, \cdots, \mathbf{x}_{k-1}, \mathbf{x}_k)
    \end{aligned}
    $$
    <b>Path Probability Density:</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0) \\
    &\quad \times p(\mathbf{x}_1|\mathbf{x}_0) \\
    &\quad \times p(\mathbf{x}_2|\mathbf{x}_0\mathbf{x}_1) \\
    &\quad \times p(\mathbf{x}_3) \rlap{\quad \text{(assuming uniform area sampling)}}
    \end{aligned}
    $$
    </div>
  
- image: "/images/path_tracing/paths/lt.png"
  title: "Path Construction: Light Tracing without NEE"
  description: |
    <div class="eq-stack" style="font-size: 0.8em;">
    <b>Path Probability Density (Joint PDF for Path Vertices):</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0, \mathbf{x}_1, \cdots, \mathbf{x}_{k-1}, \mathbf{x}_k)
    \end{aligned}
    $$
    <b>Path Probability Density:</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0|\mathbf{x}_3\mathbf{x}_2\mathbf{x}_1) \\
    &\quad \times p(\mathbf{x}_1|\mathbf{x}_3\mathbf{x}_2) \\
    &\quad \times p(\mathbf{x}_2|\mathbf{x}_3) \\
    &\quad \times p(\mathbf{x}_3)
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/paths/lt_nee.png"
  title: "Path Construction: Light Tracing with NEE"
  description: |
    <div class="eq-stack" style="font-size: 0.8em;">
    <b>Path Probability Density (Joint PDF for Path Vertices):</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0, \mathbf{x}_1, \cdots, \mathbf{x}_{k-1}, \mathbf{x}_k)
    \end{aligned}
    $$
    <b>Path Probability Density:</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0) \rlap{\quad \text{(assuming uniform aperture sampling)}} \\
    &\quad \times p(\mathbf{x}_1|\mathbf{x}_3\mathbf{x}_2) \\
    &\quad \times p(\mathbf{x}_2|\mathbf{x}_3) \\
    &\quad \times p(\mathbf{x}_3)
    \end{aligned}
    $$
    </div>

- image: "/images/path_tracing/paths/independent.png"
  title: "Path Construction: Independent Path Vertices"
  description: |
    <div class="eq-stack" style="font-size: 1em;">
    <b>Path Probability Density (Joint PDF for Path Vertices):</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0, \mathbf{x}_1, \cdots, \mathbf{x}_{k-1}, \mathbf{x}_k)
    \end{aligned}
    $$
    <b>Path Probability Density:</b>
    $$
    \Large
    \begin{aligned}
    p(\bar{\mathbf{x}}) &= p(\mathbf{x}_0)\\
    &\quad \times p(\mathbf{x}_1) \\
    &\quad \times p(\mathbf{x}_2) \\
    &\quad \times p(\mathbf{x}_3)
    \end{aligned}
    $$
    </div>
  
{{< /step-slider >}}

We have seen how individual paths are constructed using different techniques, we can combine all of them (using NEE at every vertex) and construct many paths using only a few vertices.

{{< 
figure src="/images/path_tracing/paths/all_paths.png"
id="fig-all-paths"
caption="All the Paths (NEE + Path Tracing + Light Tracing)"
width="100%" 
>}}

| Symbol | Meaning |
|--------|---------|
| $t$ | Number of vertices on camera subpath |
| $s$ | Number of vertices on light subpath |
| $s\cdot t$ | Number of vertex-to-vertex connections (each strategy $(s,t)$ uses exactly one connecting edge; a path with $k$ edges can be built by $k+2$ strategies) |

{{< 
figure src="/images/path_tracing/paths/combination.png"
id="fig-all-combinations"
caption="All combination of Paths (NEE + Path Tracing + Light Tracing)"
width="100%" 
>}}

Everything so far has treated the sampling distribution as something we *design*: cosine-weighted, BSDF-proportional, light-area-proportional, combined with MIS. Each of those is a fixed analytic guess at one factor of the integrand, chosen before any rendering happens, and none of them improves as the renderer learns about the scene.

But a path tracer generates an enormous amount of information about where the light actually is, since every path it traces is a measurement of ${\class{term-light}{L_i}}$, and then discards it. The rest of these notes is about methods that keep it.

## Advances in Importance Sampling

The techniques we've covered (importance sampling, MIS, Russian roulette) all rely on choosing good sampling distributions. We used some fixed examples: BRDF sampling, direct light sampling, and [VNDF](https://en.wikipedia.org/wiki/Specular_highlight#Microfacets) sampling. Now we will take a look at some methods which try to <b>learn these distributions</b> using the samples generated during rendering.


Learning-based methods (several of them neural) learn these distributions from data, enabling near-optimal importance sampling in complex scenes. The papers below represent the evolution of this idea of choosing/designing $p(x)$ carefully.

| Paper | Venue | What it learns | Reference |
|---|---|---|---|
| Practical Path Guiding | EGSR (2017) | Incident radiance $\hat{L}$, in an SD-tree | [[4]](#ref-4) |
| Offline Deep Importance Sampling | Pacific Graphics (2019) | Per-pixel first-bounce incident-radiance sampling maps, reconstructed by a CNN (trained offline) from a few initial samples | [[5]](#ref-5) |
| Neural Importance Sampling | ACM TOG (2019) | The full product, as a normalizing flow | [[6]](#ref-6) |
| Real-Time Neural Radiance Caching | ACM TOG (2021) | Scattered radiance ${\class{term-light}{L_s}}$, for path termination | [[7]](#ref-7) |
| Path Guiding Using Spatio-Directional Mixture Models | CGF (2022) | Incident radiance, as a 5D mixture | [[3]](#ref-3) |
| Neural Parametric Mixtures | SIGGRAPH (2023) | vMF mixture parameters, from a spatial embedding | [[8]](#ref-8) |
| Online Neural Path Guiding with NASG | ACM TOG (2024) | Anisotropic spherical Gaussian mixtures | [[16]](#ref-16) |
| Real-Time Path Guiding Using Bounding Voxel Sampling | ACM TOG (2024) | A global 3D irradiance field over bounding voxels | [[21]](#ref-21) |
| Neural Product Importance Sampling via Warp Composition | SIGGRAPH Asia (2024) | A composed warp: emitter flow ∘ conditional flow | [[9]](#ref-9) |
| Neural Path Guiding with Distribution Factorization | EGSR (2025) | Two 1D PDFs, a marginal and a conditional | [[10]](#ref-10) |

The KAIST CS580 *Neural Rendering* course notes [[15]](#ref-15) cover several of these in lecture form. While a lot more methods have emerged (not necessarily neural), I will add them once I read them in detail and the above papers are what I feel cover a good amount of methods over the years from foundational to recent methods.

The sections below follow that chronology. A recurring question is worth keeping in view while reading them: **what exactly is being learned?** Every method here is trying to approximate some part of the numerator of the reflection estimator

$$
\langle {\class{term-light}{L_r}} \rangle = \frac{1}{N}\sum_{j=1}^{N}
\frac{{\class{term-light}{L(x, \boldsymbol{\omega}_j)}}\; {\class{term-bsdf}{f_s(x, \boldsymbol{\omega}_o, \boldsymbol{\omega}_j)}}\; \lvert\cos\theta_j\rvert}{p(\boldsymbol{\omega}_j \mid x, \boldsymbol{\omega}_o)},
$$

and they differ mainly in *which factor* they model and *how* they represent it. Methods that learn only <span class="term-light">incident radiance</span> must still combine with BSDF sampling through MIS; methods that learn the <span class="term-light">radiance</span>&#8239;&times;&#8239;<span class="term-bsdf">BSDF</span> product aim directly at the zero-variance ideal but face a harder fitting problem.


### Practical Path Guiding (2017)

#### Problem Statement

The amount of radiance ${\class{term-light}{L_o(x, \vec{\omega}_o)}}$ leaving point $x$ in direction $\vec{\omega}_o$ is quantified by the rendering equation [[1]](#ref-1):

$$
\begin{equation}
{\class{term-light}{L_o(x, \vec{\omega}_o)}} = {\class{term-light}{L_e(x, \vec{\omega}_o)}} + \int_\Omega {\class{term-light}{L(x, \vec{\omega})}}\, {\class{term-bsdf}{f_s(x, \vec{\omega}_o, \vec{\omega})}} \cos\theta \, \mathrm{d}\vec{\omega},
\label{eq:ppg-re}
\end{equation}
$$

where ${\class{term-light}{L_e(x, \vec{\omega}_o)}}$ is radiance emitted from $x$ in $\vec{\omega}_o$, ${\class{term-light}{L(x, \vec{\omega})}}$ is radiance incident at $x$ from $\vec{\omega}$, and ${\class{term-bsdf}{f_s}}$ is the bidirectional scattering distribution function. The reflection integral ${\class{term-light}{L_r}}$ is estimated numerically using $N$ samples with the Monte Carlo estimator

$$
\begin{equation}
\langle {\class{term-light}{L_r}} \rangle = \frac{1}{N} \sum_{j=1}^{N} \frac{{\class{term-light}{L(x, \vec{\omega}_j)}}\, {\class{term-bsdf}{f_s(x, \vec{\omega}_o, \vec{\omega}_j)}} \cos\theta_j}{p(\vec{\omega}_j \mid x, \vec{\omega}_o)}.
\label{eq:ppg-estimator}
\end{equation}
$$

The variance $\mathbb{V}[\langle {\class{term-light}{L_r}} \rangle]$ is proportional to $1/N$ and can be reduced by drawing $\vec{\omega}_j$ from a PDF $p(\vec{\omega}_j \mid x, \vec{\omega}_o)$ that resembles the shape of the numerator. If the PDF differs from the numerator only by a scaling factor, then $\mathbb{V}[\langle {\class{term-light}{L_r}}\rangle] = 0$. The BSDF and the cosine term can be approximated relatively well even in the general case; finding efficient means to quantify and represent the incident radiance field, and using it for importance sampling, is the harder part.

Previous guiding work stored this field as spatially cached histograms, cones, or Gaussian mixtures. Müller et al. [[4]](#ref-4) instead store a discrete approximation of the scene's 5D light field using an adaptive spatio-directional tree (**SD-tree**). They adopt adjoint-based Russian roulette and progressive reinforcement learning, while fusing the rendering and learning algorithms into one, and split the learning procedure into distinct passes, each guided by the previous pass, in such a way that each pass remains unbiased.

#### Path Guiding with SD-Trees

Reinforcement learning is used to construct a discrete approximation of the incident radiance field, denoted $\hat{L}$. The field is represented by an SD-tree and iteratively improved with a geometrically increasing compute budget, doubling the number of samples across iterations.

The SD-tree consists of an upper part, a binary tree that partitions the 3D spatial domain of the light field, and a lower part, a quadtree that partitions the 2D directional domain.

{{< figure src="/images/path_tracing/ppg/sdtree.svg" id="fig-ppg-sdtree" caption="The spatio-directional subdivision scheme of the SD-tree. Space is adaptively partitioned by a binary tree (a) that alternates between splitting the $x$, $y$, and $z$ dimension in half. Each leaf node of the spatial binary tree contains a quadtree (b), which approximates the spherical radiance field as an adaptively refined piecewise-constant function. (Image by Müller et al. [[4]](#ref-4))" width="100%" >}}

Two SD-trees are always maintained: one for guiding the construction of light paths and another for collecting MC estimates of incident radiance. In iteration $k$, incident radiance is importance-sampled using the previously populated $\hat{L}_{k-1}$, and estimates of ${\class{term-light}{L(x, \vec{\omega})}}$ are splatted into $\hat{L}_k$. When iteration $k$ is completed, $\hat{L}_{k-1}$ is dropped and the information in $\hat{L}_k$ is used to prepare an empty SD-tree $\hat{L}_{k+1}$ for collecting estimates in the next iteration.

##### Collecting Estimates of $L$

When a complete path is formed, the algorithm iterates over all its vertices and splats the MC estimate of incident radiance into $\hat{L}_k$. For vertex $v$ with radiance estimate ${\class{term-light}{L(x_v, \vec{\omega}_v)}}$:

1. A **spatial search** descends through the binary tree to find the leaf node that contains position $x_v$. The leaf node stores a reference to a quadtree.
2. Traversal continues in the **directional domain** by descending through that quadtree, entering only nodes that contain $\vec{\omega}_v$.
3. The estimate ${\class{term-light}{L(x_v, \vec{\omega}_v)}}$ is deposited in **all nodes visited during the descent**.

The two dimensions of the quadtree parameterize the full sphere of directions; world-space cylindrical coordinates are used to preserve area ratios when transforming between the primary and directional domain. When all radiance estimates in the current iteration have been deposited, the nodes of the quadtrees estimate the total incident radiance arriving through the spherical region corresponding to their extent.

##### Adaptive Spatial Binary Tree

The depth and structure of the binary tree determines how refined and adaptive the approximation of the spatial component of the light field is. To keep refinement straightforward, the $x$, $y$, and $z$ axes are alternated and the node is always split in the middle. The decision whether to split is driven only by the number of path vertices that were recorded in the volume of the node in the previous iteration; a counter is maintained for each leaf node during path tracing.

A node is split if there have been at least $c \cdot \sqrt{2^k}$ path vertices, where $2^k$ is proportional to the amount of traced paths in the $k$-th iteration and $c$ is derived from the resolution of the quadtrees. Post subdivision, all leaves contain roughly $c \cdot \sqrt{2^k}$ path vertices. Therefore the total amount of leaf nodes is proportional to

$$
\frac{2^k}{c \cdot \sqrt{2^k}} = \frac{\sqrt{2^k}}{c}.
$$

The threshold ensures that the total number of leaf nodes and the amount of samples in each leaf both grow at the same rate $\sqrt{2^k}$ across iterations. The constant $c$ trades off convergence of the directional quadtrees with spatial resolution of the binary tree.

Refining the tree based only on the number of samples performs well because the iteratively learned distributions guide paths into regions with high contributions to the image; these thus get refined more aggressively than low-contribution regions. Having a coarser radiance-function approximation in regions that receive fewer paths is tolerable, because the increase in relative noise is generally counteracted by the smaller contribution of such paths.

{{< figure
src="/images/path_tracing/ppg/octree.svg"
id="fig-ppg-spatial-tree"
caption="Space is adaptively partitioned by a binary tree that alternates between splitting the $x$, $y$, and $z$ dimension in half. The highlighted leaf is the spatial node whose directional quadtree is shown below. (Detail of the SD-tree figure above; image by Müller et al. [[4]](#ref-4))"
width="60%"
>}}

##### Adaptive Directional Quadtree

In addition to splitting the binary tree, all quadtrees are rebuilt after each iteration to better reflect the learned directional distribution of radiance; the new quadtrees are used for collecting estimates in the next iteration. The structure of each new quadtree is driven by the directional distribution of flux collected in the last iteration. First, either the leaf's old quadtree is copied, or the quadtree of its parent if the leaf node is new.

The goal is to adapt the subdivision of the copied quadtree so that each leaf contains no more than 1% of the flux collected in the old quadtree. The copied quadtree is descended and its nodes are subdivided only if the fraction of collected flux flowing through the node is larger than $\rho = 0.01$, i.e. if $\Phi_n / \Phi > \rho$, where $\Phi$ is the total flux flowing through the quadtree and $\Phi_n$ is the flux flowing through the node in question. When subdividing a node, a quarter of its flux is assigned to each newly created child, and the subdivision criterion is applied recursively. At the same time, the criterion is evaluated at every existing interior node, and its children are pruned if the criterion is not met.

Spherical regions with high incident flux are thus represented with higher resolution, and the subdivision scheme yields a roughly **equi-energy partitioning** of the directional domain. Rebuilding the quadtrees after each iteration ensures that the data structure adapts to newly gained information and that memory is used efficiently. The threshold $\rho$ effectively controls how much memory is used, since the amount of nodes in the quadtree is proportional to $1/\rho$.

{{< figure
src="/images/path_tracing/ppg/quadtree.svg"
id="fig-ppg-directional-quadtree"
caption="Each leaf node of the spatial binary tree contains a quadtree, which approximates the spherical radiance field as an adaptively refined piecewise-constant function. Cells are smaller where more flux arrives, giving a roughly equi-energy partitioning of the directional domain. (Detail of the SD-tree figure above; image by Müller et al. [[4]](#ref-4))"
width="55%"
>}}

##### Unbiased Iterative Learning and Rendering

A sequence $\hat{L}_1, \hat{L}_2, \ldots, \hat{L}_M$ is trained, where $\hat{L}_1$ is estimated with just BSDF sampling, and for all $k > 1$, $\hat{L}_k$ is estimated by combining samples of $\hat{L}_{k-1}$ and the BSDF via multiple importance sampling. Sampling from the previously learned distribution $\hat{L}_{k-1}$ to estimate $\hat{L}_k$ often drastically accelerates convergence compared to naïve Monte Carlo estimation.

Given a path vertex $v$, a direction is sampled from $\hat{L}_{k-1}$ by first descending spatially through the binary tree to find the leaf node containing the vertex position $x_v$, then sampling the direction $\vec{\omega}_v$ from the quadtree contained in that spatial leaf node via **hierarchical sample warping**.

**Exponential Sample Count.** If an equal amount of path samples were used in each iteration, then only a small (the last) fraction of samples would contribute to the image directly, with the preceding majority being used just for learning the incident radiance field. This would not be a problem if the learned distributions were proportional to the full numerator in $\eqref{eq:ppg-estimator}$, in which case a single sample would theoretically suffice for finding the scaling factor between the numerator and the PDF. These distributions, however, only approximate the incident radiance, which requires still integrating the full product over the hemisphere.

The number of path samples is therefore increased geometrically in each iteration: twice as many samples are used to learn $\hat{L}_k$ as to learn $\hat{L}_{k-1}$. Learning $\hat{L}_k$ then takes approximately twice as long as learning $\hat{L}_{k-1}$, but $\hat{L}_k$ has roughly half the variance. In practice the variance reduction is typically much higher due to the positive effects of the iterated importance sampling scheme; in the worst case of iterative learning not improving convergence, only half of the samples are wasted on learning the distributions.

Another property of doubling the sample count surfaces when considering the spatial subdivision scheme. Since spatial subdivision of a binary-tree leaf node halves its volume, doubling the amount of samples ensures that approximately the same number of samples reaches both new leaf nodes. Therefore, even locally, $\hat{L}_k$ generally does not become noisier than $\hat{L}_{k-1}$.

**Online Rendering Preview.** Images synthesized using the path samples of the current iteration are displayed progressively. As long as path samples are not fused across iterations, the image is unbiased, since all path samples within the same iteration are mutually independent. Since each iteration starts rendering the image from scratch, naïvely displaying the latest result would lead to sudden quality degradations whenever a new iteration starts; this is avoided by switching to the image of the current iteration only once it has accumulated more samples than the previous iteration.

##### Balancing Learning and Rendering

A given compute budget $B$, which can be defined either as time or number of samples, is split between learning and rendering such that the variance of the final image is minimized.

For iteration $k$, the **budget to unit variance** is defined as

$$
\tau_k = V_k \cdot B_k,
$$

i.e. the product of the variance of image $I_k$ computed using paths traced in iteration $k$, and the budget $B_k$ spent on constructing these paths. The variance $V_k$ is computed as the mean variance of pixels in $I_k$. Assuming $\hat{L}_k$ keeps being used for guiding the paths until $B$ is reached, the variance of the final image is estimated as

$$
\begin{equation}
\hat{V}_k = \frac{\tau_k}{\hat{B}_k},
\label{eq:ppg-budget}
\end{equation}
$$

where $\hat{B}_k$ is the remaining budget from the start of the $k$-th iteration:

$$
\hat{B}_k = B - \sum_{i=1}^{k-1} B_i.
$$

The goal is to find the optimal iteration $\hat{k}$ that minimizes the final-image variance, i.e. $\hat{k} = \arg\min_k \hat{V}_k$. To that end it is assumed that **training has monotonically diminishing returns**, or more precisely that the sequence $\tau_k$ is monotonically decreasing and convex. It follows that $\hat{V}_k$ is also convex. $\hat{k}$ can then be found as the smallest $k$ for which $\hat{V}_{k+1} > \hat{V}_k$ holds. Since $\hat{V}_{k+1}$ needs to be evaluated, one more iteration than would be optimal is performed, but the wasted computation is greatly outweighed by the variance reduction due to the automatic budgeting mechanism.

The same approach can be used to optimally trade off training and rendering when aiming for a target variance, by estimating the rendering budget $\bar{B}_k$ required to reach it.

#### Discussion

**Spherical vs. Hemispherical Domain.** The directional quadtree distributions cover the entire sphere of directions, parameterized using world-space-aligned cylindrical coordinates. This has two key benefits compared to most previous work, which covers only the upper (oriented) hemisphere. First, distributions need not be discriminated according to their angular distance to the normal at the shading point; this simplifies the search to merely selecting the spatially nearest distribution, and avoids the need for rotating the distribution to prevent overblurring in the directional domain. Second, spherical distributions naturally generalize to volumetric path tracing and typically perform better on organic structures such as foliage and hair. On a hairball scene consisting of cylindrical hairs inside a glass cube, Vorba et al.'s method has to densely populate the hairball with hemispherical distributions to remain accurate, leading to significant memory and performance cost; the orientation-independent cylindrical parameterization is decoupled from geometric properties and results in almost $83\times$ lower memory consumption and significantly improved convergence rate.

**Quadtree vs. Gaussian Mixture Model.** The main advantage of quadtrees over Gaussian mixture models is increased robustness. The expectation-maximization algorithm used by Vorba et al. is not guaranteed to find the global optimum, and the distribution can vary dramatically across nearby spatial locations. The quadtrees instead adapt to the energy distribution hierarchically, top-down, and adapt the resolution such that each leaf contains roughly the same amount of energy. The convergence of the rendering algorithm within one iteration is thus more stable.

**Geometric Iterations vs. Moving Average.** The final image could be estimated using an exponential moving average of all path samples. Since in that case earlier samples are drawn from a suboptimal distribution, their variance can be very large, potentially resulting in higher overall variance. The geometrically growing iterations ensure that the last iteration has a sufficient number of high-quality samples to provide an accurate estimate; samples in previous iterations are invested only into constructing path-guiding distributions.

#### Parameters and Limitations

The approach does not require tuning hyper-parameters: $\rho = 0.01$ and $c = 12000$ performed well in all of the paper's tests, and the only parameter to be specified is the maximum memory footprint of the SD-tree.

*   The learned distributions approximate only the **incident radiance**, not the full numerator of $\eqref{eq:ppg-estimator}$, so the full product must still be integrated over the hemisphere and combination with BSDF sampling via MIS remains necessary.
*   The directional approximation is **piecewise constant**, so sharp directional features are resolved by spending quadtree nodes.
*   The budgeting rule of $\eqref{eq:ppg-budget}$ relies on the assumption that $\tau_k$ is **monotonically decreasing and convex**; the convexity of $\hat{V}_k$ follows from it.
*   Samples spent in training iterations do not contribute directly to the final image, bounded at roughly half by the geometric schedule.

Several of these limitations were revisited when PPG was put into production at Disney; see [Practical Path Guiding in Production](#practical-path-guiding-in-production-2019) below.

### Practical Path Guiding in Production (2019)

PPG was designed to be practical, and it was adopted quickly: Pixar implemented it in RenderMan, and Thomas Müller worked with the Hyperion team at Walt Disney Animation Studios to integrate it there. The SIGGRAPH 2019 course *Path Guiding in Production* [[23]](#ref-23) collects what was learned along the way, together with the experience of Weta Digital, who use guiding in their Manuka renderer. This section follows Müller's chapter of the course notes and his talk slides [[24]](#ref-24).

**Why vanilla PPG was not yet "practical".** Production scenes are often *easy*. Artists are used to the limits of unidirectional path tracing, so many shots are mostly directly lit by fairly large light sources, and a plain path tracer already does well on them. A production guiding algorithm therefore has to do two things: help in hard scenes, and *never make easy scenes worse*, so that it can stay switched on without anyone thinking about it. Vanilla PPG failed the second test, and often produced *more* noise than the unguided path tracer on simple scenes. The course notes trace this to three limitations:

1. the SD-tree struggled to adapt to local, high-frequency illumination;
2. the iteration scheme discarded up to half of all samples;
3. PPG guided by incident radiance everywhere, including on near-specular surfaces where BSDF sampling is much better.

Each of the three extensions below addresses one of them. All three are general: they can be combined with other guiding methods, not just PPG.

#### Extension 1: Inverse-Variance-Weighted Sample Combination

Recall that PPG renders $M$ iterations with $1, 2, 4, \ldots, 2^{M-1}$ samples per pixel, so the total is $N = 2^M - 1$, and only the last iteration's image is kept. This protects the final image from the noisy early iterations, but in the worst case (guiding learns quickly and early iterations are already good) it throws away almost half of the computation ({{< figref "fig-ppg-iterations" >}}).

{{< figure src="/images/path_tracing/ppg_production/ppg_iterations.svg" id="fig-ppg-iterations" noinvert="true" caption="Vanilla PPG keeps only the final iteration (16 spp) and discards the previous 1 + 2 + 4 + 8 = 15 spp, almost half of the total. The sample counts are illustrative: Müller's slide notes that they were made up so that the noise difference stays visible. (Renders from Thomas Müller's slides [[24]](#ref-24))" width="100%" >}}

Because the iteration images $I_1, \ldots, I_M$ are independent estimates of the same pixel values, the combination with the lowest variance weights each one by its inverse variance (Graybill and Deal, 1959):

$$
I(p) = \frac{1}{\sum_{k=1}^{M} w_k(p)} \sum_{k=1}^{M} w_k(p)\, I_k(p),
\qquad
w_k(p) = \frac{1}{\mathbb{V}[I_k(p)]}.
$$

This interpolates between the two extremes: if the early iterations have very high variance their weights go to zero (discarding them, as vanilla PPG does), and if every sample has the same variance the weights reduce to a plain average.

The catch is that the true pixel variances are unknown. Estimating them per pixel from the same samples gives noisy weights and, worse, *correlates* the weights with the pixel values, which biases the result. The production version therefore uses one scalar weight per iteration, based on the variance estimate averaged over the whole image. In Müller's open-source implementation [[25]](#ref-25), each iteration is weighted by the inverse of its mean pixel variance (with per-pixel variances clamped so that fireflies cannot destabilize the estimate):

$$
I = \frac{\sum_k \bar w_k\, I_k}{\sum_k \bar w_k},
\qquad
\bar w_k = \frac{1}{\operatorname{mean}_p \widehat{\mathbb{V}}[I_k(p)]}.
$$

Whole-image weights are less optimal than per-pixel ones, but far more stable. The authors could not observe any bias, visually or numerically, and the scheme is consistent: as more samples are used, the variance estimates converge to the true variance, which does not depend on any particular sample, so the correlation (and with it the bias) vanishes. For robustness, only the **last four** iterations are combined. That still discards slightly fewer than the first 6.25% of samples, but those are the noisiest ones and could otherwise make the weights unstable.
The gains reported in the course notes are modest but consistent: mean absolute percentage error drops from 0.1525 to 0.1299 on COUNTRY KITCHEN and from 0.0977 to 0.0824 on SWIMMING POOL.

#### Extension 2: Filtered Splatting into the SD-Tree

Under narrow illumination, for example a Cornell box lit by a tiny light *with next-event estimation disabled* (a deliberately contrived case), PPG reduces noise overall but leaves **structured noise** that follows the cells of the SD-tree ({{< figref "fig-ppg-filtered-cbox" >}}, middle). These are not bias: they are sudden variations in noise between neighbouring cells. The course notes give three causes:

1. The spatial subdivision assumes that splitting a node in half gives each child about half the samples. This fails when path vertices are distributed anisotropically, for example along geometric edges.
2. Even when vertices are evenly distributed, their sample *variance* is ignored by the subdivision.
3. Each radiance estimate is recorded only in the leaf that contains it (**nearest-neighbour splatting**). The approximation is therefore better at the centres of leaves than at their borders, which shows up as darkening at leaf boundaries.

All three lead to non-uniform learning, and the standard remedy for that is filtering. Instead of depositing a radiance estimate $\langle L_i \rangle$ at vertex $v$ only into the leaf that contains $(\mathbf{x}_v, \boldsymbol{\omega}_v)$, it is spread over a neighbourhood:

1. Find the leaf that contains $\mathbf{x}_v$; its size (volume $V$) defines the **filter footprint**, which is then centred on $\mathbf{x}_v$. The filter is therefore small where the tree is finely subdivided and large where it is coarse.
2. Visit every leaf that overlaps the footprint and add $\langle L_i \rangle \cdot V_o / V$ to it, where $V_o$ is the overlapping volume.
3. Do the same in the directional domain, using areas in the cylindrical $(\cos\theta, \phi)$ parameterization instead of volumes.

{{< step-slider animate="false" >}}

- image: "/images/path_tracing/ppg_production/splat_nearest_neighbor.svg"
  title: "Nearest-neighbour splatting (original PPG)"
  description: |
    Each sample (circle) deposits its radiance only into the leaf it falls into. Leaves learn unevenly, best near their centres.

- image: "/images/path_tracing/ppg_production/splat_filtered.svg"
  title: "Filtered splatting"
  description: |
    The footprint of the leaf containing the sample is centred on the sample, and the radiance is distributed over every overlapped leaf in proportion to the overlapped area. Small leaves receive a higher *density*, because a larger fraction of their area is covered.

- image: "/images/path_tracing/ppg_production/splat_filtered_cost.svg"
  title: "The cost of filtering"
  description: |
    A sample in a large leaf next to a finely subdivided region has a large footprint that overlaps many small leaves, and every one of them has to be visited.

- image: "/images/path_tracing/ppg_production/splat_stochastic.svg"
  title: "Stochastic filtered splatting"
  description: |
    Instead, jitter the sample uniformly inside its footprint and deposit it, unweighted, into the single leaf it lands in. This gives the same result as deterministic filtering in expectation, with only two lookups per splat.

{{< /step-slider >}}

<p style="text-align:center; font-size:0.9em; color:#666;">Diagrams from Thomas Müller's slides <a href="#ref-24">[24]</a>, showing one directional quadtree; spatial filtering works the same way over volumes.</p>

Deterministic filtering can be expensive, and the costs of spatial and directional filtering *multiply*: spatial filtering visits many quadtrees instead of one, and directional filtering then visits many leaves in each of them. Making just one of the two stochastic therefore recovers most of the speed. Because spatial filtering works in three dimensions instead of two, it is the more expensive one, so the production version filters **stochastically in space and deterministically in direction**. The overhead over vanilla PPG is about 20% in a Mitsuba Cornell box and below 10% in Hyperion production scenes, where rendering itself is more expensive. The extra robustness also allows a finer spatial subdivision: the threshold drops from $12000 \cdot 2^{k/2}$ to $4000 \cdot 2^{k/2}$ path vertices per leaf.

You can try the three splatting variants below. Click to splat a single sample, or splat many samples drawn from a synthetic radiance function, and compare how many leaves each scheme touches and how evenly the tree learns.

{{< fullscreen-iframe id="ppg-splatting" src="/interactive/ppg_filtered_splatting.html" height="420" >}}

{{< figure src="/images/path_tracing/ppg_production/ppg_filtered_splatting_cbox.svg" id="fig-ppg-filtered-cbox" noinvert="true" caption="Cornell box with a tiny light and next-event estimation disabled, a deliberately contrived case. Nearest-neighbour splatting reduces noise but leaves structured artifacts that follow the SD-tree cells; filtered splatting removes the structure and reduces noise further. (Renders from Thomas Müller's slides [[24]](#ref-24))" width="100%" >}}

#### Extension 3: Learning the MIS Selection Probability

PPG learns incident radiance only, so it must be combined with BSDF sampling. It does this with the **one-sample MIS model**: at each vertex it picks BSDF sampling with probability $\alpha$ and SD-tree sampling otherwise, so the effective density is ({{< figref "fig-ppg-mis-goal" >}})

$$
\hat q(\boldsymbol{\omega}_i \mid \mathbf{x}, \boldsymbol{\omega}_o; \alpha) = \alpha\, {\class{term-bsdf}{p_{f_s}(\boldsymbol{\omega}_i \mid \mathbf{x}, \boldsymbol{\omega}_o)}} + (1-\alpha)\, {\class{term-light}{q(\boldsymbol{\omega}_i \mid \mathbf{x})}}.
$$

Radiance-based methods typically fix $\alpha = 0.5$ (PPG, Vorba et al. 2014), and product-based methods are more aggressive (Herholz et al. use $\alpha = 0.1$). A fixed value is clearly suboptimal: on a slightly rough glass surface, incident radiance is a poor proxy for the product, and BSDF sampling should be used almost always, while on a diffuse wall guiding should dominate. The goal is to learn a spatially varying $\alpha(\mathbf{x})$ such that $\hat q$ is as close as possible to the ideal density $p(\boldsymbol{\omega}_i) \propto {\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega}_i)}}\, {\class{term-bsdf}{f_s(\mathbf{x}, \boldsymbol{\omega}_i, \boldsymbol{\omega}_o)}} \cos\gamma_i$.

{{< figure src="/images/path_tracing/ppg_production/mis_lobes.svg" id="fig-ppg-mis-goal" caption="At a vertex x, the next direction is drawn either from the BSDF (magenta lobe) or from the learned guiding distribution (orange lobe). The selection probability α sets how often each is used, and ideally their blend should be proportional to the integrand of the rendering equation. (Diagram from Thomas Müller's slides [[24]](#ref-24))" width="80%" >}}

This is the same kind of optimization problem as in [NIS](#optimization-for-monte-carlo-integration), but with a single scalar parameter. Minimizing the variance directly is possible but numerically unstable, so the KL divergence $D_{\mathrm{KL}}(p \,\|\, \hat q; \alpha)$ is used instead. Like the variance, it is zero only when $\hat q = p$, and it grows without bound when $\hat q$ undersamples the integrand. Its gradient can be estimated without bias from samples $\boldsymbol{\omega}_i \sim q_s$ (in practice $q_s = \hat q$). Replacing the unknown $p$ by the unnormalized product estimate only introduces a constant factor, which Adam compensates for automatically:

$$
\langle \nabla_\alpha D_{\mathrm{KL}} \rangle
\;\propto\;
-\,\frac{\langle {\class{term-light}{L_i(\boldsymbol{\omega}_i)}} \rangle\, {\class{term-bsdf}{f_s(\boldsymbol{\omega}_i)}} \cos\gamma_i}{q_s(\boldsymbol{\omega}_i)}\;
\frac{{\class{term-bsdf}{p_{f_s}(\boldsymbol{\omega}_i)}} - {\class{term-light}{q(\boldsymbol{\omega}_i)}}}{\hat q(\boldsymbol{\omega}_i; \alpha)}.
$$

The gradient has an intuitive reading. Its magnitude is large when a lot of light is reflected, so bright samples matter more, and its sign depends on which technique gave the sampled direction more probability. Where BSDF sampling assigns a higher density than guiding, gradient descent moves $\alpha$ towards BSDF sampling, and vice versa. The optimum is wherever these nudges balance out.

To keep $\alpha$ in $[0, 1]$, it is parameterized through a logistic sigmoid of an unconstrained latent $\theta$, $\alpha = \sigma(\theta) = 1/(1 + e^{-\theta})$, and the chain rule adds a factor $\sigma'(\theta) = \alpha(1-\alpha)$. Because the sigmoid saturates (vanishing gradients), a weak L2 penalty $\lambda\theta^2$ with $\lambda = 0.005$ keeps $\theta$ near zero unless the data pushes it away. This still allows probabilities as extreme as 0.01 or 0.99.

**Integration into PPG.** Each spatial leaf of the SD-tree stores its own latent $\theta$ next to its quadtree, and every time a radiance estimate is splatted into a leaf, one Adam step is taken on that leaf's $\theta$. Threads rarely collide, because the spatial resolution of the tree roughly matches the density of path vertices, so a cheap spin lock is enough; the authors observed near-linear scaling up to 48 threads. When a *discrete* (delta) BSDF component is sampled, the smooth SD-tree density is treated as zero. The whole thing is about twenty lines of pseudocode (Algorithm 3 in the course notes), sketched here in Python:

```python
import math, threading

class SpatialLeaf:
    def __init__(self):
        self.lock = threading.Lock()
        self.t, self.m, self.v, self.theta = 0, 0.0, 0.0, 0.0  # Adam state + latent
        self.beta1, self.beta2, self.eps, self.lr = 0.9, 0.999, 1e-8, 0.01
        self.reg = 0.01                                        # = 2 * lambda, lambda = 0.005

    def selection_probability(self):                           # alpha = sigmoid(theta)
        return 1.0 / (1.0 + math.exp(-self.theta))

    def adam_step(self, grad):
        self.t += 1
        lr_t = self.lr * math.sqrt(1 - self.beta2**self.t) / (1 - self.beta1**self.t)
        self.m = self.beta1 * self.m + (1 - self.beta1) * grad
        self.v = self.beta2 * self.v + (1 - self.beta2) * grad * grad
        self.theta -= lr_t * self.m / (math.sqrt(self.v) + self.eps)

    def mis_optimization_step(self, radiance_estimate, f_s_cos, bsdf_pdf, guide_pdf,
                              sample_pdf, is_delta):
        product = radiance_estimate * f_s_cos                  # <L_i> f_s cos(gamma)
        learned_pdf = 0.0 if is_delta else guide_pdf
        with self.lock:                                        # one optimizer step at a time
            alpha = self.selection_probability()
            combined_pdf = alpha * bsdf_pdf + (1 - alpha) * learned_pdf
            grad_alpha = -product * (bsdf_pdf - learned_pdf) / (sample_pdf * combined_pdf)
            grad_theta = grad_alpha * alpha * (1 - alpha)       # chain rule through sigmoid
            self.adam_step(grad_theta + self.reg * self.theta)  # + L2 regularization
```

<div style="display:flex; justify-content:center; gap:20px; flex-wrap:wrap;">
  <div style="flex:1; min-width:280px; text-align:center;">
    {{< dlider
      before="/images/path_tracing/ppg_production/spaceship_fixed_alpha.jpg"
      after="/images/path_tracing/ppg_production/spaceship_learned_alpha.jpg"
      caption="PPG without vs. with a learned selection probability (1024 spp). The slightly rough cockpit glass is far better served by BSDF sampling than by guiding towards incident radiance."
      width="100%"
      beforeLabel="Fixed α = 0.5"
      afterLabel="Learned α"
    >}}
  </div>
</div>
<div style="text-align:center; font-size:0.9em; margin-bottom:20px; color:#666;">
  Renders from Thomas Müller's slides <a href="#ref-24">[24]</a>
</div>

The course notes report the combined effect at 1024 spp as mean absolute percentage error for path tracing / extended PPG / extended PPG with learned $\alpha$: 1.4694 / 0.3220 / 0.1881 on a difficult GLOSSY KITCHEN, and 0.0835 / 0.0694 / 0.0574 on a BEDROOM that is easy for BSDF sampling. In the second scene, guiding with a learned $\alpha$ now beats the unguided path tracer instead of losing to it.

#### Other Production Details

The course notes also list several implementation details that are easy to overlook but matter a lot in practice:

*   **Next-event estimation stays on, and is not learned.** Guiding is usually worse than NEE for direct illumination, especially when NEE uses a light importance cache as in Hyperion. The SD-tree is therefore trained only on indirect illumination and on direct light from sources that NEE does not sample (for example emissive volumes). Section 7.4 of the course discusses this dilemma more generally: if direct light is included in the guiding distribution, guiding spends its limited resolution on features that NEE already handles well. A middle ground is to include direct light weighted by its MIS weight, so that guiding only focuses on directions NEE samples poorly.
*   **Adjoint-driven Russian roulette and splitting** (Vorba and Křivánek, 2016). Throughput-based roulette works against a guided path tracer, because the throughput says nothing about how much light the path will still find. Adjoint-driven roulette compares the learned incident radiance $\tilde L_i$ at each vertex with an estimate of the pixel value, then terminates, continues, or *splits* the path accordingly. Crude estimates are sufficient. To avoid a precomputation, the pixel estimates can be a filtered version of the image being rendered, refined hierarchically as rendering progresses.
*   **World-space cylindrical coordinates** for the directional quadtrees. World-space alignment lets one distribution serve surfaces with high-frequency normal variation, and the cylindrical map $(\cos\theta, \phi)$ is area-preserving, so quadtree cells of equal size cover equal solid angle.
*   **Rapid adaptation to large scenes.** Production scenes are often much larger than what the camera sees. To fit the SD-tree to the camera frustum quickly, a handful of 1-spp iterations (e.g. 8) are run at the start, before guiding is used for real.

**Remaining issues.** Even with all three extensions, PPG was not strictly better than unguided path tracing on simple scenes such as directly lit exteriors. The authors attribute this to the 10–20% overhead of the SD-tree and to the roughly 6.25% of samples that are still discarded. Other open problems they list are:
- the subdivision scheme itself: filtering treats the symptoms, not the cause;
- product guiding, which is hard with rich parametric BSDFs such as the Disney BSDF;
- guiding motion blur, possibly with a 4D spatio-temporal tree;
- volumes, where PPG performs poorly without phase-function products and guided distance sampling.

Several of these are what the later methods in these notes address: NIS, NASG and warp composition learn the product, NPM avoids the tree subdivision altogether, and VXPG is designed for dynamic, real-time scenes.

**Broader lessons from the course.** The course frames a few distinctions that are useful when reading the rest of these notes:
*   **Forward vs. reverse learning.** *Reverse* methods learn from paths traced in the opposite direction, for example photons that guide camera paths (Jensen 1995; Vorba et al. 2014; Herholz et al. 2016). *Forward* methods learn from the same camera paths they guide (Lafortune and Willems 1995; PPG; Dahm and Keller 2018). For production, forward methods have clear advantages: no pre-pass and a short time to first pixel, no need to implement photon tracing, and robustness to non-physical production "tricks" that make light transport asymmetric. Their weakness is exploration: a rare path, such as a caustic found by chance, must be explored efficiently before it can be guided.
*   **Guiding beyond directions.** Directions are only one decision along a path. Guiding can also choose path length (roulette and splitting), which light to connect to (occlusion-aware many-light sampling, Sec. 8–9 of the course), and, in volumes, the scatter and distance decisions. Herholz's volumetric chapter makes the point that *every* decision should be guided to approach zero variance.
*   **Guided path tracing versus bidirectional methods.** Vorba et al. (2014) found that a guided path tracer performs almost as well as guided bidirectional path tracing or VCM on difficult scenes, because many bidirectional contributions end up down-weighted by MIS. This is part of why production renderers prefer to stay with (guided) path tracing. Weta Digital still adds light tracing with *guided emission* for shots where most pixels receive caustics: positions and directions of emitted paths are learned so that light paths start where they matter to the camera.

### Offline Deep Importance Sampling (2019)

Every method discussed so far learns its distribution *online*, per scene. Offline Deep Importance Sampling (ODIS) [[5]](#ref-5) asks whether the distribution-generating function itself can be trained once, ahead of time, and then applied to any new scene without retraining.

#### Online vs. offline training

The first design decision is whether the network should estimate the PDF online as samples are computed, or be trained as a pre-process on other scenes as an incident radiance *interpolator*. Bako et al. find online training impractical for their target regime for two reasons:

*   Online methods require a fairly large number of samples, usually on the order of hundreds of samples per pixel, before they become effective, because they train from scratch every time a scene is rendered. At low sampling rates there may simply not be enough useful information to estimate a good PDF.
*   Network-based online methods require significant scene-dependent training times, which reduces the practical benefit of importance sampling in the first place.

Both matter because the goal is to work at the low sampling rates where MC denoising methods usually fail, so that a denoiser downstream receives a more converged input.

The alternative rests on an observation about light transport: **incident radiance is highly coherent across local scene regions.** Although only a few samples per pixel have been measured, that coherence can be exploited to improve the estimate of incident radiance at any point. The noisy estimates across a local neighbourhood are used to interpolate the incident radiance at a scene point at the centre of that neighbourhood. Posing the problem as *reconstruction* from existing samples, rather than fitting a function to a specific scene, is what makes the learned function scene-independent.

#### Hemisphere parameterization

To use a convolutional network, the incident radiance is parameterized on a **uniform 2D grid of resolution $N \times N$**. Each bin maps to spherical coordinates $\theta$ and $\phi$ about a **full sphere parameterized over world space**.

Two choices are deliberate:

*   The parameterization is over world space rather than the local hemisphere. A local-hemisphere parameterization would require transformations to align neighbouring grids before their coherence could be exploited, and exploiting that coherence is the whole basis of the method.
*   Sampling is performed uniformly **along the solid angle** rather than in spherical coordinates, to avoid biasing samples towards the "up" direction.

Gaussian mixture models and spherical harmonics were considered and rejected, because the uniform grid is what lets a CNN operate on the representation directly.

Because the grid covers the entire sphere in world space, **half of the grid corresponds to invalid directions** below the surface, which always have zero contribution, since only reflected radiance is being importance sampled.

The angular resolution was chosen empirically: ground-truth sampling maps were generated at $8\times 8$, $16\times 16$, $32\times 32$, $64\times 64$ and $128 \times 128$, used during rendering at all power-of-two sample counts between 8 and 1024 spp, and scored by average MrSE and SSIM of the final image. Convergence improves with increasing angular resolution, with only marginal gains beyond $32\times 32$, which is the resolution used in the pipeline.

#### Algorithm overview

{{< figure
src="/images/path_tracing/odis/overview.svg"
id="fig-odis-overview"
noinvert="true"
caption="Overview of the ODIS algorithm at run-time. First, an initial buffer of a few samples at every pixel is saved from the renderer (e.g. 1 to 8 spp) containing the first bounce incident radiance (from both direct and indirect sources), helpful auxiliary features (e.g., first and second bounce normals and depth), and the incoming direction (as 2-D spherical coordinates). Next, for every pixel to be reconstructed, neighboring radiance samples (and their features) are gathered and each sample is binned based on its direction into the corresponding pixel's uniform grid that parameterizes the incident radiance. The gathered samples are then averaged (integrated over solid angle) within their respective angular bins. Since the method works at low sample counts with sparse data, a bit mask is also saved representing whether a bin in the grid received any samples, which is utilized through masked convolutions in the network. The CNN then acts on the sparse, uniform grid to produce a dense reconstruction of the incident radiance, which can then be normalized and used as a sampling map to guide the rendering system for the remaining samples and generate the final image. Despite having limited samples and never being trained on this scene, the reconstruction from the network accurately models both the direct and indirect illumination at the first bounce. (Image by Bako et al. [[5]](#ref-5))"
width="100%"
>}}

At run time:

1. A **very small initial batch of samples** is traced (e.g. 1 to 8 spp). The direction of the subsequent bounce is chosen by sampling the hemisphere about the initial intersection point, either uniformly or by importance sampling the BRDF. Saved per sample are the first-bounce incident radiance (direct and indirect), auxiliary features (first- and second-bounce normals and depth), and the incoming direction as 2D spherical coordinates.
2. For every pixel to be reconstructed, neighbouring radiance samples and their features are **gathered and binned** by direction into that pixel's uniform grid, then averaged within their respective angular bins, which integrates over solid angle.
3. A **bit mask** is saved recording whether each bin received any samples.
4. The sparse grid is passed to the reconstruction network, which produces a **dense reconstruction** of the entire grid at that point. The network is evaluated for all points across the image at once, after binning, to use the GPU efficiently.
5. The reconstruction is **normalized to a valid PDF**, converted to a CDF, and standard 2D importance sampling selects a bin; a direction is then chosen randomly within that bin.

Since the samples record incoming radiance, the network is reconstructing the incident radiance over the valid hemisphere (the invalid half of the world-space grid is masked out of both the input and the output), which is assumed to be the distribution to sample from.

Importance sampling only the **first bounce** gave the best trade-off between sampling quality and computation/storage; because the samples are cached **in screen space**, later bounces fall back to standard multiple importance sampling.

#### Network architecture and training

{{< figure
src="/images/path_tracing/odis/architecture.svg"
id="fig-odis-architecture"
noinvert="true"
caption="An overview of the two network components of the full ODIS approach. The radiance reconstruction network (blue) generates a dense reconstruction of the incident radiance at the first bounce using only a sparse set of initial samples. During training, the network learns to match a high-sample-count reference of the incident radiance based on the grid parameterization. Furthermore, although not required, a discriminator (green) can be used to improve the quality of the reconstruction and, ultimately, the final rendered output. Note the discriminator is only used during training and then discarded. After the offline training is complete, the network can be used with any new test scene without any additional per-scene, online training. Specifically, the network is used in inference mode to reconstruct the incident radiance for an arbitrary scene, which can then be converted to a sampling map to guide the renderer for its remaining sampling budget. (Image by Bako et al. [[5]](#ref-5))"
width="100%"
>}}

**Masking invalid regions.** The first challenge is sparsity at low sampling rates. Many bins never receive a sample, and their radiance value is zero, but a convolution cannot distinguish a bin that is zero because there was genuinely no contribution from one that is zero because it was never sampled. Indirect illumination adds further noise from second-bounce sampling. The solution is **masked convolutions** in the generator: the convolution is applied together with a binary mask holding 0 or 1 per bin according to whether that bin received any samples, so regions that never received a value produce no gradient flow and do not affect the weights.

**Loss.** The network outputs a dense reconstruction of incident radiance rather than a PDF directly, because mapping noisy raw radiances or their PDFs to a reference distribution is harder for the network to learn. Working with radiance values means a very large dynamic range, which harms optimization and causes dark areas that contribute little to the overall error to be poorly matched despite having non-zero radiance. A **range compressor** is therefore applied,

$$
\begin{equation}
T_y = \frac{\log(1 + \mu y)}{\log(1 + \mu)},
\label{eq:odis-range}
\end{equation}
$$

with $\mu$ controlling the amount of compression ($\mu = 5000$ in their implementation). This gives dark and bright regions similar importance when minimizing the reconstruction loss; the inverse is applied at test time to restore relative intensities.

The training objective combines two terms:

$$
\begin{equation}
\mathcal{L}(T_y, T_{\hat{y}}) = \mathcal{L}_{\text{accuracy}}(T_y, T_{\hat{y}}) + \alpha\, \mathcal{L}_{\text{sharpness}}(T_y, T_{\hat{y}}).
\label{eq:odis-loss}
\end{equation}
$$

$\mathcal{L}_{\text{accuracy}}$ minimizes average per-pixel distance, enforcing accuracy between the range-compressed prediction $T_y$ and the reference $T_{\hat{y}}$. $\mathcal{L}_{\text{sharpness}}$ is an adversarial loss ensuring sharp output, since **blurry maps waste samples**, for example across occlusion boundaries. An $\ell_1$ loss worked best for $\mathcal{L}_{\text{accuracy}}$ and standard cross-entropy for $\mathcal{L}_{\text{sharpness}}$, with $\alpha = 4.0 \times 10^{-3}$. Setting $\alpha = 0$ recovers the reconstruction network alone, reported in the paper as "Ours (NoGAN)".

**Training data.** 82 training scenes were collected for Cycles, Blender's built-in production path tracer. All were made **diffuse-only**, to eliminate the influence of the BRDF and focus the network on dense reconstruction of incident radiance without having to account for material attenuation. All scenes were rendered with direct and one-bounce indirect illumination, matching the first-bounce-only sampling. Ground-truth grids were generated at $32 \times 32$ with 64K samples, or 64 samples per bin, by looping over every bin at the first bounce and sending 64 uniformly distributed samples to get the average radiance integrated over that bin's solid angle.

**Implementation.** The generator is an encoder–decoder with three scales: the encoder starts at 16 feature maps and doubles to 256 at the coarsest scale using average pooling, the decoder mirrors it from 256 back to 16 using transposed convolutions of stride 2, and the single-channel output matches the input resolution. Each scale has two convolutions with Xavier initialization. Implemented in TensorFlow, trained from scratch on both loss terms simultaneously for 820K iterations, mini-batch size 16, ADAM at learning rate $1.0 \times 10^{-4}$. With the network evaluated on an $8\times 8$ pixel stride and bilinearly interpolated in between, inference took **0.6 seconds** in total per image on the paper's Mitsuba scenes.

#### Discussion, limitations, and future work

The ideal objective would be a pixel-wise $\ell_1$ or $\ell_2$ loss between the *final rendered output* and a high-sample-count reference. That requires the renderer inside the training loop and the ability to differentiate through it, which is the subject of the [companion notes on differentiable rendering](/posts/intro-to-differentiable-rendering/). At the time, differentiable renderers were not easily incorporated into such frameworks, so the incident radiance sampling maps are optimized directly instead.

*   **Screen space restricts it to the first bounce.** The method works in screen space and uses standard MIS beyond the second bounce, so the reconstructed maps cannot improve convergence at later bounces. Methods that work in world space, such as PPG's SD-tree, can importance sample from their structure at *every* bounce. Reconstruction in path space was explored, but 4D and 5D convolutions were slow, difficult to train, and need more study.
*   **The BRDF is not explicitly accounted for**, so the method works better for diffuse scenes where the reflected light field is not dominated by the BRDF.
*   **Fixed grid resolution.** If the resolution is too coarse the method can fail to discover and properly sample small light features such as caustics, and can have reduced performance with tight, specular BRDFs that only admit light through a small solid angle.
*   Inference happens once; the paper notes that inferencing at multiple stages of rendering to continually update the sampling map was left unexplored.

### Neural Importance Sampling (2019)

#### Overview

Neural Importance Sampling (NIS) [[6]](#ref-6) proposes to use deep neural networks for generating samples in Monte Carlo integration. The approach is based on Non-linear Independent Components Estimation (NICE) [[19]](#ref-19), extended with novel coupling transforms and optimization strategies specifically designed for integration problems. The key innovation is learning expressive sampling densities $q(x;\theta)$ that closely match the integrand $f(x)$, thereby reducing estimation variance.

Given an integral:

$$
F = \int_D f(x) dx
$$

we introduce a probability density function (PDF) $q(x)$ to express $F$ as an expected ratio:

$$
F = \int_D \frac{f(x)}{q(x)} q(x) dx = \mathbb{E}\left[\frac{f(X)}{q(X)}\right]
$$

This expectation can be approximated using $N$ independent samples $\{X_1, X_2, \ldots, X_N\}$ where $X_i \in D, X_i \sim q(x)$:

$$
F \approx \langle F \rangle_N = \frac{1}{N} \sum_{i=1}^{N} \frac{f(X_i)}{q(X_i)}
$$

The variance of this estimator heavily depends on how closely $q$ matches the normalized integrand $p(x) \equiv f(x)/F$. In the ideal case where samples are drawn from a PDF proportional to $f(x)$, we obtain a zero-variance estimator.

#### Normalizing Flows and NICE

Neural Importance Sampling leverages **normalizing flows** to model the sampling distribution as a deterministic bijective mapping $x = h(z;\theta)$ from a simple latent distribution $q(z)$ (e.g., uniform or Gaussian) to the complex target distribution. The probability density is computed using the change-of-variables formula:

$$
q(x;\theta) = q(z) \left|\det\left(\frac{\partial h(z;\theta)}{\partial z^T}\right)\right|^{-1}
$$

where the inverse Jacobian determinant accounts for density changes due to the transformation.

For this to be practical in Monte Carlo integration, three requirements must be satisfied:

1. **Tractable inverse**: Given $x$, we must efficiently compute $z = h^{-1}(x)$
2. **Fast evaluation**: Both $h$ and $h^{-1}$ must be computationally efficient
3. **Tractable Jacobian**: The Jacobian determinant must be efficiently computable

NICE satisfies all these requirements through **coupling layers** ({{< figref "fig-coupling-layer" >}}) that admit triangular Jacobian matrices with determinants reducing to products of diagonal terms.

#### Coupling Layers

A coupling layer partitions the $D$-dimensional input vector $x$ into two disjoint groups $A$ and $B$. It leaves partition $A$ unchanged while using it to parameterize the transformation of partition $B$:

$$
y_A = x_A
$$

$$
y_B = C(x_B; m(x_A))
$$

where $C: \mathbb{R}^{|B|} \times m(\mathbb{R}^{|A|}) \to \mathbb{R}^{|B|}$ is a separable and invertible coupling transform, and $m$ is a neural network.

The invertibility is trivial:

$$
x_A = y_A
$$

$$
x_B = C^{-1}(y_B; m(x_A)) = C^{-1}(y_B; m(y_A))
$$

Since $C$ is separable by design, its Jacobian matrix is diagonal, making determinant computation tractable even in high dimensions. The complete transformation is obtained by compounding multiple coupling layers $\tilde{h} = h_L \circ \cdots \circ h_2 \circ h_1$, alternating which partition is transformed.

Note the direction: from here on (following the paper's coupling-layer notation) each layer $h_l$ maps a point of the integration domain toward the latent space, i.e. it plays the role of $h^{-1}$ in the change-of-variables formula above. Samples are therefore generated by applying the inverse layers in reverse order, $x = h_1^{-1}(\cdots h_L^{-1}(z))$, and the density is evaluated by running $x$ forward through $h_1, \ldots, h_L$.

{{< 
figure src="/images/path_tracing/nis/coupling_layer.svg"
id="fig-coupling-layer"
caption="A coupling layer splits the input $x$ into two partitions $A$ and $B$. One partition is left untouched, whereas dimensions in the other partition are warped using a parametric coupling transform $C$ driven by the output of a neural network $m$. Multiple coupling layers may need to be compounded to achieve truly expressive transforms. (Image by Müller et al. [[6]](#ref-6))"
width="80%" 
>}}


#### Affine Coupling Transforms

Two coupling transforms from the prior flow literature set the baseline that the piecewise-polynomial transforms below are measured against.

**Additive coupling transform.** Dinh et al. [[19]](#ref-19) describe a transform that merely translates the signal in the individual dimensions of $B$:

$$
\begin{equation}
C(x^B; t) = x^B + t,
\label{eq:nis-additive}
\end{equation}
$$

where the translation $t \in \mathbb{R}^{|B|}$ is produced by $m(x^A)$.

**Multiply-add coupling transform.** Additive coupling layers have unit Jacobian determinants, so they preserve volume; Dinh et al. [[26]](#ref-26) (Real NVP) add a multiplicative factor $e^s$ to fix this:

$$
\begin{equation}
C(x^B; s, t) = x^B \odot e^s + t,
\label{eq:nis-multiply-add}
\end{equation}
$$

where $\odot$ is element-wise multiplication and $(s, t) = m(x^A)$. The Jacobian determinant of a multiply-add coupling layer is simply $e^{\sum_i s_i}$.

Both coupling transforms are simple. **The trick that enables learning non-linear dependencies across partitions is the parametric function $m$**, which can be arbitrarily complex, typically a neural network, because its inverse is never needed to invert the coupling layer, and its Jacobian does not affect the determinant of the coupling layer. A sophisticated $m$ extracts complex non-linear relations between the two partitions while $C$ itself remains simple, invertible, and tractable.

#### Piecewise-Polynomial Coupling Transforms

Instead of the affine (multiply-add) coupling transforms from prior work, Neural Importance Sampling introduces **piecewise-polynomial coupling transforms** with significantly greater modeling power ({{< figref "fig-pdf-generation" >}}, {{< figref "fig-predicted-pdf" >}}).

{{< 
figure src="/images/path_tracing/nis/pdf_gen.svg"
id="fig-pdf-generation"
caption="The NIS coupling layer with a piecewise-quadratic transform for $\lvert B\rvert = 4$. Signals in partition $A$ (and additional features) are encoded using one-blob encoding and fed into a U-shape neural network $m$ with fully connected layers. The outputs of $m$ are normalized yielding matrices $V$ and $W$ that define warping PDFs. The PDFs are integrated analytically to obtain piecewise-quadratic coupling transforms; one for warping each dimension of $x^B$. (Image by Müller et al. [[6]](#ref-6))"
width="80%" 
>}}


##### Piecewise-Linear Coupling Transform

The approach operates on the unit hypercube $x, y \in [0,1]^D$ with uniformly distributed latent variables. Each dimension in partition $B$ is divided into $K$ bins of equal width $w = 1/K$.

The neural network $m(x_A)$ outputs a $|B| \times K$ matrix $\tilde{Q}$, where each row defines an unnormalized probability mass function. After softmax normalization $Q_i = \sigma(\tilde{Q}_i)$, the PDF in dimension $i$ is:

$$
q_i(x_i^B) = \frac{Q_{ib}}{w}
$$

where $b = \lfloor Kx_i^B \rfloor + 1$ is the (1-based) bin containing $x_i^B$ (the paper writes $\lfloor Kx_i^B \rfloor$, mixing 0- and 1-based indexing).

The piecewise-linear coupling transform is obtained by integration:

$$
C_i(x_i^B; Q) = \int_0^{x_i^B} q_i(t) dt = \alpha Q_{ib} + \sum_{k=1}^{b-1} Q_{ik}
$$

where $\alpha = Kx_i^B - \lfloor Kx_i^B \rfloor$ represents the relative position within bin $b$.

The Jacobian determinant reduces to:

$$
\det\left(\frac{\partial C(x^B; Q)}{\partial (x^B)^T}\right) = \prod_{i=1}^{|B|} q_i(x_i^B) = \prod_{i=1}^{|B|} \frac{Q_{ib}}{w}
$$

##### Piecewise-Quadratic Coupling Transform

For improved expressiveness and adaptive bin sizing, piecewise-quadratic transforms admit a piecewise-linear PDF modeled using $K+1$ vertices. The network outputs unnormalized matrices $\tilde{W}$ and $\tilde{V}$, which are normalized as:

$$
W_i = \sigma(\tilde{W}_i)
$$

$$
V_{i,j} = \frac{\exp(\tilde{V}_{i,j})}{\sum_{k=1}^{K} \frac{\exp(\tilde{V}_{i,k}) + \exp(\tilde{V}_{i,k+1})}{2} W_{i,k}}
$$

where the denominator ensures $V_i$ represents a valid PDF.

The PDF is defined as:

$$
q_i(x_i^B) = \text{lerp}(V_{ib}, V_{ib+1}, \alpha)
$$

where $\alpha = (x_i^B - \sum_{k=1}^{b-1} W_{ik})/W_{ib}$ represents the relative position in bin $b$.

The invertible coupling transform is:

$$
C_i(x_i^B; W, V) = \frac{\alpha^2}{2}(V_{ib+1} - V_{ib})W_{ib} + \alpha V_{ib} W_{ib} + \sum_{k=1}^{b-1} \frac{V_{ik} + V_{ik+1}}{2} W_{ik}
$$

Inverting this transform involves solving a quadratic equation, which can be done efficiently and robustly.

{{< 
figure src="/images/path_tracing/nis/predicted_pdf.svg"
id="fig-predicted-pdf"
caption="Predicted probability density functions (PDFs, left) and corresponding cumulative distribution functions (CDFs, right) with $K = 5$ bins fitted to a target distribution (dashed). The top row illustrates a piecewise-linear CDF and the bottom row a piecewise-quadratic CDF. The piecewise-quadratic approximation tends to work better in practice thanks to its first-order continuity ($C^1$) and adaptive bin sizing. The authors show that, in contrast to piecewise-quadratic CDFs, adaptive bin sizing is difficult to achieve for piecewise-linear CDFs with gradient-based optimization methods. (Image by Müller et al. [[6]](#ref-6))"
width="80%" 
>}}

#### Analysis

The piecewise-polynomial coupling transforms are compared against multiply-add affine transforms on a 2D regression problem, with the domain sampled using uniform i.i.d. samples (16,384 per training step) and the distributions obtained by optimizing KL divergence.

32-bin piecewise-linear and 32-bin piecewise-quadratic coupling layers achieve superior performance to affine coupling layers on these low-dimensional regression problems. The comparison is reported both as training error (KL divergence) and as the variance of estimating the average image intensity when drawing samples from each distribution. Notably, two piecewise-polynomial layers ($L = 2$) outperform sixteen affine layers ($L = 16$), so what changes is the modelling power per layer, not just depth.

#### One-Blob Encoding

To improve network performance, **one-blob encoding** generalizes one-hot encoding for continuous variables. For a scalar $s \in [0,1]$ and quantization into $k$ bins (typically $k=32$), a Gaussian kernel with $\sigma = 1/k$ is placed at $s$ and discretized into the bins.

Unlike one-hot encoding, one-blob encoding is lossless for continuous variables while stimulating localization of computation. This encoding effectively shuts down certain parts of the network, allowing specialization on various sub-domains.

#### Network Architecture

The neural network $m$ uses a **U-shaped architecture** with fully connected layers. For each coupling layer:

- Input: One-blob encoded partition $A$ dimensions and optional features (position, normal, etc.)
- Architecture: a U-net of 8 fully connected layers with ReLU activations, plus 2 layers that adapt the input and output dimensionality to and from 256 (10 layers per coupling layer)
- Outermost layers: 256 neurons, halved at each nesting level
- Output layer: Produces parameters for coupling transform ($Q$, or $W$ and $V$)

All inputs are one-blob encoded with $k=32$ bins. For 3D positions, each coordinate is normalized by the scene bounding box, encoded independently, and concatenated into a $3 \times k$ array. Directions are parameterized using cylindrical coordinates, transformed to $[0,1]$, and similarly encoded.

#### Optimization for Monte Carlo Integration

##### Minimizing KL Divergence

The Kullback-Leibler divergence between the ideal distribution $p(x)$ and learned $q(x;\theta)$ is:

$$
D_{KL}(p \| q; \theta) = \int_{\Omega} p(x) \log \frac{p(x)}{q(x;\theta)} dx
$$

The gradient with respect to trainable parameters $\theta$ is:

$$
\nabla_{\theta} D_{KL}(p \| q; \theta) = \mathbb{E}\left[-\frac{p(X)}{q(X;\theta)} \nabla_{\theta} \log q(X;\theta)\right]
$$

where the expectation is over $X \sim q(x;\theta)$.

Since $p(x) = f(x)/F$ and $F$ is unknown, the stochastic gradient uses unnormalized estimates:

$$
\nabla_{\theta} D_{KL}(p \| q; \theta) \approx -\frac{1}{N} \sum_{j=1}^{N} \frac{f(X_j)}{q(X_j;\theta)} \nabla_{\theta} \log q(X_j;\theta)
$$

where $X_j \sim q(x;\theta)$.

##### Minimizing Variance (χ² Divergence)

Directly minimizing the estimator variance is equivalent to minimizing the Pearson χ² divergence:

$$
\mathbb{V}\left[\frac{p(X)}{q(X;\theta)}\right] = \mathbb{E}\left[\frac{p(X)^2}{q(X;\theta)^2}\right] - \mathbb{E}\left[\frac{p(X)}{q(X;\theta)}\right]^2
$$

The stochastic gradient for variance minimization is:

$$
\nabla_{\theta} \mathbb{V}\left[\frac{p(X)}{q(X;\theta)}\right] = \mathbb{E}\left[-\left(\frac{p(X)}{q(X;\theta)}\right)^2 \nabla_{\theta} \log q(X;\theta)\right]
$$

In practice, this becomes:

$$
\nabla_{\theta} \mathbb{V} \approx -\frac{1}{N} \sum_{j=1}^{N} \left(\frac{f(X_j)}{q(X_j;\theta)}\right)^2 \nabla_{\theta} \log q(X_j;\theta)
$$

#### Primary-Sample-Space Path Sampling

The paper describes two distinct rendering applications. The first operates on whole paths rather than individual directions.

Using the path-integral formulation, a radiance measurement $I$ to a sensor is an integral over path space $\mathcal{P}$:

$$
\begin{equation}
I = \int_{\mathcal{P}} {\class{term-light}{L_e(\mathbf{x}_0, \mathbf{x}_1)}}\, T(\mathbf{x})\, W(\mathbf{x}_{k-1}, \mathbf{x}_k)\, \mathrm{d}\mathbf{x},
\label{eq:nis-path-integral}
\end{equation}
$$

where the chain of positions $\mathbf{x} = \mathbf{x}_0 \cdots \mathbf{x}_k$ is a single light path with $k$ vertices, the path throughput $T(\mathbf{x})$ quantifies the ability of $\mathbf{x}$ to transport radiance, ${\class{term-light}{L_e}}$ is emitted radiance, and $W$ is the sensor response to one unit of incident radiance. This is estimated as

$$
\langle I \rangle = \frac{1}{N} \sum_{j=1}^{N} \frac{{\class{term-light}{L_e(\mathbf{x}_{j0}, \mathbf{x}_{j1})}}\, T(\mathbf{x}_j)\, W(\mathbf{x}_{jk-1}, \mathbf{x}_{jk})}{q(\mathbf{x}_j)},
$$

with $q(\mathbf{x})$ the joint probability density of generating all $k$ vertices of path $\mathbf{x}$.

Drawing samples from that joint distribution is difficult because the vertices are constrained to reside on surfaces. The alternative is to operate in **primary sample space** (PSS), represented by a unit hypercube $\mathcal{U}$: a path is obtained by transforming a vector of random numbers $z \in \mathcal{U}$ using a standard path-construction technique $\rho$ (e.g. camera tracing), $\mathbf{x} = \rho(z)$.

Operating in PSS has two advantages relevant here. The sampling routine is evaluated **once per path** rather than once per path vertex, and the generic nature of PSS coordinates lets the path construction be treated as a black box, so importance sampling of paths can be applied on top of an existing renderer without modifying its internals.

#### Application to Path Guiding

For path guiding in rendering, the goal is to learn directional sampling densities $q(\omega|x,\omega_o)$ proportional to the product of incident illumination and BSDF in the rendering equation:

$$
{\class{term-light}{L_o(x,\omega_o)}} = {\class{term-light}{L_e(x,\omega_o)}} + \int_{\Omega} L(x,\omega) {\class{term-bsdf}{f_s(x,\omega_o,\omega)}} |\cos\gamma| d\omega
$$

The reflected radiance estimator is:

$$
\langle {\class{term-light}{L_r(x,\omega_o)}} \rangle = \frac{1}{N} \sum_{j=1}^{N} \frac{L(x,\omega_j) {\class{term-bsdf}{f_s(x,\omega_o,\omega_j)}} |\cos\gamma_j|}{q(\omega_j|x,\omega_o)}
$$

##### Sampling Strategy

Since the integration domain is 2D (the full sphere of directions, in world-space cylindrical coordinates), partitions $A$ and $B$ each contain one cylindrical coordinate dimension. To generate a sample:

1. Draw random pair $u \in [0,1]^2$ from uniform distribution
2. Pass through inverted coupling layers: $h_1^{-1}(\cdots h_L^{-1}(u))$
3. Transform to cylindrical coordinates to obtain direction $\omega$

The neural network $m$ takes as input:

- One cylindrical coordinate from partition $A$ (one-blob encoded, $k=32$)
- Surface position $x$ (normalized, one-blob encoded per dimension, total $3k$)
- Outgoing direction $\omega_o$ (cylindrical coords, one-blob encoded, total $2k$)
- Surface normal $\mathbf{n}(x)$ (one-blob encoded)
- Optional additional features

##### MIS-Aware Optimization

When combining the learned distribution $q$ with existing techniques (e.g., BSDF sampling) using multiple importance sampling (MIS), the effective PDF becomes:

$$
q'(\omega) = c \cdot q(\omega) + (1-c) \cdot p_{f_s}(\omega)
$$

where $c$ is the selection probability. The networks are optimized with respect to $q'$ instead of $q$, minimizing $D(p \| q')$ where $D$ is either KL or χ² divergence.

##### Learned Selection Probabilities

An additional network $\hat{m}$ learns approximately optimal selection probability $c = \ell(\hat{m}(x,\omega_o))$, where $\ell$ is the logistic function. This network is optimized jointly with the coupling layer networks using the same architecture except for the output layer.

#### Training Procedure

Training occurs online during rendering in an interleaved fashion:

1. **Sample Generation**: Draw samples using current network parameters
2. **Feedback**: Evaluate integrand $f(x)$ at sample locations
3. **Gradient Computation**: Compute stochastic gradient using KL or χ² loss
4. **Parameter Update**: Update network weights using Adam optimizer
5. **Iteration**: Repeat with updated network

Because the density is produced by networks, extra conditioning inputs (position, direction, normal, material parameters) can be added without designing new spatial data structures. The paper's implementation trains on minibatches of 100 000 samples drawn from a buffer of the latest 2 000 000 path samples. Rendering proceeds in power-of-two iterations whose images are weighted by their inverse mean pixel variance, and the networks are never reset.


{{< 
figure src="/images/path_tracing/nis/comparison.svg"
id="fig-comparison"
caption="The 32-bin piecewise-linear (4-th column) and 32-bin piecewise-quadratic (5-th column) coupling layers of NIS achieve superior performance compared to affine (multiply-add) coupling layers (Dinh et al. [[26]](#ref-26)) on low-dimensional regression problems. The false-colored distributions were obtained by optimizing KL divergence with uniformly drawn i.i.d. samples (weighted by the reference value) over the 2D image domain. The plots on the right show logarithmically scaled training error (KL divergence) and the variance of estimating the average image intensity when drawing samples from one of the distributions. (Image by Müller et al. [[6]](#ref-6))"
noinvert="true"
width="100%" 
>}}

#### Discussion and Future Work

**Runtime cost.** A practical sampling strategy needs a low computational cost of generating samples and evaluating their PDF, relative to the cost of evaluating the integrand. In the path-guiding applications the cost is dominated by evaluating the coupling layers:

| Stage | Share of time |
|---|---:|
| One-blob encoding | ~10% |
| Fully connected layers | ~60% |
| Piecewise-polynomial warp | ~30% |

This makes the overhead **prohibitive in simple scenes**. The paper is explicit that it focused on the theoretical challenge of applying neural networks to importance sampling, and that accelerating the computation is future work. Specialized hardware such as TensorCores, and computation-graph optimization such as TensorRT, are named as promising next steps.

The equal-time comparisons bear this out. Against unidirectional path tracing and PPG [[4]](#ref-4), product-driven neural path guiding performs competitively with PPG and outperforms unidirectional path tracing in scenes with difficult light transport, but **the radiance-driven PPG algorithm tends to perform best because of its low computational cost**, except when incident radiance is a poor approximation of the product. That exception is the opening the later product-sampling methods aim at.

**Optimizing for multiple integrals.** When the ground-truth density is available only in unnormalized form, the ignored factor $F$ scales all gradients uniformly and so does not affect the optimization. That argument holds for a *single* integration problem. In path sampling and path guiding the learned density is conditioned on additional dimensions, so many different integrals are being solved at once and the normalizing $F$ varies between them, which means the argument does not extend. Neglecting the normalization factors potentially influences the optimization negatively; tabulating $F$ was tried without noticeable improvement. This **stands as a limitation of applying the work to path guiding and path sampling**.

**Convergence of optimization.** Stochastic-gradient techniques do not converge to local optima but oscillate around them, which is visible both in the 2D examples and during neural path guiding. The standard remedy is decaying the learning rate over time; the authors opted not to, for simplicity.

### Real-Time Neural Radiance Caching (2021)

#### Overview

Real-time Neural Radiance Caching (NRC) [[7]](#ref-7) is a method for accelerating path-traced global illumination by approximating the scattered radiance field using a neural network. The system handles fully dynamic scenes without assumptions about lighting, geometry, or materials. The core idea is to **terminate paths early** by querying a neural cache once the path spread becomes large enough to blur small inaccuracies in the cache approximation.

The neural network approximates the scattered radiance ${\class{term-light}{L_s(x,\omega)}}$, which represents the radiative energy leaving point $x$ in direction $\omega$ after being scattered at $x$:

$$
{\class{term-light}{L_s(x,\omega)}} := \int_{S^2} {\class{term-bsdf}{f_s(x,\omega,\omega_i)}} {\class{term-light}{L_i(x,\omega_i)}} | \cos\theta_i| d\omega_i
$$

where ${\class{term-bsdf}{f_s}}$ is the BSDF, ${\class{term-light}{L_i}}$ is the incident radiance, and $\theta_i$ is the angle between $\omega_i$ and the surface normal at $x$.

#### Algorithm Design

{{< 
figure src="/images/path_tracing/nrc/training.svg"
id="fig-radiance-cache-png"
caption="For rendering, short \"rendering\" paths (e.g. $x_0 \cdots x_2$) are traced and terminated into the neural radiance cache; queries of cached radiance $\hat{L}_s$ are highlighted by red arrows. To optimize the cache, a small subset of the rendering paths is extended by a few vertices (called \"training suffix\", e.g. $y_2 \cdots y_4$). Radiance estimates are collected (blue arrows) to update the neural radiance cache along the vertices of the longer training path, reusing the initial path segment that was already traced for rendering. Furthermore, the online training together with the termination of training paths into the cache progressively increases the number of simulated light bounces. (Image by Müller et al. [[7]](#ref-7))"
width="80%" 
>}}

Rendering a single frame consists of two phases: computing pixel colors and updating the neural radiance cache.

##### Rendering Phase

Short **rendering paths** are traced (one per pixel) and terminated early when the neural cache approximation becomes sufficiently accurate. The termination criterion uses the area-spread heuristic from Bekaert et al. (2003), which compares the footprint of the path to the size of the directly visible surface in the image plane.

The area spread along subpath $x_1 \cdots x_n$ is approximated as:

$$
a(x_1 \cdots x_n) = \left(\sum_{i=2}^{n} \sqrt{\frac{\|x_{i-1} - x_i\|^2}{p(\omega_i \mid x_{i-1},\omega)\, |\cos\theta_i|}}\right)^2
$$

where $p$ is the BSDF sampling PDF and $\theta_i$ is the angle between $\omega_i$ and the surface normal at $x_i$.

{{< 
figure src="/images/path_tracing/nrc/radiance_cache_termination.svg"
id="fig-radiance-cache-termination"
caption="The short rendering paths are terminated into the neural radiance cache once their scattering interactions blur the signal sufficiently well. To this end, the size of the footprint of the path $a(x_1 x_2)$ is compared to the size of the directly visible surface in the image plane $a_0$. The longer training paths are terminated by the same heuristic applied to the vertices of the suffix, i.e. $a(x_2 x_3 x_4)$ is compared to $a_0$. (Image by Müller et al. [[7]](#ref-7))"
width="80%" 
>}}

The path is terminated when $a(x_1 \cdots x_n) > c \cdot a_0$, where $c = 0.01$ is a hyperparameter and $a_0$ is the spread at the primary vertex:

$$
a_0 := \frac{\|x_0 - x_1\|^2}{4\pi \cos\theta_1}
$$

At the terminal vertex $x_k$, the neural radiance cache $\hat{L}_s(x_k,\omega_k)$ is evaluated to approximate the scattered radiance.

##### Training Phase

A small fraction (typically under 3%) of rendering paths are extended by a few vertices to form **training paths**, the *training suffix* of {{< figref "fig-radiance-cache-png" >}}. These longer paths are terminated using the same area-spread heuristic applied to the training suffix. The collected radiance estimates along all vertices of the training paths serve as reference values for updating the neural cache.

#### Self-Training Strategy

Instead of using noisy Monte Carlo path-traced estimates as training targets, NRC employs **self-training** by evaluating the neural cache itself at terminal vertices of training paths. This approach trades variance for potential bias and enables progressive simulation of multi-bounce illumination through iteration.

Each training iteration increases the number of simulated light bounces by transporting radiance learned from previous iterations. To mitigate bias, a small fraction $u = 1/16$ of training paths are made truly unbiased by terminating only via Russian roulette.

The self-training mechanism resembles Q-learning and progressive radiosity algorithms that simulate multi-bounce transport by iterating single-bounce updates.

#### Temporal Stabilization

To prevent temporal flickering from aggressive optimization (high learning rates and multiple gradient descent steps per frame), an **exponential moving average (EMA)** is applied to the network weights:

$$
\bar{W}_t := \frac{(1-\alpha)\, W_t + \alpha\, \eta_{t-1}\, \bar{W}_{t-1}}{\eta_t}, \quad \text{where } \eta_t := 1 - \alpha^t
$$

This is the normalized (bias-corrected) average: the weights of $W_t$ and $\bar{W}_{t-1}$ sum to one. The equation as printed in the paper (its Eq. 2) omits the $1/\eta_t$ on the second term, so its weights do not sum to one; NVIDIA's tiny-cuda-nn EMA implementation applies the $1/\eta_t$ factor to both terms, as written here.

The parameter $\alpha = 0.99$ balances fast adaptation with temporal stability. The EMA weights $\bar{W}_t$ are used for rendering queries, while raw weights $W_t$ continue to be optimized.

#### Network Architecture and Input Encoding

Parameters and their encoding, amounting to $62$ dimensions: `freq` denotes frequency encoding [Mildenhall et al. 2020], `ob` denotes one-blob encoding [Müller et al. 2019], `sph` denotes a conversion to spherical coordinates normalized to $[0,1]^2$, and `id` is the identity.

| Parameter             | Symbol                   | with Encoding                                      |
|----------------------|---------------------------|----------------------------------------------------|
| Position             | $ \mathbf{x} \in \mathbb{R}^3 $        | $\mathrm{freq}(\mathbf{x}) \in \mathbb{R}^{3 \times 12}$ |
| Scattered dir.       | $ \omega \in S^2 $        | $\mathrm{ob}(\mathrm{sph}(\omega)) \in \mathbb{R}^{2 \times 4}$ |
| Surface normal       | $ \mathbf{n}(\mathbf{x}) \in S^2 $ | $\mathrm{ob}(\mathrm{sph}(\mathbf{n}(\mathbf{x}))) \in \mathbb{R}^{2 \times 4}$ |
| Surface roughness    | $ r(\mathbf{x}, \omega) \in \mathbb{R} $ | $\mathrm{ob}\!\left( 1 - e^{-r(\mathbf{x},\omega)} \right) \in \mathbb{R}^{4}$ |
| Diffuse reflectance  | $ \alpha(\mathbf{x}, \omega) \in \mathbb{R}^3 $ | $\mathrm{id}(\alpha(\mathbf{x},\omega)) \in \mathbb{R}^3$ |
| Specular reflectance | $ \beta(\mathbf{x}, \omega) \in \mathbb{R}^3 $ | $\mathrm{id}(\beta(\mathbf{x},\omega)) \in \mathbb{R}^3$ |

**Frequency encoding** ($\mathrm{freq}$) is applied to position using 12 sine functions with frequencies $2^d$, $d \in \{0, \ldots, 11\}$. **One-blob encoding** ($\mathrm{ob}$) with $k=4$ evenly-spaced blobs is used for directional parameters and roughness. Diffuse and specular reflectances are passed directly ($\mathrm{id}$).

#### Training Budget and Amortization

The training budget is kept stable and independent of image resolution by using a fixed number of training records per frame. Training paths are interleaved with rendering paths using a tiling mechanism: one path per tile is promoted to a training path using a random offset.

Training uses $s = 4$ batches of $l = 16384$ records each (65536 total per frame). The tile size is dynamically adjusted to match this target budget. Cache updates and queries together cost about 2.6 ms per frame at Full HD; training alone averages about 1.1 ms.

#### Loss Function and Optimization

The network is optimized with the relative L2 loss of Lehtinen et al. (2018), which admits unbiased gradient estimates when the training targets are noisy. The loss is normalized by the network's own prediction:

$$
\mathcal{L}^2\big(L_s(x,\omega), \hat{L}_s(x,\omega;W_t)\big) := \frac{\big(L_s(x,\omega) - \hat{L}_s(x,\omega;W_t)\big)^2}{\mathrm{sg}\big(\hat{L}_s(x,\omega;W_t)\big)^2 + \epsilon},\quad \epsilon = 0.01,
$$

where $\mathrm{sg}(\cdot)$ stops the gradient (its argument is treated as a constant). The targets are the radiance estimates collected at every vertex of the training paths, and optimization uses Adam.

Four gradient descent steps are performed per frame on disjoint random subsets of the frame's training data, so no record is seen twice. The high learning rate and multiple steps per frame enable rapid adaptation to dynamic scenes.

#### Fully Fused Neural Networks

The real-time budget is only met because of how the network is implemented. Written from scratch in a GPU programming language to exploit the memory hierarchy, it outperforms TensorFlow (v2.5.0) by almost an order of magnitude.

The reasoning behind that speedup matters beyond this paper, because it explains a constraint every real-time neural guiding method inherits. The computational cost of a fully connected network **scales quadratically with its width**, whereas its **memory traffic scales linearly**. Modern GPUs have vastly larger computational throughput than memory bandwidth, so for *narrow* networks like this one the bottleneck is the linear memory traffic rather than the arithmetic. The key to performance is therefore minimizing traffic to slow global memory (VRAM and high-level caches), which is what "fully fused" means: the whole network is evaluated within a single kernel, keeping intermediate activations in registers and shared memory.

This is why NRC can afford a network in the inner loop at all, and why the NIS runtime-cost problem discussed above is not a fixed property of neural methods.

#### Discussion and Future Work

**Precomputation.** No precomputation is performed. It could be incorporated, either by pre-training a good initial network state or by a low-overhead meta-learning technique, but it is considered strictly optional. Since the cache adapts rapidly to the current situation (8 frames are sufficient), precomputation can be of only limited benefit.

**Cache artifacts.** High-frequency temporal flickering is suppressed using an exponential moving average over the optimized network weights, but **subtle low-frequency scintillation remains**. Additionally, the frequency encoding causes distracting axis-aligned oscillations throughout space. These artifacts are imperceptible when the cache is used at non-primary path vertices, but using the cache *at the primary vertex* would be desirable in cases where noise is not an option, and stabilizing the prediction for that remains future work.

**Additional network inputs.** Input encodings alone are not sufficient to learn a detailed, high-frequency representation of features in the scattered radiance that **correlate poorly with all of the network inputs**. Shadows and caustics are the named examples: they are unrelated to the local surface attributes passed to the network, and are therefore learned at a much slower rate, or not at all if the network is too small or the radiance estimates are too noisy.

**Volumes.** The cache parameterization is not tied to a surface representation, so it can also be used in volumetric rendering. A straightforward implementation yields promising results; for volume queries the undefined parameters (surface roughness, normal, albedo and specular coefficients) are simply set to default constants.

### Spatio-Directional Mixture Models (2022)

#### Overview

Earlier caching-based guiding methods separate the spatial and directional domains: Vorba et al. fit a 2D directional mixture per spatial cache point, and PPG's SD-tree stores a *separate* directional quadtree per spatial leaf. (Neural approaches such as NIS also condition on continuous position, but with a much more expensive network.) Dodik et al. [[3]](#ref-3) instead model incident radiance as a single **5D mixture over the joint spatio-directional domain**, accelerated by a kD-tree, and approximate BSDFs as pre-trained $n$D mixtures where $n$ is the number of BSDF parameters.

This addresses two challenges:

1. **The 5D representation naturally captures correlation between the spatial and directional dimensions.** Such correlations are present in parallax and caustics, effects where the right direction to sample changes systematically as the shading point moves, which a per-cell directional distribution cannot express.
2. **A tangent-space parameterization of Gaussians allows approximate product sampling with arbitrarily oriented BSDFs.** Existing models could only do this by either foregoing anisotropy of the mixture components, or by representing the radiance field in local (normal-aligned) coordinates, both of which make the radiance field harder to learn.

A further benefit of the tangent-space parameterization is that each individual Gaussian is mapped to the solid sphere with **low distortion near its center of mass**. The method performs especially well on scenes with small, localized luminaires that induce high spatio-directional correlation in the incident radiance.

{{< figure
src="/images/path_tracing/sdmm/representation.svg"
id="fig-sdmm-representation"
caption="Comparison of the SDMM representation with previous work. (a) A 2D incident radiance field with one spatial and one angular dimension $(x, \omega)$. The two points $x_0$ and $x_1$ are directly illuminated by an area light. (b) to (d) visualize how the incident radiance field is represented as a function of $x$ and $\omega$ in previous work and in SDMM. In this setup, (b) approximates the angular variation of incident radiance with two 1D GMMs at discrete spatial positions, (c) discretize both dimensions in a 2D adaptive hierarchical data structure and finally, SDMM in (d) represents the entire spatio-angular domain with a 2D GMM which captures the correlation between the dimensions. (Image by Dodik et al. [[3]](#ref-3))"
width="80%"
>}}

#### Tangent-Space Gaussian Mixtures

Because incident radiance is represented as a spatio-directional 5D mixture rather than as caches associated with geometric surfaces, a global **world-space** parameterization is forced. Product sampling between world-space radiance and a locally parameterized BSDF then requires rotating the mixtures into the same coordinate frame.

In a tangent-space model on a sphere with $K$ mixture components, the $k$-th Gaussian is parameterized by a **3D world-space unit-length mean vector $\mu_k \in S^2$** and a **$2 \times 2$ tangent-space covariance matrix $\Sigma_k \in \mathbb{R}^{2\times2}$**. The mean vector $\mu_k$ determines the tangent space that $\Sigma_k$ lives in.

{{< figure
src="/images/path_tracing/sdmm/gmm.svg"
id="fig-sdmm-gmm"
caption="(a) A 2-component example of a tangent-space Gaussian mixture model. Each Gaussian component is parameterized by a unit-length mean vector $\mu_k$, pointing to its position on the sphere, and a covariance matrix $\Sigma_k$ describing the Gaussian's shape in the corresponding *tangent space* of the sphere. (b) The $\mu$-centered tangent space is a circular 2D parameterization of the surface of the sphere. World-space directions $\omega$ are transformed to tangent-space directions $\nu$ and back via $\nu = \log_\mu(\omega)$ and $\omega = \exp_\mu(\nu)$. (Image by Dodik et al. [[3]](#ref-3))"
width="85%"
>}}

This is the property that makes the whole approach work: the representation **can be rotated into any local shading frame for product sampling** by rotating the mean vectors $\mu_k$ to the local frame and applying the azimuthal part of the rotation to the covariance matrices $\Sigma_k$.

**Tangent spaces.** The tangent space at a mean vector $\mu$ is a circular 2D parameterization of the sphere's surface. Mapping between the $\mu$-centered tangent space and the sphere uses the **log and exp maps**, which are each other's inverse:

$$
\begin{equation}
\nu = \log_\mu(\omega), \qquad \omega = \exp_\mu(\nu),
\label{eq:sdmm-logexp}
\end{equation}
$$

where $\omega \in S^2$ is a direction vector and $\nu \in \mathbb{R}^2$ is a tangent-space coordinate with $\lVert\nu\rVert < \pi$. The **azimuthal equidistant projection** defines these maps:

$$
\begin{equation}
\log_\mu(\omega) = \left( \frac{\omega^{\circlearrowleft}_x}{\operatorname{sinc}(\cos^{-1}(\omega^{\circlearrowleft}_z))},\; \frac{\omega^{\circlearrowleft}_y}{\operatorname{sinc}(\cos^{-1}(\omega^{\circlearrowleft}_z))} \right)^{\!\intercal}, \qquad \omega^{\circlearrowleft} = R_\mu \omega,
\label{eq:sdmm-log}
\end{equation}
$$

$$
\begin{equation}
\exp_\mu(\nu) = R_\mu^{-1} \big( \nu_u \operatorname{sinc}(\lVert\nu\rVert),\; \nu_v \operatorname{sinc}(\lVert\nu\rVert),\; \cos(\lVert\nu\rVert) \big)^{\!\intercal},
\label{eq:sdmm-exp}
\end{equation}
$$

where $R_\mu$ is the rotation matrix taking $\mu$ to $(0,0,1)$ and $\operatorname{sinc}$ is the unnormalized sinc function.

Because the formulation is expressed through log and exp maps, **spherical and Euclidean dimensions can be treated using the same tangent-space formulae**, which is what allows a single mixture to span the joint 5D spatio-directional domain.

#### Efficient Conditioning and EM

Once the joint distribution $p_{L_i}(\omega_i, x)$ has been optimized by EM, it must be conditioned on $x$ on the fly during rendering in order to importance sample $p_{L_i}(\omega_i \mid x)$.

The obstacle is cost: **conditioning is linear in the number of mixture components, and the 5D Gaussian mixtures require thousands of components** to cover the incident radiance field well. Done naïvely across all of them, conditioning is prohibitively expensive.

The observation that makes it tractable is that only those mixture components whose spatial mean $\mu^x_k$ is in close proximity to the query point contribute meaningfully. A **kD-tree spatial subdivision** exploits this: it significantly reduces the computational requirements of updating and querying the model while still capturing correlations within a leaf node.

{{< figure
src="/images/path_tracing/sdmm/sdmm.svg"
id="fig-sdmm-kdtree"
caption="Spatial components of the SDMM. (a) A small fraction of the mixture components within a single model and their spatial overlap. Due to the high amount of overlap, the computational requirements of updating and querying the model can be linear to the total number of components. A $k$D-tree spatial subdivision scheme (b) significantly reduces these computational requirements while still capturing correlations within a leaf node. (Image by Dodik et al. [[3]](#ref-3))"
width="85%"
>}}

#### Product Sampling from Mixed-Orientation Gaussians

After conditioning $p_{L_i}(\omega_i \mid x)$ and $p_{f_s}(\omega_i \mid \omega_o, \varphi)$, the final step is computing their product distribution so it can be importance sampled. Both mixtures are first rotated into the same coordinate frame by applying the appropriate rotation matrix to the mean vectors $\mu_k$ of one of them.

Computing the product requires the product between **each pair of mixture components**. For a pair parameterized by $(\mu_1, \Sigma_1)$ and $(\mu_2, \Sigma_2)$, the two must be expressed within the same tangent space; without loss of generality the second is parameterized in the $\mu_1$-centered tangent space.

In that tangent space the second mean vector is expressed with the exp-map as $\exp_{\mu_1}(\mu_2)$. **How $\Sigma_2$ should transform between tangent spaces is the harder question.** The naïve approach of simply reusing the covariance matrix is not correct, and the paper develops a first-order approximation that enables an accurate tangent-space covariance update.

This distinguishes SDMM-product from the <span class="term-light">radiance</span>-only guiding of PPG. The <span class="term-bsdf">BSDF</span> factor enters the guiding distribution itself through an approximate closed-form product of mixture components (first-order covariance transform, keeping only the two largest BSDF components). It is no longer left entirely to BSDF sampling, although a 30% BSDF sampling fraction is still mixed in.

#### Discussion and Future Work

**Mini-batch EM versus stepwise EM.** Stepwise EM is an alternative online EM algorithm. The difference is the frequency of the Robbins–Monro update of the sufficient statistics: stepwise EM updates **per sample**, mini-batch EM **per mini-batch**. Mini-batch EM is preferred for two reasons. The update is expensive in tangent spaces, and stepwise EM **unduly weights earlier samples within the same batch higher**, because they experience the Robbins–Monro update earlier despite being sampled from the same distribution. That uneven averaging of the batch's sufficient statistics unnecessarily increases the variance of the optimization.

**Practicality.** This is stated frankly in the paper and is the main limitation:

*   Against PPG [[4]](#ref-4), both the radiance- and product-based approaches show **superior equal-sample-count error**, but the computational overhead of the Mitsuba implementation means better *overall efficiency* on **only a subset of scenes**.
*   Against vMF mixtures the gap is larger: **similar error at equal sample counts, but their lower computational cost gives better efficiency in most scenes.**
*   The conclusion drawn is that the practicality of spatio-directional mixture models is limited, and further research into efficient implementations and approximations is needed. Automatic pruning of the product mixture is suggested as one promising optimization. The bottleneck may also shift in more complex scenes, where ray tracing and shading cost more.

**Combination with reprojection.** Learning 5D mixtures and reprojecting 2D mixtures are not mutually exclusive. The reprojection heuristic breaks down in some situations, with **lensing effects** the given example, where the appropriate hemispherical movement is actually the *reverse* of what reprojection would predict.

### Neural Parametric Mixtures (2023)

#### Overview

Neural Parametric Mixtures (NPM) [[8]](#ref-8) encode a spatially varying directional distribution as the parameters of a von Mises–Fisher mixture, decoded on demand from a compact multi-resolution embedding.
{{< 
figure src="/images/path_tracing/npm/neuropara-overview.svg"
id="fig-npm-overview"
caption="High-level illustration of Neural Parametric Mixtures (NPM). The spatially varying target distributions are encoded implicitly in the multi-resolution embedding. When the distribution of a spatial location $x$ is queried, (1) the features assigned to the nearby grid points surrounding $x$ are interpolated at each level, and concatenated with other levels to obtain the spatial embedding $G(x)$. (2) the spatial embedding is then combined with other inputs to (3) feed into the lightweight MLP for (4) decoding the parameters $\Theta$ of the vMF mixture $\mathcal{V}(\omega_i \mid \Theta)$ with $K$ components. The parametric distribution is then (5) used to importance sample the scattering direction. The resulting MC radiance estimate $\langle {\class{term-light}{L_i(x,\omega_i)}}\rangle$ is used to estimate the training gradient $\nabla_\Theta D_{\mathrm{KL}}$ (see [Loss: KL Divergence](#loss-kl-divergence)), which is then back-propagated through these differentiable stages to optimize the NPM representation (dashed lines). (Image by Dong et al. [[8]](#ref-8))"
width="100%" 
>}}


#### von Mises–Fisher Distribution

The **vMF distribution** is an isotropic probability distribution on the unit sphere $\mathbb{S}^{D-1}$, analogous to a Gaussian in $\mathbb{R}^D$.  
It is parameterized by:

- **Mean direction**: $\mu \in \mathbb{S}^{D-1}$  
- **Concentration**: $\kappa \in [0,\infty)$

The concentration is written $\kappa$ in the path-guiding literature and $\tau$ by Straub [[22]](#ref-22), whose figures are used below; the two denote the same parameter.

Its PDF for direction $\omega$ is:
$$
v(\omega \mid \mu,\kappa)= C_D(\kappa)\,\exp(\kappa\,\mu^\top \omega)
$$

where $C_D(\kappa)$ normalizes the density; on $\mathbb{S}^2$, the case NPM uses, $C_3(\kappa)=\frac{\kappa}{4\pi\sinh\kappa}$.

{{< figure src="/images/path_tracing/npm/vmf.svg"
id="fig-vmf-2d"
caption="Depiction of 2D von-Mises-Fisher distributions with increasing concentration $\tau$. As $\tau \to \infty$ the von-Mises-Fisher distribution approaches a delta function on the sphere at its mode $\mu$. (Image by Straub [[22]](#ref-22))" width="100%" >}}

{{< figure src="/images/path_tracing/npm/vmf_3d.svg"
id="fig-vmf-3d"
noinvert="true"
caption="The von-Mises-Fisher distributions on the unit sphere in 3D, $\mathbb{S}^2$, with mean at the north pole and concentrations $\tau$. The color encodes the probability density function value of the vMF over the whole sphere. From the coloring it can be observed that the von-Mises-Fisher distribution is isotropic. (Image by Straub [[22]](#ref-22))" width="100%" >}}


#### vMF Mixture Model

NPM predicts a **mixture** of $K$ vMF lobes:

$$
V(\omega \mid \Theta)=
\sum_{k=1}^K
\lambda_k \,
v(\omega\mid\mu_k,\kappa_k).
$$

Mixture parameters:

- $\lambda_k \in [0,1]$ (softmax output), mixture weights  
- $\sum_k \lambda_k = 1$  
- $\mu_k \in \mathbb{S}^2$, mean directions  
- $\kappa_k \in [0,\infty)$, concentrations  
- Full parameter set:  
  $$
  \Theta = \{ (\lambda_k,\mu_k,\kappa_k) \}_{k=1}^K
  $$

{{< figure src="/images/path_tracing/npm/vmf_mixture.png"
caption="vMF Mixture with $K=3$ components" 
width="60%" >}}

<iframe src="/interactive/vmf.html"
  loading="lazy"
  fetchpriority="low"
        width="100%"
        height="445"
        frameborder="0">
</iframe>


#### Radiance-Based NPM

Goal: make the mixture proportional to incident radiance:

$$
V(\omega_i\mid\Theta(x))
\propto
{\class{term-light}{L_i(x,\omega_i)}}.
$$

Traditional path guiding uses kd-trees / octrees → discretization → **parallax error**.

{{< figure src="/images/path_tracing/npm/parallax.svg"
caption="Parallax issue caused by spatial discretizations (a). For a subdivided volume $\mathcal{S}(x)$ in (a), the guiding distribution is marginalized with training samples scattered over the volume $\mathcal{S}(x)$, and is shared by different positions (e.g., $x_1$ and $x_2$). NPM does not suffer from parallax because it implicitly represents a monolithic function, continuously mapping from spatial positions to parametric guiding distributions, as shown in (b). (Image by Dong et al. [[8]](#ref-8))" width="100%" >}}

NPM instead learns a **continuous implicit function**:

$$
\mathrm{NPM}(x\mid\Phi)=\hat{\Theta}(x),
$$

where $\Phi$ are all trainable parameters (embedding + MLP).
#### Extended Conditioning on Outgoing Direction

For surface transport, the learned guiding distribution benefits from additionally conditioning on the outgoing direction $\omega_o$.  
The extended model therefore learns  
$$
\mathrm{NPM}_\Phi : (\mathbf{x},\omega_o) \mapsto \hat{\Theta}(\mathbf{x},\omega_o),
$$
so that the decoded mixture can follow the BSDF lobe and cosine term as well as incident radiance (the full integrand).  
$\omega_o$ and the surface normal are encoded with a spherical-harmonics basis (as in Ref-NeRF), and surface normal and roughness are added as auxiliary inputs. This improves accuracy at a modest cost (roughly 10–20% longer render time than NPM-radiance in the paper's timing table).


#### Optimizing NPM

Raw network outputs $(\lambda'_k,\kappa'_k,\theta'_k,\phi'_k)$ are mapped into valid mixture parameters using:

| Parameter | Domain | Activation | Mapping |
|----------|--------|------------|---------|
| $\kappa_k$ | $[0,\infty)$ | Exponential | $\kappa_k=\exp(\kappa'_k)$ |
| $\lambda_k$ | $[0,1]$ | Softmax | $\lambda_k=\frac{\exp(\lambda'_k)}{\sum_j\exp(\lambda'_j)}$ |
| $\theta_k,\phi_k$ (spherical coords of $\mu_k$) | $[0,1]$ | Logistic | $\theta_k=\frac1{1+\exp(-\theta'_k)}$ |

Unit directions are then (the paper only states that $(\theta_k,\phi_k)$ are the normalized spherical coordinates of $\mu_k$; the explicit formula below is the natural reading):
$$
\mu_k = \bigl(
\sin(\pi\theta_k)\cos(2\pi\phi_k),\,
\sin(\pi\theta_k)\sin(2\pi\phi_k),\,
\cos(\pi\theta_k)
\bigr).
$$


#### Loss: KL Divergence

Target:
$$
D(\omega)\propto {\class{term-light}{L_i(x,\omega)}}.
$$

KL divergence:
$$
D_{KL}(D\|V)
=\int D(\omega)
\log\frac{D(\omega)}{V(\omega\mid\hat{\Theta})}\,d\omega.
$$

Monte Carlo estimate:
$$
D_{KL}\approx
\frac1N\sum_j
\frac{D(\omega_j)}{p(\omega_j)}
\log\frac{D(\omega_j)}{V(\omega_j)}.
$$

Gradient:
$$
\nabla_\Theta D_{KL}\approx
-\frac1N\sum_j
\frac{D(\omega_j)\,\nabla_\Theta V(\omega_j)}{p(\omega_j)V(\omega_j)}.
$$

Training objective:
$$
\Phi^*=\arg\min_\Phi
\mathbb{E}_x[D_{KL}(D(x)\|V;\Theta(x))].
$$


#### Multi-resolution Spatial Embedding

NPM uses a learnable multi-resolution grid to encode spatial variation:

$$
\mathrm{NPM}_\Phi:x\mapsto\hat{\Theta}(x).
$$

A single MLP struggles to represent high-frequency spatial variation; therefore NPM uses **L grids** with exponentially increasing resolution.  
Each grid vertex stores a trainable feature vector $\mathbf{v}\in\mathbb{R}^F$.


#### Querying the Embedding

For query position $x$:

1. Gather the 8 neighboring grid features $V_\ell[x]$.  
2. Apply trilinear interpolation.  
3. Concatenate multi-resolution features:

$$
G(x\mid\Phi_E)=
\bigoplus_{\ell=1}^L
\operatorname{trilinear}(x,V_\ell[x]),
\qquad
G:\mathbb{R}^3\to\mathbb{R}^{L\times F}.
$$

(The paper's equation writes "bilinear", but the interpolation is over the eight corners of a 3D grid cell, i.e. trilinear.)

{{< figure src="/images/path_tracing/npm/emb_interpolation.svg"
caption="Embedding interpolation: the features assigned to the nearby grid points surrounding $x$ are interpolated at each level $G_l$, and concatenated across levels to obtain the spatial embedding $G(x)$. (Detail of the NPM overview figure above; image by Dong et al. [[8]](#ref-8))"
width="40%" >}}


#### Decoding Mixture Parameters

The spatial embedding is combined with auxiliary inputs (normal, roughness, $\omega_o$):

$$
\hat{\Theta}(x,\omega_o)=
\mathrm{MLP}\big(G(x\mid\Phi_E)\oplus \mathrm{SH}(\omega_o)\oplus \mathrm{SH}(n)\oplus r \mid\Phi_M\big)
$$

(shown here for NPM-product; NPM-radiance omits $\omega_o$).

{{< figure src="/images/path_tracing/npm/decoding_parameters.svg"
caption="Decoding the parameters $\Theta$ of the vMF mixture $\mathcal{V}(\omega_i \mid \Theta)$ with $K$ components from the MLP output, giving the learned parametric mixture used to importance sample the scattering direction. (Detail of the NPM overview figure above; image by Dong et al. [[8]](#ref-8))"
width="100%" >}}


#### Product Distribution for Importance Sampling  

NPM-product adds $\omega_o$ as an input, so the network outputs $\hat\Theta(x,\omega_o)$, and the decoded mixture is trained directly against the **full integrand**:

$$
\boxed{
\mathcal{V}(\omega_i \mid \hat{\Theta}(x,\omega_o))
\;\propto\;
{\class{term-bsdf}{f_s(x,\omega_o,\omega_i)}}\,
{\class{term-light}{L_i(x,\omega_i)}}\,
|\cos\theta_i|
}
$$

No precomputed BSDF mixture is multiplied in: the BSDF and cosine factors are learned by the network itself. During rendering, directions are drawn from a 50/50 mixture of BSDF sampling and $\mathcal{V}$.


#### Online Training Scheme

**Renderer integration.** The method is implemented on a custom GPU-accelerated renderer based on OptiX, with training and inference integrated into a **wavefront-style path tracer**. Splitting the traditional megakernel path tracer into multiple specialized kernels lets ray casting, importance sampling, and BSDF evaluation be performed in coherent chunks over large sets of traced paths, which improves GPU thread utilization by reducing control-flow divergence.

The reason this matters for a *neural* guiding method specifically: it allows the guiding distributions to be sampled and evaluated **at each vertex along the path in parallel**, significantly accelerating training and inference. Training and inference samples are placed into queues using a **structure-of-arrays (SoA)** memory layout to improve memory locality. At each ray intersection of a chunk of traced paths, the queued queries for guiding distributions are processed via **batched network inference**; sampling and evaluation then run in their own specialized kernels before the next ray-cast kernel.

This gives maximum parallelism through large-batch training and inference, minimizing latency from waiting network queries while **avoiding inefficient single-sample inference**, the failure mode that made earlier neural guiding methods impractical.

**Training.** The same configuration trains every scene online during rendering, with **no scene-specific fine-tuning or precomputation**. MC radiance estimates are collected along each traced path and split into mini-batches.

#### Guiding Network

Implemented on the `tiny-cuda-nn` framework. Concrete configuration:

| Component | Setting |
|---|---|
| MLP (both NPM-radiance and NPM-product) | 3 linear layers of width 64 |
| Activation | ReLU, except the last layer which uses custom mapping functions |
| vMF components | $K = 8$, i.e. $\Theta \in \mathbb{R}^{8 \times 4}$ |
| Spatial embedding levels | $L = 8$ grids of increasing resolution |
| Coarsest / finest resolution | $D_1 = 8$ / $D_8 = 86$ |
| Features per level | $F = 4$ floats |

#### Discussion

**Performance analysis.** At $1280 \times 720$, one batched NPM evaluation over a full frame of queries (network inference plus importance sampling the decoded mixtures) takes about **3 ms**. A training step over a batch of $2^{18}$ samples costs about **10 ms**, so a typical training process of roughly 1000 steps takes about **10 s to converge** on a single GPU. NPM holds about **2M learnable parameters**, giving a memory consumption of **under 10 MB**.

The compact implicit representation results in less control-flow divergence, better memory locality and better caching performance. Together these make the method practical for modern GPU parallelization, **which is often harder to achieve with the tree-like spatial subdivision schemes used by most previous guiding methods**, a direct contrast with PPG's SD-tree [[4]](#ref-4).

**Alternative solutions to parallax.** Other work tackles the same problem: Dodik et al. [[3]](#ref-3) use spatio-directional mixtures conditioned on $\mathbf{x}$ and $\omega_o$ to correlate target distributions with spatial positions, and Ruppert et al. [2020] (cited in [[8]](#ref-8)) warp the guiding distributions within spatial subdivisions to resemble the true distribution. Both adopt sophisticated strategies that are **difficult to parallelize efficiently on GPUs**, for example batched expectation-maximization.

**Extensions.** Several established path-guiding extensions are noted as straightforward to integrate and promising: the **BSDF selection probability** could be learned by the network or by a caching strategy, better handling near-specular surfaces; and the **variance-aware target distribution** of Rath et al. [2020] (cited in [[8]](#ref-8)) could be learned to account for the variance within noisy MC estimates.

#### Limitations

*   **vMF is isotropic**, so complex or elongated lobes require many mixture components. (Not stated by Dong et al.; this is the motivation [NASG](#normalized-anisotropic-spherical-gaussians-2024) gives for anisotropic lobes.)
*   **The number of vMF components $K$ is fixed** at 8, so the representation cannot adapt its capacity to local complexity.
*   The BSDF selection probability is **not** learned in this work, which affects near-specular surfaces.

### Normalized Anisotropic Spherical Gaussians (2024)

#### Overview

A vMF mixture is isotropic: each lobe is radially symmetric about its axis, so elongated highlights have to be built out of several components. Developed concurrently with NPM, Huang et al. [[16]](#ref-16) use the same "network outputs a parametric mixture" idea but replace the isotropic lobe with an anisotropic distribution designed specifically so that it remains cheap to normalize and sample, and learn a mixture of these online with a single MLP to approximate the **full scattered radiance product**.

#### Normalized Anisotropic Spherical Gaussian Mixture

##### Background

The governing constraint on the representation is stated directly: one of the main requirements for progressive learning of a distribution with neural networks is that models be **easily normalizable**, implying that a model must have a **closed-form integral**.

*Marginalizable density model approximation (MDMA).* A bivariate distribution can be modelled as

$$
\begin{equation}
D(x, y) = \sum_{i,j} A_{ij}\, \phi_{1i}(x)\, \phi_{2j}(y),
\label{eq:nasg-mdma}
\end{equation}
$$

where $\phi_{1i}$ and $\phi_{2j}$ are 1D normalized distributions and $A_{ij}$ are normalized coefficients summing to 1. In practice the 1D distributions can be piecewise-linear or piecewise-quadratic splines. With a limited number of components MDMA learns only a coarse distribution, so it always gives poor results for distributions with high-frequency spots.

Despite that limited accuracy, MDMA **works well at learning distributions from sparse, noisy samples** compared with non-normalizable models such as polynomial models or spherical harmonics: during training, samples with high energy can lower the contribution of other areas, and the training eventually converges. This property is what matters when learning from sparse online rendering samples.

*Normalized Gaussian mixtures* address the accuracy limitation:

$$
\begin{equation}
D(x) = \sum_i^N A_i \frac{G_i(x; \theta_i)}{K_i},
\label{eq:nasg-mixture}
\end{equation}
$$

where $G_i(x;\theta_i)$ are Gaussian distributions parameterized by $\theta_i$, $K_i$ are normalizing factors, and $A_i$ are normalized weights with $\sum_i A_i = 1$. Gaussian mixtures are highly expressive and easily normalizable.

The *spherical Gaussian* (SG) is the univariate Gaussian's spherical-domain variant,

$$
\begin{equation}
G(v; \mu, \lambda) = \exp\big(\lambda(\mu \cdot v - 1)\big),
\label{eq:nasg-sg}
\end{equation}
$$

with $v$ a unit direction, $\mu$ the lobe axis and $\lambda$ the sharpness. It is isotropic about $\mu$, and its integral is

$$
\begin{equation}
\int_{S^2} G(v;\mu,\lambda)\, \mathrm{d}\omega = \frac{2\pi}{\lambda}\left(1-e^{-2\lambda}\right).
\label{eq:nasg-sg-integral}
\end{equation}
$$

##### Normalized Anisotropic Spherical Gaussian

The Kent distribution is the obvious anisotropic candidate, but it is rejected for three specific reasons: **its integral must be approximated, it has precision issues, and it has no direct sampling algorithm**. The paper instead derives its own distribution, the Normalized Anisotropic Spherical Gaussian:

$$
\begin{equation}
G(v; [x,y,z], \lambda, a) =
\begin{cases}
\exp\!\left( 2\lambda \left( \dfrac{v \cdot z + 1}{2} \right)^{\!1 + \frac{a (v \cdot x)^2}{1 - (v \cdot z)^2}} - 2\lambda \right)
\left( \dfrac{v \cdot z + 1}{2} \right)^{\!\frac{a (v \cdot x)^2}{1 - (v \cdot z)^2}} & \text{if } v \neq \pm z \\[2ex]
1 & \text{if } v = z \\[1ex]
0 & \text{if } v = -z,
\end{cases}
\label{eq:nasg}
\end{equation}
$$

where $[x, y, z]$ form an orthogonal frame, $\lambda$ is sharpness, and $a$ controls the **eccentricity**. $G$ agrees with the spherical Gaussian when $a = 0$.

The derivation proceeds in two steps. First, expressing $v \neq \pm z$ in standard spherical coordinates, with polar angle $\theta$ and azimuthal angle $\phi$ measured with respect to the orthonormal frame, gives

$$
\begin{equation}
\left( \frac{v \cdot z + 1}{2} \right)^{\frac{a(v \cdot x)^2}{1 - (v\cdot z)^2}} = \left( \frac{\cos\theta + 1}{2} \right)^{a \cos^2\phi},
\label{eq:nasg-polar}
\end{equation}
$$

which introduces the **anisotropic nature of the distribution through the exponent $a\cos^2\phi$**. Second, a change of variables is effected in the integral of the SG in $\eqref{eq:nasg-sg-integral}$ so that the Jacobian in $\eqref{eq:nasg-polar}$ emerges as part of the corresponding Jacobian.

Unlike the ASG of Xu et al. [2013] (cited in [[16]](#ref-16)), NASG has an **analytical closed-form solution for its integral**, which makes it easy to normalize:

$$
\begin{equation}
K = \int_{S^2} G(v; [x,y,z], \lambda, a)\, \mathrm{d}\omega = \frac{2\pi \left( 1 - e^{-2\lambda} \right)}{\lambda \sqrt{1 + a}}.
\label{eq:nasg-norm}
\end{equation}
$$

so the NASG normalizer is simply the SG normalizer divided by $\sqrt{1+a}$.

{{< figure src="/images/path_tracing/nasg/nasg.svg" id="fig-nasg" noinvert="true" caption="Visualization of NASG component $G$ with different parameters. Note that $G$ agrees with spherical Gaussian when $a = 0$. (Image by Huang et al. [[16]](#ref-16))" width="100%" >}}

The properties that make it practical:

*   **Expressive.** It models anisotropic distributions, not just radially symmetric lobes.
*   **Numerically stable** for both high- and low-frequency distributions.
*   **Compact.** It is parameterized by only **seven scalars**, which matters for GPU computation because of the low bandwidth requirement.
*   **Efficiently sampleable**, with a direct sampling algorithm rather than a fallback.

One caveat the paper flags in a footnote: in the form of $\eqref{eq:nasg}$, NASG is **not continuous at $v = -z$ when $a > 0$**. It approaches 0 as $v$ tends to $-z$ along any meridian except those passing through $\pm y$ (i.e. $\phi = \pi/2$ and $\phi = 3\pi/2$), where it approaches $\exp(-2\lambda) > 0$. This discontinuity does not affect the application and can be resolved by introducing an auxiliary parameter.

#### Online Learning of the Density Model

##### Network Architecture

The network is kept deliberately simple given the performance requirements: a **four-layer MLP with 128 units per layer, without bias**.

The input consists of the shading point location $x$, outgoing ray direction $\omega_o$, and surface normal $n$. The location is encoded into a **57-dimensional vector**, giving an input size of $57 + 3 + 3 = 63$, **padded to 64 for hardware acceleration**, with the padded values set to 1, which serves as an alternative to the bias of the hidden layers.

Encoding follows [[6]](#ref-6)'s one-blob scheme rather than something more elaborate such as multiresolution hash encoding, because a pilot study showed very little improvement to justify the overhead:

| Parameter | Symbol | Encoding |
|---|---|---|
| Position | $p \in \mathbb{R}^3$ | $\mathrm{ob}(p)$ |
| Outgoing ray direction | $\omega_o \in [-1,1]^3$ | $\omega_o$ |
| Surface normal | $n \in [-1,1]^3$ | $n$ |

The lobe frame is parameterized by Euler angles $(\theta,\phi,\tau)$ (distinct from the polar coordinates of $v$ used above): $z=(\cos\phi\sin\theta,\ \sin\phi\sin\theta,\ \cos\theta)$ and $x=(\cos\theta\cos\phi\cos\tau-\sin\phi\sin\tau,\ \cos\theta\sin\phi\cos\tau+\cos\phi\sin\tau,\ -\sin\theta\cos\tau)$. Each component therefore has seven scalars, $\cos\theta,\sin\phi,\cos\phi,\sin\tau,\cos\tau,\lambda,a$, and the network outputs $8N+1$ values.

The network output is decoded into NASG mixture parameters:

| Parameter | Symbol | Decoding |
|---|---|---|
| $\cos\theta, \sin\phi, \cos\phi, \sin\tau, \cos\tau$ | $s_0 \in \mathbb{R}^{5 \times N}$ | $\mathrm{sigmoid}(s_0) \times 2 - 1$ |
| $\lambda, a$ | $s_1 \in \mathbb{R}^{2 \times N}$ | $e^{s_1}$ |
| Component weights | $A \in \mathbb{R}^N$ | $\mathrm{softmax}(A)$ |
| Selection probability | $c \in \mathbb{R}$ | $\mathrm{sigmoid}(c)$ |

##### Training

Automatic differentiation is used to train the network with sparse online rendering samples. Because the training data are noisy online samples, **a loss more robust than regular $L_1$ or $L_2$ is needed**.

Writing $q(\omega_i; \gamma)$ for the NASG distribution with parameters $\gamma$ estimated by the network, importance sampling of the rendering equation requires the optimal distribution to be proportional to the product

$$
\begin{equation}
q(\omega_i; \gamma) \propto {\class{term-bsdf}{f_s(x, \omega_i, \omega_o)}}\, {\class{term-light}{L_i(x, \omega_i)}}\, \lvert\cos\theta_i\rvert.
\label{eq:nasg-target}
\end{equation}
$$

The target distribution is therefore $p(\omega_i) = F\, {\class{term-bsdf}{f_s(x, \omega_i, \omega_o)}}\, {\class{term-light}{L_i(x, \omega_i)}}\, \lvert\cos\theta_i\rvert$, where $F$ is a normalizing term whose value is unknown, and the system can still be trained without knowing it. **Kullback–Leibler divergence** is used to represent the likelihood between the estimated and target distributions, the same choice made in [[6]](#ref-6).

Note the contrast with PPG: this targets the **full product**, not incident radiance alone.

#### Limitations and Future Work

*   **Degenerate distributions.** The training configuration generally works well, but sometimes a smaller learning rate is needed to avoid degenerate distributions. These were observed only a few times, **when rendering caustics**. The suspected cause is the complexity of the distribution, where only a small amount of light hits the point from a narrow direction: when the early BSDF-based samples fail to produce a representative initial distribution, the system can fail to sample important directions, which eventually leads to degeneration. An adaptive learning strategy is suggested as possible future work.
*   **Fixed component count** (an observation of these notes, not a limitation listed in the paper). The mixture has a fixed number of components, though it is more expressive per component than a vMF mixture.
*   **No participating media.** Path guiding in scenes with participating media is noted as a possible extension, achievable in theory, but **the ability to learn 3D distributions remains to be investigated**.

### Real-Time Path Guiding Using Bounding Voxel Sampling (2024)

Most methods so far learn a **5D distribution** $p(\omega_i \mid x)$: a directional distribution conditioned on position. Lu et al. [[21]](#ref-21) point out that this is the wrong shape for real-time rendering. Real-time budgets allow only one or two path samples per pixel per frame, which is not enough to fit a 5D distribution from scratch, so real-time methods lean on **temporal reuse** and inherit its problems: lag behind moving lights and geometry, and artifacts under complex dynamic visibility.

{{< figure
src="/images/path_tracing/vxpg/vxpg_overview.svg"
id="fig-vxpg-teaser"
noinvert="true"
caption="(a) The <span style=\"font-variant:small-caps\">Veach Ajar</span> scene is lit by a directional light source behind the door, and so only a small section of the room receives direct illumination. (b) An illustration of the bounding voxel data structure, which stores irradiance and geometry information for each voxel. (c) An illustration of the voxel path-guiding algorithm (VXPG), which guides paths to high-contribution voxels. (d-e) Comparison of BSDF sampling vs VXPG sampling for 2-bounce global illumination. (Image by Lu et al. [[21]](#ref-21))"
width="100%"
>}}

#### Overview

Instead of a local 5D distribution, the paper proposes learning a **global 3D spatial distribution** $p(y)$ over the location of the next path vertex, shared by all shading points and inspired by next-event estimation. Two advantages follow: a spatial distribution **naturally eliminates parallax issues** during sampling, and fewer samples are needed to learn it because of its reduced dimensionality, so it can be **rebuilt from scratch every frame** and adapt quickly to dynamic scenes.

The catch is that sampling $p(y)$ directly for different shading points is inefficient, because it ignores visibility and BSDF terms. In complex scenes many points will be occluded. The method therefore samples a **conditional** distribution $p(y \mid x)$ that approximates the desired 5D density while storing only a 3D spatial distribution, split into two stages:

$$
\begin{equation}
p(y \mid x) = p(y \mid v_i)\, p_{\mathrm{vs}}(v_i \mid x),
\label{eq:vxpg-two-stage}
\end{equation}
$$

where $p_{\mathrm{vs}}(v_i \mid x)$ selects one voxel $v_i$ from the whole set (akin to many-lights sampling) and $p(y \mid v_i)$ samples a point within it (analogous to area light sampling). The conditioning in the voxel-selection stage provides local adaptivity and accounts for both visibility and BSDF.

{{< figure
src="/images/path_tracing/vxpg/voxelization.svg"
id="fig-vxpg-pipeline"
caption="(a) A bunny in a box lit by a spotlight. (b) Before VXPG sampling, a voxel representation of the scene is constructed, including irradiance and geometry information (see [Construct Bounding Voxels](#construct-bounding-voxels)). (c) During VXPG sampling, for every shading point $x$, one voxel is first randomly selected from the entire set to connect with (see [Voxel Selection](#voxel-selection)). (d) After that, the next vertex $y$ is found within the selected voxel in a fast and unbiased way (see [Intra-Voxel Sampling](#intra-voxel-sampling)). (Image by Lu et al. [[21]](#ref-21))"
width="100%"
>}}

{{< figure
src="/images/path_tracing/vxpg/direction_sampling.svg"
id="fig-vxpg-sampling-strategies"
caption="(a) In directional sampling, a primary sample $y'$ is taken from the upper hemisphere, and a ray is cast to determine the vertex $y$ on the surface. (b) NEE acquires the primary sample $y'$ directly from the geometry's surface, which corresponds to vertex $y$ itself. The ray is traced to assess visibility. (c) In bounding voxel sampling, the primary sample $y'$ is drawn from a bounding voxel. A ray is then traced to locate vertex $y$. (Image by Lu et al. [[21]](#ref-21))"
width="90%"
>}}

#### Construct Bounding Voxels

**Bounding voxels.** The scene is uniformly partitioned into voxels $\lbrace v_0, \ldots, v_{n-1} \rbrace$. Each voxel $v_i$ encloses a portion of the scene surface $\mathcal{M}$, denoted $\mathcal{M}_{v_i} = \mathcal{M} \cap v_i$. Each voxel stores the **average irradiance** of $\mathcal{M}_{v_i}$, written $I_i$, and an **axis-aligned bounding box (AABB)** $b_i \subseteq v_i$ which tightly bounds $\mathcal{M}_{v_i}$. The paper calls this structure a "bounding voxel", emphasizing its dual characteristics: the bounding volume feature provided by $b_i$ and the spatial partitioning nature of the voxel. Both characteristics are essential for unbiased sampling.

**Light injection.** Assigning irradiance to voxels is called *light injection*, a concept borrowed from voxel-based global illumination. Injecting light through voxelization or light tracing is suboptimal, because assigning positive irradiance to completely invisible voxels is undesirable, since paths can be guided to occluded regions. Instead, light is injected by tracing paths from the camera and placing a virtual light at the first hit of the indirect path. These points, denoted $x_2$, are guaranteed to contribute to the image, since they are visible from some shading points. Voxel irradiance is the average irradiance of all vertices injected into it:

$$
\begin{equation}
I_i = \frac{1}{n_i} \sum_{x_{j_2} \in v_i} E(x_{j_2}),
\label{eq:vxpg-irradiance}
\end{equation}
$$

where $n_i$ is the number of vertices injected into voxel $v_i$ and $E(\cdot)$ is the irradiance of each vertex. Only direct lighting is evaluated for $E(x_{j_2})$, since the focus is one-bounce indirect illumination.

**Geometry injection.** The second part of the bounding voxel is the AABB $b_i$, which matters because the voxel $v_i$ often provides only a loose bound for the surface $\mathcal{M}_{v_i}$. Sampling a point on the more compact $b_i$ rather than directly on $v_i$ increases the chance of selecting a point that lies on the surface. Rasterization-based voxelization is used: when a triangle overlaps a voxel, an AABB of their intersection is computed and combined using union operations. Simply intersecting the voxel with the bounding box of the triangle does not result in full compactness, so the **Sutherland–Hodgman algorithm** clips the triangle against the voxel and computes its own bounds accordingly.

{{< figure
src="/images/path_tracing/vxpg/bbox.svg"
id="fig-vxpg-bbox"
caption="Different geometry compaction strategies to compute the bounding box $b_i$. In this example, a triangle intersects with a voxel, and only the light gray portion of the triangle has non-zero irradiance. (a) Voxel bounds. (b) Intersection of the voxel and the bounding box of the triangle. (c) The VXPG method: the triangle is clipped against the voxel to produce tight bounds. (d) A non-conservative bound using all second-bounce vertices in the voxel. (e) Optimal bounding box. (Image by Lu et al. [[21]](#ref-21))"
width="90%"
>}}

The ideal AABB would bound only the portion of the geometry with non-zero irradiance, but obtaining it exactly is not feasible in practice. Estimating it by calculating a bounding volume for all vertices within the voxel leads to a **non-conservative bound** and may cause temporal instability, especially when the vertex count is low. A conservative bound is needed so that geometry with non-zero radiance is not missed.

#### Voxel Selection

Once the bounding voxels are constructed, a voxel $v_i$ is sampled for each shading point $x_1$ using a probability mass function $p_{\mathrm{vs}}(v_i \mid x_1)$. Ideally this should be proportional to the square root of the second moment of the contribution estimator, where the contribution is defined as an integral over $\mathcal{M}_{v_i}$ of ${\class{term-light}{L_i}}\, {\class{term-bsdf}{f_r}}\, G\, V$. Estimating that for all voxel–shading-point pairs is costly.

The observation that makes it tractable is that **selecting voxels is similar to selecting light sources in many-light sampling**: a voxel can in fact be viewed as a "virtual voxel light" with emission $I_i$ and bounds $b_i$. Existing many-lights work can then be leveraged to construct $p_{\mathrm{vs}}$. A simple method selects a voxel with probability proportional to its power:

$$
\begin{equation}
\Phi(v_i) = I_i \cdot A(v_i),
\label{eq:vxpg-power}
\end{equation}
$$

where $A(v_i)$ is the surface area of $\mathcal{M}_{v_i}$, approximated using the surface area of the largest of the 6 faces of $b_i$.

Since the bounding voxels are shared across all shading points, sampling them based on power alone ignores the visibility, geometry, and BSDF terms. Querying visibility between each pair of shading points and voxels would be prohibitively expensive, so the method assumes **the contribution is locally similar** and uses clustering to reduce the number of visibility queries. Pixels and voxels are grouped into **superpixels** and **supervoxels** respectively, and an average throughput is estimated for each superpixel–supervoxel pair, providing an approximation of the product of visibility, geometry, and BSDF.

{{< figure
src="/images/path_tracing/vxpg/voxel_selection.svg"
id="fig-vxpg-voxel-selection"
caption="Overview of the visibility-aware voxel selection algorithm. (a-b) To reduce the number of visibility queries, the shading points and voxels are clustered respectively. Then, for each pair of superpixel and supervoxel, multiple rays are cast to estimate an average throughput that is the product of visibility, BSDF, and geometry terms. (Image by Lu et al. [[21]](#ref-21))"
width="85%"
>}}

Superpixel clustering uses the **SLIC** superpixel algorithm taking geometry similarity into account, while a simplified **K-means** groups voxels into supervoxels based on visibility and irradiance information. For each superpixel–supervoxel pair, 32 pairs of shading points and $x_2$ vertices are selected within the cluster pair and their binary visibility queried by tracing a ray. Because both ends of these rays are expected to be close, they are typically coherent and can be efficiently traced.

At sampling time, the superpixel $SP_i$ of the shading point is identified, a supervoxel $SV_j$ is selected with probability proportional to the product of average throughput and total power, $\bar{T}_{i,j}\cdot\sum_{v_k\in SV_j}\Phi(v_k)$, which approximately product-samples irradiance, visibility and BSDF, and finally one voxel within $SV_j$ is chosen based on its power $\Phi$ as in $\eqref{eq:vxpg-power}$.

#### Intra-Voxel Sampling

**Bounding volume sampling.** Once a voxel is selected, the position of the path vertex within it must be chosen. The challenge is that an arbitrary point $y' \in b_i$ cannot simply be used, since the path vertex must lie on the scene surface $\mathcal{M}$. Treating the sampled $y'$ as a virtual point light introduces bias; finding the exact vertex $y$ by ray casting requires an integration to compute the probability density, since infinitely many $y'$ map to the same direction $\omega_i$, which is prohibitively expensive for real time.

Instead, the primal sample $y'$ is generated on the **surface of the AABB** $b_i$, a ray is cast from $x$ towards $y'$ in direction $\omega_i$ to obtain the path vertex $y$, and $y$ is accepted if $y \in b_i$ and discarded otherwise. The probability density of selecting $y$ can then be computed in closed form:

$$
\begin{equation}
p(y \mid x) = p(y \mid y', x)\, p(y' \mid x, v_i)\, p_{\mathrm{vs}}(v_i \mid x),
\label{eq:vxpg-density}
\end{equation}
$$

due to two factors. First, because of the rejection step, each vertex $y$ can only be sampled when the voxel $v_i$ within which it resides is selected, since voxels are disjoint, which eliminates the need to marginalize over $v_i$. Second, the boundary of $b_i$ is sampled rather than the interior, so given $x$ and a specific $v_i$, the mapping $y' \mapsto \omega_i$ is injective, removing the need to marginalize over $y'$. The formulation trades off the costly PMF integration with sample rejection, which is why a compact bounding volume matters.

**Spherical voxel sampling.** To generate samples on the surface of the bounding voxel efficiently, all forward-facing surfaces of the AABB $b_i$ are projected into **spherical rectangles**. A sample is only attempted if the vertex $x$ is outside the AABB $b_i$, in which case there are at least one and at most three spherical rectangles $Q_0, Q_1, Q_2$.

{{< figure
src="/images/path_tracing/vxpg/projection.svg"
id="fig-vxpg-projection"
caption="When the shading point $x$ is outside of the bounding box, there is at least one (a) and at most three (b) surfaces facing $x$. During sampling, the forward-facing surfaces $P_{0-2}$ are projected onto spherical rectangles $Q_{0-2}$. (Image by Lu et al. [[21]](#ref-21))"
width="75%"
>}}

One spherical rectangle is first selected proportionally to its surface area, $p(Q_i) = \mathrm{Area}(Q_i) / \sum_j \mathrm{Area}(Q_j)$, and spherical rectangle sampling is applied on $Q_i$. This allows sampling the boundary of the AABB with a probability density proportional to the solid angle:

$$
\begin{equation}
p(y' \mid x, v_i) = \frac{1}{\sum_j \mathrm{Area}(Q_j)}.
\label{eq:vxpg-spherical-rect}
\end{equation}
$$

#### Multiple Importance Sampling with BSDF Sampling

To make the algorithm robust, samples drawn using VXPG are combined with BSDF importance sampling using MIS with the [balance heuristic](#the-balance-and-power-heuristics). This step is crucial since, like in many path guiding methods, **light injection is not guaranteed to find every voxel that contributes to the image and can result in bias**. Combining BSDF sampling ensures all surfaces have a non-zero probability of being selected.

#### Path Guiding for Further Bounces

The method can also be applied to direct illumination and multi-bounce indirect illumination. To guide direct illumination, light source emission is injected instead of irradiance of $x_2$ in the light injection stage. For further bounces, the method can be extended by injecting $x_3, x_4, \ldots$ and further vertices to guide the corresponding bounces. A challenge for second bounce onwards is that the voxel selection strategy estimates contribution between superpixels and supervoxels, while path vertices may lie on parts of the scene outside the image; obtaining information for these vertices requires estimating voxel–voxel contribution, or skipping the contribution estimation for the second bounce. The implementation includes up to second-bounce indirect illumination, reusing the bounding voxel structure built for the first bounce and using power-based sampling for voxel selection.

#### Discussion, Limitations and Future Work

*   **Unbiasedness.** BSDF samples serve dual purposes, light injection and MIS. Spawning one BSDF path per frame and successively using it for both purposes produces a **biased** outcome. Two fixes are given: use $x_2$ of BSDF paths from the *previous* frame for light injection, resulting in a one-frame lag (the strategy all previous path guiding approaches use, given their focus on static scenes), or spawn two BSDF rays for light injection and MIS respectively, which adds overhead but helps in highly dynamic scenarios. In practice the bias can also simply be ignored: experiments suggest it is closely tied to light injection, and where light injection captures most contributing voxels no bias is observed. Missed voxels bias the corresponding pixels, but the injection strategy tends to find voxels contributing to a greater number of pixels, so any bias is relatively small and localized.
*   **Temporal stability.** The approach is temporally stable in most cases, but different voxel clustering can lead to different amounts of variance across frames, especially in scenes with complex visibility.
*   **Caustics transport.** Only irradiance is estimated at $x_2$ vertices, neglecting the potential specular effect, so guiding general indirect light reflected from a glossy surface towards a primary vertex would be challenging. VXPG can potentially be used to guide photon tracing instead.
*   **Scalability to large-scale scenes.** Results are shown on moderately large scenes such as <span style="font-variant:small-caps">Zero-Day</span> (5.2 million triangles), but two concerns remain. The cost of geometry injection generally scales linearly with the number of triangles, for which LoD is adopted as a solution. And large scenes may lead to less precise bounds of geometries, for which a higher resolution voxel is essential; a hierarchical structure such as a clipmap or sparse voxel octree might be useful for very large-scale scenes.

### Warp Composition (2024)

{{<
figure src="/images/path_tracing/warp_composition/naive_fit.svg"
noinvert="true"
id="fig-naive-fit"
caption="Naively fitting a normalizing flow (NF) model to the product of a complex unconditioned density $p_1$ (image) and a simple conditioned density $p_2$ (Gaussian with parameterized mean $\mu$) yields a poor result. The model is tasked with simultaneously learning the intricate shape of $p_1$ *and* the variations in $\mu$. Instead, a $p_1$ warp is applied to the NF-model output, which drastically simplifies the shape of the distribution it needs to learn. The result is a near-perfect fit with an equal number of NF parameters. (Image by Litalien et al. [[9]](#ref-9))"
width="100%"
>}}

#### Overview

Neural product importance sampling [[9]](#ref-9) targets a different part of the problem. Many rendering integrands take the form of a *product* of two functions:
$$
p^*(\omega) \propto L(\omega)\, {\class{term-bsdf}{f_r(\omega_o,\omega)}}\,\cos\theta ,
$$
where  
- $L(\omega)$ is the unshadowed environment radiance (distant environment map),  
- ${\class{term-bsdf}{f_r(\omega_o,\omega)}}$ is the BRDF,  
- $\cos\theta = n \cdot \omega$ is the geometric term.

Such products are often **highly multi-modal**, **HDR**, and **material dependent**, making standard MIS mixtures suboptimal.

This method learns a sampler for the *product distribution* via a **neural warp composition** ({{< figref "fig-warp-overview" >}}):

1. **Head warp** - a small *conditional* neural spline flow that maps uniform samples to an intermediate density $p_Y(y \mid c)$, chosen so that after the tail warp the result is $\propto p_1 \cdot p_2$ (it is *not* a fit to $p_2$ alone).  
2. **Tail warp** - an *unconditional* neural flow representing the environment map.

The decomposition reduces complexity: the tail warp embeds the lighting structure once, and the head warp learns a much smoother intermediate density that the tail warp then turns into the product.

{{<
figure src="/images/path_tracing/warp_composition/overview.svg"
noinvert="true"
id="fig-warp-overview"
caption="Given a shading condition, the model maps uniform points through two warps to produce samples distributed approximately proportionally to a target product density. The shape of the intermediate density is coarse, similarly to a naive product fit (see the first figure of this section), but leads to a precise fit when mapped through the tail warp. (Image by Litalien et al. [[9]](#ref-9))"
width="100%"
>}}


#### Decomposing the Product: $p_1$ and $p_2$

The product distribution is separated into two physically meaningful factors:

- **Emitter-driven factor**
  $$
  p_1(\omega) \propto L(\omega),
  $$
  depending only on the environment map.

- **Material-driven factor**
  $$
  p_2(\omega \mid c)
  \propto {\class{term-bsdf}{f_r(\omega_o,\omega)}}\,\cos\theta,
  $$
  where  
  $c = (\omega_o, n, \text{material parameters})$  
  is the shading condition.

The target distribution is their normalized product:
$$
p^*(\omega \mid c) \propto p_1(\omega)\, p_2(\omega \mid c).
$$

##### Intuition
- $p_1$ is the *unshadowed* distant environment map and carries its **high-frequency HDR detail** (very peaked suns are a known failure case, see Limitations). Visibility is not modeled: the sampler targets the unshadowed product.  
- $p_2$ contains **smooth BRDF shaping** (roughness, grazing angles).  

A normalizing flow struggles to learn both simultaneously, hence the separation.


#### Target Distribution and Sampler

The goal is to learn a sampler
$$
\omega = T_\Phi(u, c), \qquad u \sim \text{Uniform}[0,1]^2,
$$
such that the induced density $p_\Phi(\omega \mid c)$ matches $p^*(\omega \mid c)$.


#### Neural Warp Composition

The sampler is the composition ({{< figref "fig-architecture" >}}):
$$
T_\Phi = T_{\text{tail}} \circ T_{\text{head}},
$$
where  
- $T_{\text{head}} = h_\theta$ is the conditional head warp,  
- $T_{\text{tail}} = C$ is the unconditional tail warp.

{{<
figure src="/images/path_tracing/warp_composition/warp.svg"
id="fig-architecture"
noinvert="true"
caption="Given a <span style=\"color:#c44e52\">shading condition $\mathbf{c}$</span> (view direction $\omega_o$, surface normal $\mathbf{n}$ and material descriptor $\rho$), a <span style=\"color:#55a868\">conditioner encoder</span> first produces a latent vector $\xi$. The vectors $\mathbf{c}$ and $\xi$ condition two <span style=\"color:#8172b3\">coupling layers</span>, each warping samples via a circular piecewise rational quadratic (RQ) spline whose parameters (i.e., knot positions and derivatives) are inferred by a <span style=\"color:#4c72b0\">spline network</span>. The output $y = (y_0, y_1)$ is then passed through the tail warp to produce the final sample $x$ which is converted to a direction $\omega$ via lat-long mapping. (Image by Litalien et al. [[9]](#ref-9))"
width="80%"
>}}


##### Sampling Procedure
1. Sample $u \sim \text{Uniform}[0,1]^2$  
2. Compute $y = h_\theta(u \mid c)$  
3. Compute $x = C(y)$  
4. Map $x \in [0,1]^2$ to $\omega \in \mathbb{S}^2$ (lat-long)

The two warps handle different parts of the product.


#### Head Warp - Conditional Neural Spline Flow
The head warp learns the intermediate density that, composed with the fixed emitter warp, reproduces the product $p_1 \cdot p_2$. The paper stresses that this differs from fitting $p_2$ directly, which would not yield the correct product distribution.

{{<
figure src="/images/path_tracing/warp_composition/head_warp.png"
id="fig-head-warp"
caption="Toy example: the simple conditioned density $p_2(\cdot \mid \mu)$, a Gaussian with parameterized mean $\mu$, standing in for the material factor. (Detail of the naive-fit figure at the start of this section; image by Litalien et al. [[9]](#ref-9))"
width="50%"
>}}


##### Inputs and Conditioning
The head warp conditions on  
$$
c = (\omega_o, n, \text{material parameters}),
$$
which the (optional) conditioner encoder converts into a latent vector $\xi$.

##### Architecture
- Two coupling layers  
- Each uses **circular rational-quadratic splines (RQS)**  
- Spline parameters predicted (per coupling layer) from the concatenation $(c, \xi)$ and the pass-through coordinate  
- Transformation:  $
  y = h_\theta(u \mid c), \qquad u \in [0,1]^2.
  $

The head warp is intentionally **compact** because the intermediate density it must learn is much smoother than the product.


#### Tail Warp - Environment Map Flow

The tail of the pipeline is an **unconditional** transformation of head-warp samples $y \in \mathcal{Y}$ to unit directions $\omega$. The samples $y$ are first mapped to unit-square points $x \in \mathcal{X}$ according to the density defined by a high-dynamic-range environment image, then lat-long projected to the sphere, so the tail warp learns $x = C(y)$ such that $x$ follows the emitter distribution $p_1(\omega)$.

**Why a learned warp rather than a standard one.** Several conventional options exist, such as the common marginal row–column scheme or Clarberg et al.'s hierarchical warp. Both can be constructed quickly, but **both are discontinuous**. That is usually not a major problem in isolation, except that discontinuities may ruin the stratification of the input samples $z$. Here it matters more: a discontinuous tail warp can **hinder the head-warp optimization**, because small variations in $\mathcal{Y}$ then lead to abrupt changes in $\mathcal{X}$.

The pragmatic answer is to fit a large NF model to the emitter image. A spline-based flow **guarantees a smooth map by construction**, and because this particular distribution is unconditional, it can be trained efficiently using samples generated by either of the two conventional schemes above. Increasing the number of spline bins makes the added approximation error arbitrarily small.

An optimal-transport map was considered and rejected: the regularization required to obtain practical OT solutions meant it did not perform well **unless the target itself was smooth**, which is far from the case for natural environment maps.

{{<
figure src="/images/path_tracing/warp_composition/tail_warp.png"
id="fig-tail-warp"
caption="Toy example: the complex unconditioned density $p_1$ (an image), standing in for the emitter factor that the tail warp handles. (Detail of the naive-fit figure at the start of this section; image by Litalien et al. [[9]](#ref-9))"
width="50%"
>}}

##### Training
- Trained **once per environment map**  
- Large normalizing flow  
- Encodes HDR lighting detail (spikes, sharp regions, multiple lobes)

##### Runtime
The tail warp is precomputed into a **high-resolution lookup**:
- Constant-time forward evaluation  
- Stable Jacobian computation  
- No conditioning

This allows head–tail composition to cleanly model the product.


#### Final Product Sampler

Given  
$$
T(u,c) = C(h_\theta(u\mid c)),
$$
the induced PDF is:
$$
p_\Phi(x \mid c)=
\left|
\det J_{h_\theta}(u \mid c)
\right|^{-1}
\left|
\det J_C(y)
\right|^{-1},
\qquad y = h_\theta(u \mid c).
$$

- $J_{h_\theta}$ and $J_C$ are the Jacobians of the head and tail flows.  
- Together they approximate the ideal product
  $$p^*(\omega \mid c) \propto p_1(\omega) p_2(\omega\mid c).$$
- This density lives on the unit square $\mathcal{X}$, where the KL training is done; the paper omits the final lat-long warp. For use in a renderer (estimator, MIS weights) the solid-angle density additionally needs the lat-long Jacobian; for the standard parameterization $x = (\phi/2\pi,\ \theta/\pi)$ this gives $p_\Phi(\omega \mid c) = p_\Phi(x \mid c)/(2\pi^2\sin\theta)$.


{{<
figure src="/images/path_tracing/warp_composition/product_warp.png"
id="fig-product-warp"
caption="Toy example: the target product $p_1 \cdot p_2$ that the composed mapping $T = C \circ h_\theta$ is trained to reproduce. (Detail of the naive-fit figure at the start of this section; image by Litalien et al. [[9]](#ref-9))"
width="50%"
>}}



#### Training Objective - Forward KL

The head warp is trained (with the tail warp fixed) via **forward KL divergence**:
$$
\mathcal{L}_{\mathrm{KL}}(\theta)=
D_{\mathrm{KL}}\!\left(p^* \,\|\, p_\Phi\right)=
-\mathbb{E}_{x\sim p^*}
\Big[
\log p_\Phi(x \mid c)
\Big]+ \text{const}.
$$

Using change-of-variables:
$$
\log p_\Phi(x \mid c)=-\log \left| \det J_{h_\theta} \right|-\log \left| \det J_C \right|.
$$

##### Stabilization
**Entropic regularization.** The forward-KL loss is augmented as $\mathcal{L} = \mathcal{L}_{\mathrm{KL}} + \lambda\,\mathcal{L}_H$, with $\mathcal{L}_H = \mathbb{E}_{x\sim p^*}\big[p_\Phi(x)\log p_\Phi(x)\big]$ and $\lambda = 10^{-4}$. Forward KL tends to over-fit high-density regions and leave low-density regions under-represented (causing fireflies); the regularizer penalizes such mismatched densities.


#### Discussion

Plotting the intermediate and final densities learned on the environment maps and materials used in the experiments, and comparing against **naively fitting the full product with a neural flow of the same capacity as the head warp**, shows the final fits aligning well with their corresponding target densities while the naive fits do not. This is the direct evidence for the central claim: separately handling *detail* and *conditioning* via warp composition is what buys the accuracy, not additional capacity.

**Ablation study.** Naively fitting a flow to a product distribution performs much worse than either compositional variant. Two further findings:

*   **The impact of using the smoother flow-based tail warp over a hierarchical one grows with BRDF complexity**, so the smoothness argument above is not cosmetic, and it matters more exactly where the method is aimed.
*   The conditional encoder and the entropic regularization scheme each further reduce error.

#### Limitations

*   **Training is per material model**, with duration depending on the conditioning dimension and target-distribution complexity. The approach provides benefit **only when that training effort can be amortized in subsequent rendering**. Total preprocessing time can be cut in half by opting for a standard (e.g. hierarchical) emitter-sampling technique instead of optimizing a smooth tail warp, which trades the accuracy benefit above for setup cost.
*   **The head warp may perform poorly when the product distribution is strongly dominated by the BRDF term**, for example at very low roughness. The authors hypothesize that exposing an analytic parameterized BRDF warp to the model may mitigate this.
*   **Sun environment maps are not well supported**: the tail warp collapses into a single point, which causes numerical issues in the head-warp optimization. MIS can be applied in these scenarios, but at the cost of an extra network pass for PDF evaluation.
*   The cosine-weighted variant is the practical exception. It is optimized once per environment map, baked compactly, and usable as an efficient drop-in replacement for traditional illumination sampling in any scene, including with MIS.

### Distribution Factorization (2025)


#### Overview

Distribution factorization [[10]](#ref-10) returns to the question of how the guiding distribution is represented. The goal of path guiding is to learn a sampling distribution that approximates the **target distribution**:
$$
p^*(\boldsymbol{\omega} \mid \mathbf{x}) \propto {\class{term-bsdf}{f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega})}} \, {\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega})}} \, \lvert\cos\theta\rvert,
$$
where $\boldsymbol{\omega}$ is the incoming direction, $\boldsymbol{\omega}_o$ is the outgoing direction, ${\class{term-bsdf}{f_s}}$ is the BSDF, and $\theta$ is the angle between $\boldsymbol{\omega}$ and the shading normal.

Learning this distribution directly on the sphere is difficult because:

- The distribution varies spatially across the scene
- The distribution may be multi-modal and high-frequency
- Existing neural representations are either expressive but slow to sample/evaluate (normalizing flows, NIS) or fast but limited in expressiveness (vMF/NASG mixtures)
- Predicting a full $M_1 \times M_2$ grid directly with a network would be expensive

**Distribution factorization** solves these issues by factorizing the directional PDF into a marginal and a conditional distribution defined on a square domain ({{< figref "fig-df-overview" >}}).


#### Sphere-to-Square Mapping

The incoming direction $\boldsymbol{\omega}$ (over the full sphere) is mapped into uniform square coordinates $(\epsilon_1, \epsilon_2) \in [0,1]^2$:

- **Normalized azimuth coordinate:**
  $$
  \epsilon_1 = \frac{\phi}{2\pi} \in [0,1]
  $$

- **Polar coordinate:**
  $$
  \epsilon_2 = \frac{1-\cos\theta}{2} \in [0,1]
  $$

These coordinates can be converted to spherical domain through $\phi = 2\pi\epsilon_1$ and $\theta = \cos^{-1}(1-2\epsilon_2)$. Since $\phi$ is periodic, the $\epsilon_1$ distribution wraps around at its boundaries.

#### Jacobian of the Mapping

The PDF defined over the uniform square space $p(\epsilon_1, \epsilon_2 \mid \mathbf{x}, \boldsymbol{\omega}_o)$ can be converted to distribution over $\boldsymbol{\omega}$, $p_\Omega(\boldsymbol{\omega} \mid \mathbf{x}, \boldsymbol{\omega}_o)$, by taking the Jacobian of the transformation into account. Since $\mathrm{d}\epsilon_1\,\mathrm{d}\epsilon_2 = \frac{\mathrm{d}\phi}{2\pi}\cdot\frac{\sin\theta\,\mathrm{d}\theta}{2} = \frac{\mathrm{d}\boldsymbol{\omega}}{4\pi}$, the mapping is area-preserving (hence a "uniform" square space) and
$$
p_\Omega(\boldsymbol{\omega} \mid \mathbf{x}, \boldsymbol{\omega}_o) = \frac{p(\epsilon_1, \epsilon_2 \mid \mathbf{x}, \boldsymbol{\omega}_o)}{4\pi}.
$$


#### Factorized Distribution Representation

The product rule represents the joint PDF over the uniform square domain as:
$$
p(\epsilon_1, \epsilon_2 \mid \mathbf{x}, \boldsymbol{\omega}_o) = p_{\boldsymbol{\omega}_1}(\epsilon_1 \mid \mathbf{x}, \boldsymbol{\omega}_o) \cdot p_{\boldsymbol{\omega}_2}(\epsilon_2 \mid \epsilon_1, \mathbf{x}, \boldsymbol{\omega}_o)
$$

Through this representation, estimating the joint PDF boils down to predicting two 1D distributions.


#### Neural Network Architecture and Discretization

The two domains $\epsilon_1$ and $\epsilon_2$ are discretized into $M_1$ and $M_2$ discrete locations, respectively ({{< figref "fig-df-pdf-grid" >}}), and **two independent networks** are used ({{< figref "fig-df-network" >}}) to estimate the PDF at those locations.

##### Network Structure

**Marginal Network $f_{\boldsymbol{\omega}_1}$:**
- **Input:** $\mathbf{x}$ and $\boldsymbol{\omega}_o$
- **Output:** An $M_1$-dimensional vector $\mathbf{v}_1$ 
- **Function:** Models $p_{\boldsymbol{\omega}_1}(\epsilon_1 \mid \mathbf{x}, \boldsymbol{\omega}_o)$

**Conditional Network $f_{\boldsymbol{\omega}_2}$:**
- **Input:** $\epsilon_1$, in addition to $\mathbf{x}$ and $\boldsymbol{\omega}_o$
- **Output:** An $M_2$-dimensional vector $\mathbf{v}_2$
- **Function:** Models $p_{\boldsymbol{\omega}_2}(\epsilon_2 \mid \epsilon_1, \mathbf{x}, \boldsymbol{\omega}_o)$

The PDF at an arbitrary location can then be obtained by interpolating the estimated PDFs at discrete locations.

##### Discretization Resolution

The paper sets $M_1 = 32$ and $M_2 = 16$. The reduction in resolution in the second dimension is due to the smaller angular range of $\epsilon_2$, which corresponds to $\theta \in [0, \pi]$ ($\epsilon_1$ corresponds to $\phi \in [0, 2\pi]$).

{{< 
figure src="/images/path_tracing/distribution_factorization/grid.svg"
id="fig-df-pdf-grid"
noinvert="true"
caption="The $M$-dimensional vector $\mathbf{v}$ holding the PDF estimate at discrete locations, obtained by applying softmax to the network output and multiplying each element by $M$. (Detail of the network figure below; image by Figueiredo et al. [[10]](#ref-10))"
width="60%" 
>}}

##### Network Implementation Details

The networks share the same architecture:
- **Hidden layers:** 3 layers with 64 neurons each
- **Activation function:** ReLU

To ensure valid PDFs that integrate to one, for both interpolation schemes (with wrap-around boundary handling for $\epsilon_1$ and nearest-neighbour boundaries for $\epsilon_2$ in the linear case):
$$
\mathbf{v} = M \cdot \text{softmax}(f_{\boldsymbol{\omega}}(\mathbf{C}))
$$

where $\mathbf{C}$ is the condition (different for marginal and conditional) and $M$ is the number of bins.

{{< 
figure src="/images/path_tracing/distribution_factorization/network_architecture.svg"
id="fig-df-network"
caption="MLP takes the condition $\mathcal{C}$ as the input and estimates an $M$ dimensional vector. A softmax is applied to this vector and each element is multiplied by $M$ to obtain a vector containing the PDF estimate at discrete locations. This network models the marginal and conditional distributions. Note that $x$ and $ω_o$ are the condition when modeling the marginal distribution, but for the conditional one, the first dimension $\epsilon_1$ is additionally passed to the network. Two separate networks model the two distributions, but both follow the process illustrated in this figure. (Image by Figueiredo et al. [[10]](#ref-10))"
width="70%" 
>}}


##### Input Encoding

- **Position $\mathbf{x}$:** Learnable dense grid encoding
- **Direction $\boldsymbol{\omega}_o$:** Spherical harmonics with degree 4
- **Normal and roughness:** One-blob encoding using 4 bins
- **Conditional input $\epsilon_1$:** Triangle wave encoding with 12 frequencies for $f_{\boldsymbol{\omega}_2}$

The networks are implemented in tiny-cuda-nn.


#### Interpolation Strategies

The paper explores two interpolation strategies:

##### Nearest Neighbor
The domain is divided into $M$ bins and the PDF inside each bin is obtained from the corresponding element of the estimated vector $\mathbf{v}$:
$$
p_{\boldsymbol{\omega}}(\epsilon \mid \mathbf{C}) = \mathbf{v}[\lfloor\epsilon M\rfloor]
$$

{{< 
figure src="/images/path_tracing/distribution_factorization/nearest_neighbor.svg"
id="fig-df-nearest"
caption="Nearest neighbor interpolation: the PDF at an arbitrary location uses the estimate at the closest sample, giving a piecewise-linear CDF. (Detail of the interpolation figure below; image by Figueiredo et al. [[10]](#ref-10))"
width="50%" 
>}}

##### Linear Interpolation
The PDF at an arbitrary location is obtained by linearly interpolating the estimated PDF at the two nearest discrete coordinates:
$$
p_{\boldsymbol{\omega}}(\epsilon \mid \mathbf{C}) = (1-\alpha)\mathbf{v}[m] + \alpha\mathbf{v}[m+1]
$$
where $m = \lfloor \epsilon M - 0.5 \rfloor$ and $\alpha = \epsilon M - m - 0.5$.

{{< 
figure src="/images/path_tracing/distribution_factorization/linear_interp.svg"
id="fig-df-linear-interp"
caption="Linear interpolation: the PDF at an arbitrary location is interpolated between the two closest samples, giving a piecewise-quadratic CDF. (Detail of the interpolation figure below; image by Figueiredo et al. [[10]](#ref-10))"
width="50%" 
>}}


{{< 
figure src="/images/path_tracing/distribution_factorization/interp.svg"
id="fig-df-interpolation"
caption="The PDF evaluation and sampling process for nearest neighbor and linear interpolation. To model the $1D$ distributions (marginal and conditional) the network first predicts a vector $v$ containing estimates of the PDF at discrete locations. To obtain the PDF at an arbitrary location, either the PDF estimate at the closest sample is used (top-left), or the two closest samples are linearly interpolated (top-right). Sampling is done by evaluating the inverse CDF at a randomly generated value $u$ with a uniform distribution. Note that the CDF for nearest neighbor interpolation is piecewise linear, while it is piecewise quadratic for linear interpolation. (Image by Figueiredo et al. [[10]](#ref-10))"
width="80%" 
>}}


#### Sampling

Sampling is performed using **inverse transform sampling**. The inverse CDF is evaluated at a randomly generated number with uniform distribution $u \sim \mathcal{U}[0,1]$, i.e., $\epsilon = P_{\boldsymbol{\omega}}^{-1}(u \mid \mathbf{C})$.

The sampling process:

1. Sample from the marginal: $\epsilon_1 = P_{\boldsymbol{\omega}_1}^{-1}(u_1 \mid \mathbf{x}, \boldsymbol{\omega}_o)$
2. Sample from the conditional: $\epsilon_2 = P_{\boldsymbol{\omega}_2}^{-1}(u_2 \mid \epsilon_1, \mathbf{x}, \boldsymbol{\omega}_o)$
3. Convert to spherical: $\phi = 2\pi\epsilon_1$, $\theta = \cos^{-1}(1-2\epsilon_2)$


#### Optimization with Radiance Caching

The goal is to approximate the target distribution using the learned PDF by minimizing the KL divergence:
$$
D_{\text{KL}}(p^* \,\|\, p_{\boldsymbol{\Theta}}) = \int_{\Omega} p^*(\boldsymbol{\omega}) \log\frac{p^*(\boldsymbol{\omega})}{p_{\boldsymbol{\Theta}}(\boldsymbol{\omega})} \, d\boldsymbol{\omega}
$$

The gradient with respect to network parameters $\boldsymbol{\Theta}$ is:
$$
\nabla_{\boldsymbol{\Theta}} D_{\text{KL}}(p^* \,\|\, p_{\boldsymbol{\Theta}}) = -\int_{\Omega} p^*(\boldsymbol{\omega}) \nabla_{\boldsymbol{\Theta}} \log p_{\boldsymbol{\Theta}}(\boldsymbol{\omega}) \, d\boldsymbol{\omega}
$$

This is approximated through MC integration:
$$
\nabla_{\boldsymbol{\Theta}} D_{\text{KL}}(p^* \,\|\, p_{\boldsymbol{\Theta}}) \approx -\frac{1}{N} \sum_{i=1}^N \frac{\hat{p}^*(\boldsymbol{\omega}_i)}{q(\boldsymbol{\omega}_i)} \nabla_{\boldsymbol{\Theta}} \log p_{\boldsymbol{\Theta}}(\boldsymbol{\omega}_i)
$$

where samples $\boldsymbol{\omega}_i$ are drawn from $q$.

##### Target Distribution

The ideal target distribution is:
$$
p^*(\boldsymbol{\omega}_i \mid \mathbf{x}, \boldsymbol{\omega}_o) = \frac{f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega}_i) \, {\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega}_i)}} \, \lvert\cos\theta_i\rvert}{L_r(\mathbf{x}, \boldsymbol{\omega}_o)}
$$

where the numerator is the integrand and the denominator is the reflected radiance serving as the normalization factor.

##### Radiance Caching Network

To reduce the variance of gradients and estimate the normalization factor, a neural network $f_{\boldsymbol{\Phi}}$ caches the **reflected radiance** ${\class{term-light}{L_r(\mathbf{x}', \boldsymbol{\omega}_o')}}$ at the next intersection point. Since ${\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega}_i)}} = {\class{term-light}{L_r(\mathbf{x}', \boldsymbol{\omega}_o')}}$, this network can estimate both the incoming radiance and the normalization factor.

The estimated target distribution becomes:
$$
\hat{p}^*(\boldsymbol{\omega}_i \mid \mathbf{x}, \boldsymbol{\omega}_o) = \frac{f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega}_i) \cdot f_{\boldsymbol{\Phi}}(\mathbf{x}', \boldsymbol{\omega}_o') \cdot \lvert\cos\theta_i\rvert}{f_{\boldsymbol{\Phi}}(\mathbf{x}, \boldsymbol{\omega}_o)}
$$

The radiance caching approach follows Neural Radiance Caching (NRC) [[7]](#ref-7) and uses a small MLP network that takes surface location and ray direction as input and estimates the corresponding radiance.

{{< 
figure src="/images/path_tracing/distribution_factorization/radiance_cache.svg"
id="fig-df-radiance-cache"
caption="Computing the target distribution requires obtaining ${\class{term-light}{L_r(x,\omega_o)}}$ and ${\class{term-light}{L_i(x,\omega_i)}}$. A neural network takes location and direction as the input and estimates the cached reflected radiance along that particular ray. By evaluating the network at the next $(x', \omega_o')$ and current $(x,\omega_o)$ intersection points, an estimate of the reflected $L_r$ and incoming ${\class{term-light}{L_i}}$ radiance. Note that here the incoming radiance at $x,\omega_i$ is equal to the reflected radiance at $x', \omega_o'$. (Image by Figueiredo et al. [[10]](#ref-10))"
width="80%" 
>}}



#### Training Details

- Training is performed in an online fashion for the first 30% of the allocated budget
- Adam optimizer with learning rate of $10^{-2}$ for $f_{\boldsymbol{\Phi}}$ and $3 \times 10^{-2}$ for $f_{\boldsymbol{\omega}_1}$ and $f_{\boldsymbol{\omega}_2}$
- 70% of paths are guided using the learned method, 30% use BSDF sampling for exploration

{{< 
figure src="/images/path_tracing/distribution_factorization/df-overview.svg"
id="fig-df-overview"
caption=" During path tracing, samples are generated using the guiding distribution $p_\Theta$ to increase the number of paths that reach light sources. These paths are then used to train the radiance cache $f_\Phi$. The cached radiance is leveraged as a smoother objective to improve $p_\Theta$, which in turn is used on the next sample generation. (Image by Figueiredo et al. [[10]](#ref-10))"
width="80%" 
>}}


#### Connection to NIS

The paper draws the contrast with [[6]](#ref-6) explicitly, and it is the cleanest statement of what "factorization" buys.

This method **directly models a multidimensional PDF** by estimating a series of marginal and conditional distributions, using four 1D PDFs to model a four-dimensional PDF. **Sampling is a byproduct**, performed through inverse-CDF sampling.

NIS inverts that relationship. It uses normalizing flows, where the primary process maps samples from a known (e.g. uniform) distribution to the target through a set of coupling layers, and **PDF evaluation is the byproduct of the sampling process**. NIS splits the input dimensions into two equally sized partitions, uses one as network input to estimate the mapping that warps the other, and repeats in alternating fashion through the remaining coupling layers.

The motivations differ accordingly: this factorization follows from the **product relationship between joint and 1D PDFs**, whereas NIS's split follows from its use of coupling layers. That difference produces a significant performance gap even in the constrained path-guiding case of only two input dimensions, because in NIS **evaluating the PDF of a given sample requires evaluating the two networks sequentially**, the warped sample being the condition for the next. Here the two networks have no such dependency.

#### Conclusion, Limitations, and Future Work

*   **Fixed resolution is the main limitation.** The method struggles to encode features significantly smaller than each bin. The paper demonstrates this on an outdoor swimming-pool scene where **the Sun is not properly modelled**, producing excessive noise. The problem is directly tied to resolution: increasing it from $32 \times 16$ to $64 \times 32$ improves the result.
*   NIS with fixed bin size **suffers from the same limitation**, producing slightly worse results because of higher computational cost. In contrast, PPG [[4]](#ref-4) and variance-aware guiding **quickly adapt their data structures** to focus on the directional light of the Sun, giving the least noise. This is a case where the adaptive tree beats the fixed-resolution neural representation outright.
*   NPM [[8]](#ref-8) uses a continuous representation but **struggles the most** in this scenario, as its optimization becomes unstable with concentrated high-intensity illumination.
*   Discretization resolution trades quality against cost (on a different, indoor scene rendered at 750 spp): $16\times8$ → relMSE 0.4629, 91.9 s; $32\times16$ → 0.2645, 103 s; $64\times32$ → 0.2075, 139 s. On the swimming-pool scene (120 s equal time), the linear-interpolation variant improves from 0.0948 at $32\times16$ to 0.0418 at $64\times32$.
*   Radiance caching matters for both terms. On an equal-time (120 s) comparison, no cache gives relMSE 1.2976; caching only ${\class{term-light}{L_i}}$ gives 0.5726; caching both ${\class{term-light}{L_i}}$ and ${\class{term-light}{L_r}}$ gives 0.4129.
*   Future work suggested: **combining the approach with explicit spatial data structures** to vary resolution by complexity, or adopting a variable bin-size strategy.

## References

1. <span id="ref-1"></span>Kajiya, James T. *"The Rendering Equation."* *SIGGRAPH '86: Proceedings of the 13th Annual Conference on Computer Graphics and Interactive Techniques*, pp. 143-150, 1986. [https://doi.org/10.1145/15886.15902](https://doi.org/10.1145/15886.15902).

2. <span id="ref-2"></span>Pharr, Matt, Wenzel Jakob, and Greg Humphreys. *Physically Based Rendering: From Theory to Implementation*. 3rd ed., Morgan Kaufmann, 2016. [http://www.pbr-book.org](http://www.pbr-book.org).

3. <span id="ref-3"></span>Dodik, Ana, Marios Papas, Cengiz Öztireli, and Thomas Müller. *"Path Guiding Using Spatio-Directional Mixture Models."* *Computer Graphics Forum*, vol. 41, no. 1, pp. 172-189, 2022. [https://arxiv.org/abs/2006.01524](https://arxiv.org/abs/2006.01524).

4. <span id="ref-4"></span>Müller, Thomas, Markus Gross, and Jan Novák. *"Practical Path Guiding for Efficient Light-Transport Simulation."* *Computer Graphics Forum*, vol. 36, no. 4, pp. 91-100, 2017. Presented at EGSR 2017. [https://doi.org/10.1111/cgf.13227](https://doi.org/10.1111/cgf.13227).

5. <span id="ref-5"></span>Bako, Steve, Mark Meyer, Tony DeRose, and Pradeep Sen. *"Offline Deep Importance Sampling for Monte Carlo Path Tracing."* *Computer Graphics Forum*, vol. 38, no. 7, pp. 527-542, 2019. Presented at Pacific Graphics 2019.

6. <span id="ref-6"></span>Müller, Thomas, Brian McWilliams, Fabrice Rousselle, Markus Gross, and Jan Novák. *"Neural Importance Sampling."* *ACM Transactions on Graphics (TOG)*, vol. 38, no. 5, Article 145, 2019.

7. <span id="ref-7"></span>Müller, Thomas, Fabrice Rousselle, Jan Novák, and Alexander Keller. *"Real-Time Neural Radiance Caching for Path Tracing."* *ACM Transactions on Graphics (TOG)*, vol. 40, no. 4, Article 36, August 2021. Presented at SIGGRAPH 2021. [https://doi.org/10.1145/3450626.3459812](https://doi.org/10.1145/3450626.3459812).

8. <span id="ref-8"></span>Dong, Honghao, Guoping Wang, and Sheng Li. *"Neural Parametric Mixtures for Path Guiding."* *SIGGRAPH ’23 Conference Proceedings*, Article 29, 2023. [https://doi.org/10.1145/3588432.3591533](https://doi.org/10.1145/3588432.3591533).

9. <span id="ref-9"></span>Litalien, Joey, Miloš Hašan, Fujun Luan, Krishna Mullia, and Iliyan Georgiev. *"Neural Product Importance Sampling via Warp Composition."* *SIGGRAPH Asia 2024 Conference Papers*, 2024. [https://doi.org/10.1145/3680528.3687566](https://doi.org/10.1145/3680528.3687566).

10. <span id="ref-10"></span>Figueiredo, Pedro, Qihao He, and Nima Khademi Kalantari. *"Neural Path Guiding with Distribution Factorization."* *Eurographics Symposium on Rendering (EGSR)*, 2025. [https://arxiv.org/abs/2506.00839](https://arxiv.org/abs/2506.00839).

11. <span id="ref-11"></span>*Introduction to Probability, Statistics and Random Processes*. [https://www.probabilitycourse.com/](https://www.probabilitycourse.com/).

12. <span id="ref-12"></span>Veach, Eric. *Robust Monte Carlo Methods for Light Transport Simulation*. PhD dissertation, Stanford University, December 1997. [https://graphics.stanford.edu/papers/veach_thesis/thesis.pdf](https://graphics.stanford.edu/papers/veach_thesis/thesis.pdf).

13. <span id="ref-13"></span>Owen, Art B. *"Monte Carlo Theory, Methods and Examples."* [https://artowen.su.domains/mc/](https://artowen.su.domains/mc/).

14. <span id="ref-14"></span>TU Wien. *"Rendering (VU)."* Computer Graphics and Algorithms, Summer Semester 2020. [https://www.cg.tuwien.ac.at/courses/Rendering/VU.SS2020.html](https://www.cg.tuwien.ac.at/courses/Rendering/VU.SS2020.html).

15. <span id="ref-15"></span>KAIST CS580: Advanced Topics in Computer Graphics. *"Neural Rendering."* Spring 2024. [https://mhsung.github.io/kaist-cs580-spring-2024/](https://mhsung.github.io/kaist-cs580-spring-2024/).

16. <span id="ref-16"></span>Huang, Jiawei, Akito Iizuka, Hajime Tanaka, Taku Komura, and Yoshifumi Kitamura. *"Online Neural Path Guiding with Normalized Anisotropic Spherical Gaussians."* *ACM Transactions on Graphics (TOG)*, vol. 43, no. 3, Article 26, April 2024.

17. <span id="ref-17"></span>Lisitsa, Nikita. *"Multiple Importance Sampling."* [https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html](https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html).

18. <span id="ref-18"></span>Carnegie Mellon University. *"15-468: Physically Based Rendering and Advanced Image Synthesis."* Spring 2024. [https://graphics.cs.cmu.edu/courses/15-468/2024_spring](https://graphics.cs.cmu.edu/courses/15-468/2024_spring).

19. <span id="ref-19"></span>Dinh, Laurent, David Krueger, and Yoshua Bengio. *"NICE: Non-linear Independent Components Estimation."* *ICLR Workshop*, 2015. [https://arxiv.org/abs/1410.8516](https://arxiv.org/abs/1410.8516).

20. <span id="ref-20"></span>Vicini, Delio. *"Efficient and Accurate Physically-Based Differentiable Rendering."* *EPFL PhD Thesis No. 9008*, 2022. [https://dvicini.github.io/phdthesis/](https://dvicini.github.io/phdthesis/). *The radiometry section of these notes follows Chapter 3 closely, reproduced with the author's permission.*

21. <span id="ref-21"></span>Lu, Haolin, Wesley Chang, Trevor Hedstrom, and Tzu-Mao Li. *"Real-Time Path Guiding Using Bounding Voxel Sampling."* *ACM Transactions on Graphics (TOG)*, vol. 43, no. 4, Article 125, July 2024. [https://doi.org/10.1145/3658203](https://doi.org/10.1145/3658203).

22. <span id="ref-22"></span>Straub, Julian. *"Bayesian Inference with the von-Mises-Fisher Distribution in 3D."* Technical writeup, 2017. [https://jstraub.github.io/download/straub2017vonMisesFisherInference.pdf](https://jstraub.github.io/download/straub2017vonMisesFisherInference.pdf).

23. <span id="ref-23"></span>Vorba, Jiří, Johannes Hanika, Sebastian Herholz, Thomas Müller, Jaroslav Křivánek, and Alexander Keller. *"Path Guiding in Production."* *ACM SIGGRAPH 2019 Courses*, 2019. [https://doi.org/10.1145/3305366.3328091](https://doi.org/10.1145/3305366.3328091). Course notes: [http://cgg.mff.cuni.cz/~jirka/path-guiding-in-production/2019/index.html](http://cgg.mff.cuni.cz/~jirka/path-guiding-in-production/2019/index.html).

24. <span id="ref-24"></span>Müller, Thomas. *"'Practical Path Guiding' in Production."* Talk slides with speaker notes, SIGGRAPH 2019 course *Path Guiding in Production*. [https://tom94.net/data/courses/vorba19guiding/vorba19guiding-slides.pdf](https://tom94.net/data/courses/vorba19guiding/vorba19guiding-slides.pdf).

25. <span id="ref-25"></span>Müller, Thomas. *practical-path-guiding*: reference implementation of PPG and its production extensions in Mitsuba. [https://github.com/Tom94/practical-path-guiding](https://github.com/Tom94/practical-path-guiding).

26. <span id="ref-26"></span>Dinh, Laurent, Jascha Sohl-Dickstein, and Samy Bengio. *"Density Estimation Using Real NVP."* *International Conference on Learning Representations (ICLR)*, 2017. [https://arxiv.org/abs/1605.08803](https://arxiv.org/abs/1605.08803).
