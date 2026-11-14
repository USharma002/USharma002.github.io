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
<iframe src="/interactive/cosine_forshortening.html" title="Lambert cosine law" width="100%" height="368" frameborder="0"></iframe>

- **Light is additive.** Contributions from multiple sources sum, which is what lets us split the integral apart and estimate it piecewise.
- **Light source size affects shadow softness.** A larger emitter subtends a larger solid angle, widening the penumbra.
- **Inverse square law.** Intensity decreases with the square of the distance from the source.
$$\text{Intensity} \propto \frac{1}{r^2}$$

<iframe src="/interactive/inverse_square_law.html" title="inverse square law" width="100%" height="368" frameborder="0"></iframe>

Three further assumptions are implicit in everything that follows, and they are worth stating because they bound what the model can represent:

- **Geometric optics.** Light is treated as particles travelling along trajectories. Interference, diffraction and polarization are outside the model.
- **Steady state.** The light distribution is assumed to have settled; we do not model temporal effects such as temperature changes affecting infrared radiation.
- **Vacuum between surfaces.** Radiance is constant along a ray through empty space, so transport happens only at surfaces. Participating media (fog, smoke, skin, clouds) break this assumption and need the volumetric formulation, which these notes do not cover.

### Scene Components
Although there are many ways to write a ray tracer, all such systems simulate at least the following objects and phenomena:

- **Cameras**: A camera model determines how and from where the scene is viewed, including how an image of the scene is recorded on a sensor. Many rendering systems generate viewing rays starting at the camera that are then traced into the scene to determine which objects are visible at each pixel.

{{< 
figure src="/images/path_tracing/basics/camera.svg"
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
height="392" 
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

Radiometry gives the units in which light is measured. This section follows Chapter 3 of Veach's thesis [[12]](#ref-12), Chapter 4 of PBRT [[2]](#ref-2) and Chapter 3 of Delio Vicini's PhD thesis [[20]](#ref-20). It works within the geometric-optics and steady-state assumptions [listed above](#assumptions). PBRT adds two more that are used implicitly everywhere: **linearity** (the combined effect of two inputs is the sum of their individual effects) and **no fluorescence or phosphorescence** (light at one wavelength behaves independently of light at other wavelengths and times).

In geometric optics we think of light as photon particles travelling at light speed along trajectories in 3D space. A photon has a wavelength $\lambda$ and can be emitted, scattered or absorbed. The pixel response of a virtual camera sensor depends on the number of incident photons and their energy, which is determined by the wavelength:

$$
\begin{equation}
E = \frac{hc}{\lambda},
\label{eq:photon-energy}
\end{equation}
$$

where $h = 6.626 \times 10^{-34}\,\mathrm{m^2 kg/s}$ is Planck's constant, $c = 299\,792\,458\,\mathrm{m/s}$ the speed of light, and $\lambda$ the photon's wavelength in metres. The human visual system is sensitive to wavelengths from 380 nm to 700 nm.

We could model individual photon events, but there is no need at this granularity: the numbers of photons involved are large enough that their total energy can safely be assumed continuous, since a typical camera sensor collects around $10^5$ photons per pixel. Applications such as single-photon imaging, where photons must be modelled individually, are a different matter.

#### Domains and Measures

Every radiometric quantity is a density of energy with respect to some measure, and every integral in light transport is taken with respect to one. Getting the measure right is most of the work in the derivations that follow, so the notation is fixed here first.

**Surfaces and area.** The scene geometry is a finite set of surfaces whose union is written $\mathcal{M}$. The **area measure** $A$ on $\mathcal{M}$ gives $A(D)$, the area of a region $D \subset \mathcal{M}$, and $\int_{\mathcal{M}} f(\mathbf{x})\, \mathrm{d}A(\mathbf{x})$ is the integral of $f$ with respect to surface area.

**Directions and solid angle.** A direction is a unit vector $\boldsymbol{\omega}$, and the set of all directions is the unit sphere $\mathbb{S}^2$. Let $\sigma$ be the usual surface-area measure on $\mathbb{S}^2$. The **solid angle** occupied by a set of directions $D \subset \mathbb{S}^2$ is $\sigma(D)$, measured in steradians $\mathrm{sr}$; it is the two-dimensional analogue of an ordinary angle. The whole sphere has $\sigma(\mathbb{S}^2) = 4\pi$. The integration element is written $\mathrm{d}\sigma(\boldsymbol{\omega})$, usually abbreviated to $\mathrm{d}\boldsymbol{\omega}$.

At a surface point $\mathbf{x}$ with normal $\mathbf{n}$, the tangent plane splits the sphere into the **upward hemisphere** $\mathcal{H}^2_+ = \lbrace \boldsymbol{\omega} : \boldsymbol{\omega}\cdot\mathbf{n} > 0 \rbrace$ and the downward hemisphere $\mathcal{H}^2_-$. The rendering equation for an opaque surface integrates over $\mathcal{H}^2_+$, which these notes also write as $\Omega$.

**Spherical coordinates.** A direction can be written as a polar angle $\theta$ measured from $\mathbf{n}$ and an azimuth $\phi$ around it, with $\cos\theta = \boldsymbol{\omega}\cdot\mathbf{n}$. In these coordinates

$$
\begin{equation}
\mathrm{d}\sigma(\boldsymbol{\omega}) = \sin\theta\, \mathrm{d}\theta\, \mathrm{d}\phi .
\label{eq:rad-sph}
\end{equation}
$$

The $\sin\theta$ is the Jacobian of the map $(\theta,\phi) \mapsto \boldsymbol{\omega}$: a band of fixed width $\mathrm{d}\theta$ is a circle of radius $\sin\theta$, so it covers less of the sphere near the pole. As a check, $\int_0^{2\pi}\int_0^{\pi} \sin\theta\, \mathrm{d}\theta\, \mathrm{d}\phi = 4\pi$.

**Projected solid angle.** The projected solid angle measure at $\mathbf{x}$ weights each direction by its cosine with the normal:

$$
\begin{equation}
\sigma^{\perp}_{\mathbf{x}}(D) = \int_D \lvert \boldsymbol{\omega} \cdot \mathbf{n} \rvert\, \mathrm{d}\sigma(\boldsymbol{\omega}),
\qquad
\mathrm{d}\sigma^{\perp}(\boldsymbol{\omega}) = \lvert\cos\theta\rvert\, \mathrm{d}\sigma(\boldsymbol{\omega}).
\label{eq:projected-solid-angle}
\end{equation}
$$

The name comes from a geometric picture: for a set $D$ inside one hemisphere, project $D$ straight down onto the tangent plane, and $\sigma^{\perp}(D)$ is the area of the resulting planar region. The whole upper hemisphere projects to the unit disc, so

$$
\begin{equation}
\sigma^{\perp}(\mathcal{H}^2_+) = \int_0^{2\pi}\int_0^{\pi/2} \cos\theta \sin\theta\, \mathrm{d}\theta\, \mathrm{d}\phi = \pi .
\label{eq:rad-hemi-pi}
\end{equation}
$$

This $\pi$ is where the $\pi$ in the Lambertian BRDF $\rho/\pi$ and in the cosine-weighted density $\cos\theta/\pi$ comes from. The abbreviation $\mathrm{d}\boldsymbol{\omega}^{\perp} \coloneqq \mathrm{d}\sigma^{\perp}(\boldsymbol{\omega})$ is common. Both conventions (cosine written out, or absorbed into the measure) appear in the literature, and the papers later in these notes use both, so it is worth checking which one a given paper means.

**Solid angle subtended by a surface.** The solid angle subtended by a surface from a point $\mathbf{x}$ is found by projecting the surface onto the unit sphere centred at $\mathbf{x}$ and measuring the resulting set of directions. For a small patch $\mathrm{d}A(\mathbf{y})$ at distance $r = \lVert \mathbf{x} - \mathbf{y}\rVert$ whose normal makes an angle $\theta$ with the line to $\mathbf{x}$ ({{< figref "fig-solid-angle" >}}),

$$
\begin{equation}
\mathrm{d}\sigma(\boldsymbol{\omega}) = \frac{\lvert\cos\theta\rvert}{r^2}\, \mathrm{d}A(\mathbf{y}) .
\label{eq:rad-dsigma-dA}
\end{equation}
$$

The cosine foreshortens the patch to the part of it that faces $\mathbf{x}$, and dividing by $r^2$ scales that area down to the unit sphere. This one relation is the change of variables behind the [surface-area form](#surface-area-geometry-explicit-rendering-equation) of the rendering equation, the geometry term $G$, and the conversion of a light's area density into a solid-angle density for MIS.

{{< figure src="/images/path_tracing/radiometry/solid_angle.svg" id="fig-solid-angle" caption="The solid angle subtended at $\mathbf{x}$ by a patch $\mathrm{d}A(\mathbf{y})$. Only the foreshortened area $\mathrm{d}A\cos\theta$ perpendicular to the line of sight counts, and it shrinks by $1/r^2$ when projected onto the unit sphere." width="75%" >}}

#### Radiometric Quantities

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
\Phi = \int_S E(\mathbf{x})\, \mathrm{d}A(\mathbf{x}).
\label{eq:flux-from-irradiance}
\end{equation}
$$

The Radon–Nikodym derivative is uniquely defined up to sets of measure zero. A precise measure-theoretic derivation of all radiometric quantities is not needed here; Veach's thesis [[12]](#ref-12) covers it.

**Intensity.** Radiant intensity is flux per unit solid angle,

$$
\begin{equation}
I(\boldsymbol{\omega}) = \frac{\mathrm{d}\Phi}{\mathrm{d}\sigma(\boldsymbol{\omega})},
\label{eq:rad-intensity}
\end{equation}
$$

with units $\mathrm{W/sr}$. It describes the directional distribution of light and is meaningful only for point light sources. Combining it with $\eqref{eq:rad-dsigma-dA}$ gives both of the laws listed among the [assumptions](#assumptions) at once. The flux a point source sends onto a patch $\mathrm{d}A$ at distance $r$ is $\mathrm{d}\Phi = I\, \mathrm{d}\sigma = I \cos\theta\, \mathrm{d}A / r^2$, so the irradiance there is

$$
\begin{equation}
E = \frac{I \cos\theta}{r^2}.
\label{eq:rad-point-source}
\end{equation}
$$

The $1/r^2$ is the inverse square law and the $\cos\theta$ is Lambert's cosine law. For a source of power $\Phi$ that emits equally in all directions, $I = \Phi/4\pi$ and a surface facing it receives $E = \Phi / (4\pi r^2)$.

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

#### Incident and Exitant Radiance

We distinguish ${\class{term-light}{L_i}}$ from ${\class{term-light}{L_o}}$. For a point $\mathbf{x}$ that is *not* on a surface and not inside a participating medium,

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

#### Relations Between the Quantities

**Three equivalent forms of radiance.** Because $\mathrm{d}A^{\perp}\, \mathrm{d}\sigma = \lvert\cos\theta\rvert\, \mathrm{d}A\, \mathrm{d}\sigma = \mathrm{d}A\, \mathrm{d}\sigma^{\perp}$, the definition $\eqref{eq:radiance}$ can be written with the cosine attached to either measure:

$$
\begin{equation}
L(\mathbf{x}, \boldsymbol{\omega})
= \frac{\mathrm{d}^2\Phi}{\mathrm{d}A^{\perp}\, \mathrm{d}\sigma}
= \frac{\mathrm{d}^2\Phi}{\lvert\boldsymbol{\omega}\cdot\mathbf{n}\rvert\, \mathrm{d}A\, \mathrm{d}\sigma}
= \frac{\mathrm{d}^2\Phi}{\mathrm{d}A\, \mathrm{d}\sigma^{\perp}} .
\label{eq:rad-three-forms}
\end{equation}
$$

The last form is the most useful on real surfaces, because it uses the natural area measure of the surface.

**Throughput.** The product $\mathrm{d}\mu(\mathbf{x}, \boldsymbol{\omega}) = \mathrm{d}A(\mathbf{x})\, \mathrm{d}\sigma^{\perp}_{\mathbf{x}}(\boldsymbol{\omega})$ is called the **throughput measure**. It measures the light-carrying capacity of a small bundle of rays, and radiance is simply *power per unit throughput*, $L = \mathrm{d}\Phi/\mathrm{d}\mu$. When a ray is written by its two endpoints instead of a point and a direction, substituting $\eqref{eq:rad-dsigma-dA}$ gives the same measure in a symmetric form,

$$
\begin{equation}
\mathrm{d}\mu(\mathbf{x} \to \mathbf{x}') = V(\mathbf{x} \leftrightarrow \mathbf{x}')\, \frac{\lvert\cos\theta\rvert\, \lvert\cos\theta'\rvert}{\lVert \mathbf{x} - \mathbf{x}' \rVert^2}\, \mathrm{d}A(\mathbf{x})\, \mathrm{d}A(\mathbf{x}'),
\label{eq:rad-throughput}
\end{equation}
$$

where $\theta$ and $\theta'$ are the angles between the segment and the normals at its two ends, and $V$ is 1 if the two points see each other and 0 otherwise. This is the geometry term $G$ of the [surface-area form](#surface-area-geometry-explicit-rendering-equation), appearing before any rendering equation has been written.

**Irradiance from radiance.** Irradiance is recovered by integrating incident radiance over the hemisphere with the projected solid angle measure:

$$
\begin{equation}
E(\mathbf{x}) = \int_{\mathcal{H}^2_+} {\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega})}}\, \mathrm{d}\sigma^{\perp}(\boldsymbol{\omega})
= \int_0^{2\pi}\int_0^{\pi/2} {\class{term-light}{L_i(\mathbf{x}, \theta, \phi)}} \cos\theta \sin\theta\, \mathrm{d}\theta\, \mathrm{d}\phi .
\label{eq:rad-irradiance-integral}
\end{equation}
$$

If the radiance is the same from every direction, $\eqref{eq:rad-hemi-pi}$ gives $E = \pi L_i$.

**Summary.**

| Quantity | Symbol | Definition | Units |
|---|---|---|---|
| Radiant energy | $Q$ | energy of the photons counted | $\mathrm{J}$ |
| Radiant flux (power) | $\Phi$ | $\mathrm{d}Q/\mathrm{d}t$ | $\mathrm{W}$ |
| Irradiance (incident); radiant exitance or radiosity (leaving) | $E$; $M$ or $B$ | $\mathrm{d}\Phi/\mathrm{d}A$ | $\mathrm{W/m^2}$ |
| Radiant intensity | $I$ | $\mathrm{d}\Phi/\mathrm{d}\sigma$ | $\mathrm{W/sr}$ |
| Radiance | $L$ | $\mathrm{d}^2\Phi/(\mathrm{d}A\, \mathrm{d}\sigma^{\perp})$ | $\mathrm{W/(m^2\,sr)}$ |
| Spectral radiance | $L_\lambda$ | $\mathrm{d}L/\mathrm{d}\lambda$ | $\mathrm{W/(m^2\,sr\,nm)}$ |

With these definitions in place, the quantities in the rendering equation stop being symbols and start being measurements: ${\class{term-light}{L_o}}$, ${\class{term-light}{L_e}}$ and ${\class{term-light}{L_i}}$ are all spectral radiances in $\mathrm{W/(sr\,m^2)}$, $\mathrm{d}\boldsymbol{\omega}$ is a solid angle in steradians, and the $(\boldsymbol{\omega}_i \cdot \mathbf{n})$ factor is the projected-area conversion of $\eqref{eq:projected-area}$.


### The BSDF

The rendering equation needs one more ingredient: a description of what a surface does with the light that reaches it. This section follows Veach, Section 3.6, and PBRT, Section 4.3.

**Definition.** Fix a surface point $\mathbf{x}$ and an outgoing direction $\boldsymbol{\omega}_o$. Light arriving from a small cone $\mathrm{d}\sigma(\boldsymbol{\omega}_i)$ around $\boldsymbol{\omega}_i$ produces the irradiance

$$
\mathrm{d}E(\boldsymbol{\omega}_i) = {\class{term-light}{L_i(\boldsymbol{\omega}_i)}}\, \mathrm{d}\sigma^{\perp}(\boldsymbol{\omega}_i)
$$

at $\mathbf{x}$, and contributes some radiance $\mathrm{d}L_o(\boldsymbol{\omega}_o)$ to the light leaving in direction $\boldsymbol{\omega}_o$. Experimentally the two are proportional, $\mathrm{d}L_o(\boldsymbol{\omega}_o) \propto \mathrm{d}E(\boldsymbol{\omega}_i)$, which is the linearity assumption at work. The **bidirectional scattering distribution function** (BSDF) is defined as the constant of proportionality:

$$
\begin{equation}
{\class{term-bsdf}{f_s(\boldsymbol{\omega}_i \to \boldsymbol{\omega}_o)}} = \frac{\mathrm{d}L_o(\boldsymbol{\omega}_o)}{\mathrm{d}E(\boldsymbol{\omega}_i)} = \frac{\mathrm{d}L_o(\boldsymbol{\omega}_o)}{{\class{term-light}{L_i(\boldsymbol{\omega}_i)}}\, \mathrm{d}\sigma^{\perp}(\boldsymbol{\omega}_i)} .
\label{eq:bsdf-def}
\end{equation}
$$

In words, it is the observed radiance leaving in direction $\boldsymbol{\omega}_o$ per unit of irradiance arriving from $\boldsymbol{\omega}_i$. Its units are $\mathrm{sr}^{-1}$, and since it is a density it can exceed 1. The arrow shows the direction of light flow. Other sources, and the rest of these notes, write the same function as $f_s(\mathbf{x}, \boldsymbol{\omega}_i, \boldsymbol{\omega}_o)$ or $f_r$.

**The scattering equation.** Rearranging $\eqref{eq:bsdf-def}$ and integrating over all incident directions predicts the scattered radiance:

$$
\begin{equation}
{\class{term-light}{L_o(\boldsymbol{\omega}_o)}} = \int_{\mathbb{S}^2} {\class{term-light}{L_i(\boldsymbol{\omega}_i)}}\, {\class{term-bsdf}{f_s(\boldsymbol{\omega}_i \to \boldsymbol{\omega}_o)}}\, \mathrm{d}\sigma^{\perp}(\boldsymbol{\omega}_i) .
\label{eq:scattering-equation}
\end{equation}
$$

This is the integral inside the rendering equation. The cosine there is not a separate physical law added on top of the BSDF: it is the $\mathrm{d}\sigma^{\perp}$ of the irradiance in the definition.

**BRDF and BTDF.** The scattered light is usually split into a reflected and a transmitted part. The **BRDF** $f_r$ is $f_s$ restricted to pairs of directions on the same side of the surface, and the **BTDF** $f_t$ to pairs on opposite sides. The BSDF is the union of two BRDFs (one for each side) and two BTDFs (one for each direction of transmission); its advantage is that one function and one integral over $\mathbb{S}^2$ cover every kind of surface.

{{< 
figure src="/images/path_tracing/bsdf/BSDF_combined.png"
id="fig-bsdf-combined"
caption="BTDF + BRDF Visualization (uniform for both here)"
width="100%" 
>}}

**Properties of physical BRDFs.**

1. **Reciprocity** (symmetry): $f_r(\boldsymbol{\omega}_i \to \boldsymbol{\omega}_o) = f_r(\boldsymbol{\omega}_o \to \boldsymbol{\omega}_i)$ for all pairs of directions.
2. **Energy conservation**: a surface cannot reflect more energy than it receives,

$$
\begin{equation}
\int_{\mathcal{H}^2} f_r(\boldsymbol{\omega}_i \to \boldsymbol{\omega}_o)\, \mathrm{d}\sigma^{\perp}(\boldsymbol{\omega}_o) \le 1 \quad \text{for all } \boldsymbol{\omega}_i .
\label{eq:bsdf-energy}
\end{equation}
$$

The integral in $\eqref{eq:bsdf-energy}$ is the fraction of the light arriving from $\boldsymbol{\omega}_i$ that is reflected, the **reflectance** or **albedo** $\rho$ (PBRT's hemispherical-directional reflectance $\rho_{hd}$).

These two conditions are specific to reflection. A BTDF is not symmetric in general, since radiance changes when light is refracted. This matters for any algorithm that traces paths from the light as well as from the camera, because light and importance then obey different scattering rules. Veach handles it with the **adjoint BSDF**, $f_s^*(\boldsymbol{\omega}_i \to \boldsymbol{\omega}_o) = f_s(\boldsymbol{\omega}_o \to \boldsymbol{\omega}_i)$, which is the one to use for importance transport and for scattering particles traced from the light. The general reciprocity and energy-conservation conditions are derived [below](#non-symmetric-bsdfs-and-refraction).

**Example: the Lambertian BRDF.** A perfectly diffuse surface scatters equally into all directions, so its BRDF is a constant $c$. Its albedo is $\rho = \int_{\mathcal{H}^2} c\, \mathrm{d}\sigma^{\perp} = c\,\pi$ by $\eqref{eq:rad-hemi-pi}$, so

$$
\begin{equation}
f_r = \frac{\rho}{\pi}, \qquad 0 \le \rho \le 1 .
\label{eq:bsdf-lambert}
\end{equation}
$$

The matching importance-sampling density is the cosine-weighted one, $p(\boldsymbol{\omega}) = \cos\theta/\pi$, for which the estimator weight $f_r \cos\theta / p$ is exactly $\rho$.

**Specular surfaces.** A perfect mirror or a smooth refractive interface scatters each incident direction into a single outgoing direction, so its BSDF is a Dirac delta distribution rather than an ordinary function. Such a BSDF cannot be evaluated for an arbitrary pair of directions. It can only be *sampled*, and the delta in the BSDF then cancels against the delta in the sampling density. The path tracer further down treats these bounces as a special case for exactly this reason.

#### Material Types and Example BSDFs

Materials are usually described by three basic types of scattering ({{< figref "fig-bsdf-types" >}}, {{< figref "fig-bsdf-objects" >}}):

- Perfectly diffuse  (light is scattered equally in/from all directions)
- Perfectly specular (light is reflected in/from exactly one direction)
- Glossy (light is scattered preferentially in a set of directions around the mirror direction, giving blurry reflections)

{{< 
figure src="/images/path_tracing/bsdf/BSDF.svg"
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

Practical renderers provide a set of BSDF models covering these types and their combinations; {{< figref "fig-bsdf-mitsuba" >}} summarizes those of Mitsuba 3.

{{< 
figure src="/images/path_tracing/bsdf/bsdf_overview.jpg"
id="fig-bsdf-mitsuba"
caption="Schematic overview of the most important surface scattering models in Mitsuba 3. The arrows indicate possible outcomes of an interaction with a surface that has the respective model applied to it."
width="100%" 
>}}

More details on BSDFs can be found in the [Mitsuba 3 BSDF plugin documentation](https://mitsuba.readthedocs.io/en/stable/src/generated/plugins_bsdfs.html) or in [PBRT's reflection models chapter](https://www.pbr-book.org/4ed/Reflection_Models) [[2]](#ref-2).


The viewer below shows what these functions look like. For a fixed $\omega_o$ (the arrow), it plots ${\class{term-bsdf}{f_s(\omega_i, \omega_o)}}$ as a height over all directions $\omega_i$, for several Mitsuba 3 BSDFs. The values were tabulated by calling `bsdf.eval()` in Mitsuba on a grid of directions and dividing out the cosine that Mitsuba includes.

Each direction $\omega_i$ is drawn at its projection onto the surface plane, so the hemisphere becomes the unit disk and the rings mark $\theta_i$ every $15°$. This choice makes area on the disk equal to [projected solid angle](#domains-and-measures), $\mathrm{d}\sigma^{\perp} = \lvert\cos\theta_i\rvert\,\mathrm{d}\sigma$. Two things follow. The volume under the surface is $\int {\class{term-bsdf}{f_s}} \lvert\cos\theta_i\rvert\, \mathrm{d}\sigma(\omega_i)$, printed below the plot, which for a reflective material is the fraction of light it reflects: 0.5 for the diffuse surface at every angle. And directions drawn with density proportional to ${\class{term-bsdf}{f_s}}\lvert\cos\theta_i\rvert$, the ideal BSDF importance sampling discussed [above](#what-are-we-actually-sampling), land on the disk with a density proportional to the height. Press *sample* to see this.

To explore the viewer: the diffuse BSDF is a flat plateau of height $\rho/\pi$. The rough conductor has a single lobe around the mirror direction that sharpens and grows by orders of magnitude towards grazing angles (switch to the log scale). The rough plastic is the sum of a plateau and a lobe. The rough dielectric has a second lobe below the disk for the refracted directions.

{{< 
fullscreen-iframe 
id="fig-bsdf-eval" 
src="/interactive/bsdf_eval.html" 
height="500" 
>}}

#### Microfacet Models: the Basics

Glossy materials in production renderers, including the rough conductor, plastic and dielectric in the viewer above, are **microfacet** BSDFs. This is a short overview following PBRT, Section 9.6 [[2]](#ref-2).

**The idea.** A rough surface is modelled as a large number of tiny flat facets, each too small to be resolved, so they are described statistically rather than one by one ({{< figref "fig-microfacets" >}}). Each facet reflects like a perfect mirror (or refracts like smooth glass), and the roughness of the surface is the spread of their normals $\omega_m$. Three geometric effects matter ({{< figref "fig-masking-shadowing" >}}): **masking**, a facet hidden from the viewer by another; **shadowing**, a facet that light cannot reach; and **interreflection**, light bouncing between facets before leaving. Widely used microfacet BSDFs ignore interreflection.

{{< figure src="/images/path_tracing/bsdf/microfacets.svg" id="fig-microfacets" caption="A microsurface: the macrosurface (dashed, normal $\mathbf{n}$) is resolved into small facets with normals $\omega_m$. Rougher surfaces have a wider spread of facet normals. (After PBRT [[2]](#ref-2), Fig. 9.20)" width="70%" >}}

{{< figure src="/images/path_tracing/bsdf/masking_shadowing.svg" id="fig-masking-shadowing" caption="The three geometric effects on a microsurface. Masking: the highlighted facet is hidden from a viewer at a grazing angle. Shadowing: light at a grazing angle is blocked before it reaches the facet. Interreflection: light bounces between facets before leaving. (After PBRT [[2]](#ref-2), Fig. 9.21)" width="95%" >}}

**The distribution of normals.** $D(\omega_m)$ is the density of facet normals, normalized so that the facets, projected onto the macrosurface, cover exactly its area:

$$
\begin{equation}
\int_{\mathcal{H}^2(\mathbf{n})} D(\omega_m) \cos\theta_m\, \mathrm{d}\omega_m = 1 .
\label{eq:mf-norm}
\end{equation}
$$

The standard choice is the **Trowbridge–Reitz** distribution, also known as GGX:

$$
\begin{equation}
\begin{aligned}
D(\omega_m) &= \frac{1}{\pi \alpha_x \alpha_y \cos^4\theta_m \left(1 + \tan^2\theta_m \left(\dfrac{\cos^2\phi_m}{\alpha_x^2} + \dfrac{\sin^2\phi_m}{\alpha_y^2}\right)\right)^2}, \\[6pt]
D(\omega_m) &= \frac{1}{\pi \alpha^2 \cos^4\theta_m \left(1 + \dfrac{\tan^2\theta_m}{\alpha^2}\right)^2} \quad \text{for } \alpha_x = \alpha_y = \alpha .
\end{aligned}
\label{eq:mf-ggx}
\end{equation}
$$

$\alpha_x$ and $\alpha_y$ set the roughness along the two tangent directions; unequal values give anisotropic, stretched highlights. PBRT maps a user-facing roughness to $\alpha = \sqrt{\text{roughness}}$, and treats a surface with $\max(\alpha_x, \alpha_y) < 10^{-3}$ as perfectly smooth, using the specular BSDF instead. Small $\alpha$ concentrates the normals around $\mathbf{n}$, as {{< figref "fig-ggx" >}} shows.

**Masking and shadowing.** The fraction of facets with normal $\omega_m$ that are visible from a direction $\omega$ is the masking function $G_1(\omega)$. With Smith's model it is written through an auxiliary function $\Lambda$, which for Trowbridge–Reitz has a closed form:

$$
\begin{equation}
G_1(\omega) = \frac{1}{1 + \Lambda(\omega)},
\qquad
\Lambda(\omega) = \frac{\sqrt{1 + \alpha^2 \tan^2\theta} - 1}{2},
\label{eq:mf-g1}
\end{equation}
$$

with $\alpha = \sqrt{\alpha_x^2 \cos^2\phi + \alpha_y^2 \sin^2\phi}$ in the anisotropic case. Masking only matters near grazing angles, and sooner for rougher surfaces ({{< figref "fig-ggx" >}}, right). For a facet to contribute it must be visible from both $\omega_o$ and $\omega_i$; PBRT uses the height-correlated masking-shadowing function

$$
\begin{equation}
G(\omega_o, \omega_i) = \frac{1}{1 + \Lambda(\omega_o) + \Lambda(\omega_i)} .
\label{eq:mf-g}
\end{equation}
$$

{{< figure src="/images/path_tracing/bsdf/ggx_d_g1.svg" id="fig-ggx" caption="Left: the Trowbridge–Reitz distribution $D(\theta_m)\cos\theta_m$ for three roughnesses. Right: its masking function $G_1$, which stays near 1 until grazing angles and falls off sooner for rougher surfaces. Both are plotted from the equations above. (After PBRT [[2]](#ref-2), Figs. 9.23 and 9.26)" width="95%" >}}

**The Torrance–Sparrow BRDF.** A perfect-mirror facet reflects $\omega_o$ into $\omega_i$ only if its normal is the **half vector** between them ({{< figref "fig-half-vector" >}}):

$$
\begin{equation}
\omega_m = \frac{\omega_i + \omega_o}{\lVert \omega_i + \omega_o \rVert} .
\label{eq:mf-half}
\end{equation}
$$

Counting the light reflected by the visible facets with that normal gives the microfacet BRDF

$$
\begin{equation}
{\class{term-bsdf}{f_r(\mathbf{p}, \omega_o, \omega_i)}} = \frac{D(\omega_m)\, F(\omega_o \cdot \omega_m)\, G(\omega_i, \omega_o)}{4 \cos\theta_i \cos\theta_o} :
\label{eq:mf-ts}
\end{equation}
$$

the density of facets oriented the right way, the Fresnel reflectance $F$ evaluated at the angle of incidence *on the facet* (not on the macrosurface), and the fraction that is neither masked nor shadowed. The derivation does not depend on the particular microfacet distribution or Fresnel function, so the same form serves conductors and dielectrics. The $4\cos\theta_i\cos\theta_o$ in the denominator comes from the change of variables between facet normals and reflected directions below.

{{< figure src="/images/path_tracing/bsdf/half_vector.svg" id="fig-half-vector" caption="The half vector: a mirror facet reflects $\omega_o$ into $\omega_i$ only if its normal $\omega_m$ bisects them. (After PBRT [[2]](#ref-2), Fig. 9.30)" width="60%" >}}

**Sampling.** PBRT samples these BSDFs by drawing a facet normal from the **distribution of visible normals**, the normals weighted by how much of each facet $\omega_o$ actually sees,

$$
\begin{equation}
D_{\omega}(\omega_m) = \frac{G_1(\omega)}{\cos\theta}\, \max(0, \omega \cdot \omega_m)\, D(\omega_m),
\label{eq:mf-vndf}
\end{equation}
$$

with $\omega = \omega_o$, and then reflecting $\omega_o$ about the sampled $\omega_m$, $\omega_i = -\omega_o + 2(\omega_m \cdot \omega_o)\,\omega_m$. The density of $\omega_i$ needs the Jacobian of the reflection. In a frame where $\omega_o$ is the pole, the law of reflection gives $\theta_i = 2\theta_m$ and $\phi_i = \phi_m$, so $\mathrm{d}\omega_m / \mathrm{d}\omega_i = \sin\theta_m\, \mathrm{d}\theta_m\, \mathrm{d}\phi_m / (\sin 2\theta_m\, 2\,\mathrm{d}\theta_m\, \mathrm{d}\phi_m) = 1/(4\cos\theta_m)$, with $\cos\theta_m = \omega_o \cdot \omega_m$, and

$$
\begin{equation}
p(\omega_i) = D_{\omega_o}(\omega_m)\, \frac{\mathrm{d}\omega_m}{\mathrm{d}\omega_i} = \frac{D_{\omega_o}(\omega_m)}{4\, (\omega_o \cdot \omega_m)} .
\label{eq:mf-pdf}
\end{equation}
$$

Sampling the visible normals rather than $D$ itself never produces normals that face away from $\omega_o$; PBRT shows the difference on a metal plane with $\alpha = 0.01$ (Fig. 9.31). This is the VNDF sampling used for the metal plane in the [example scenes](#example-a-pair-of-scenes). For a rough dielectric, PBRT first chooses reflection or transmission with probabilities $p_r$ and $p_t$ from the Fresnel term, and the reflection density is multiplied by $p_r/(p_r + p_t)$.

#### Non-Symmetric BSDFs and Refraction

Reciprocity holds for reflection. Veach (Chapters 5 and 6) shows that it fails in two common situations that are easy to miss: whenever light is refracted, and whenever shading normals are used. Both matter as soon as an algorithm traces paths from the light as well as from the camera.

**Why it is easy to get wrong.** Refraction and shading normals are both implemented as *procedures* (refract the direction; evaluate the BSDF with a different normal), so the BSDF they correspond to is never written down, and nothing signals that it is not symmetric. An algorithm that traces particles from the lights must scatter them with the adjoint BSDF $f_s^*$. If it uses $f_s$ for both its camera paths and its particles, it is not solving any consistent light transport equation, and three things can happen (Veach, Section 5.1.1): computed radiance can be wrong by a factor of two or more even for a physically valid scene; algorithms that should be equivalent, such as path tracing and particle tracing, converge to different answers; and images show spurious artifacts, such as discontinuities that look like flat-shaded polygons.

Some non-symmetric BSDFs are simply empirical. Phong's original glossy model integrates against solid angle $\mathrm{d}\sigma$ rather than projected solid angle, so written as a BRDF it carries an extra factor $1/\lvert\omega_i \cdot \mathbf{n}\rvert$; and implementations of the Cook–Torrance model have dropped its $\cos\theta_o$ factor to save a division, which breaks its symmetry (Section 5.1.2).

**Radiance changes across a refractive interface.** When light enters a medium of higher refractive index, the same energy is squeezed into a narrower cone, so radiance must increase. For a beam hitting a patch $\mathrm{d}A$ from $\omega_i$ and refracted into $\omega_t$, conservation of energy gives

$$
L_i\, \mathrm{d}A\, \mathrm{d}\sigma^{\perp}(\omega_i) = L_t\, \mathrm{d}A\, \mathrm{d}\sigma^{\perp}(\omega_t)
\quad\Longrightarrow\quad
L_t = \frac{\mathrm{d}\sigma^{\perp}(\omega_i)}{\mathrm{d}\sigma^{\perp}(\omega_t)}\, L_i .
$$

In angular coordinates $\mathrm{d}\sigma^{\perp} = \cos\theta \sin\theta\, \mathrm{d}\theta\, \mathrm{d}\phi$. Differentiating Snell's law, $\eta_i \sin\theta_i = \eta_t \sin\theta_t$, gives $\eta_i \cos\theta_i\, \mathrm{d}\theta_i = \eta_t \cos\theta_t\, \mathrm{d}\theta_t$, and $\phi_t = \phi_i \pm \pi$ gives $\mathrm{d}\phi_i = \mathrm{d}\phi_t$. Multiplying the three equations,

$$
\begin{equation}
\eta_i^2\, \mathrm{d}\sigma^{\perp}(\omega_i) = \eta_t^2\, \mathrm{d}\sigma^{\perp}(\omega_t)
\qquad\Longrightarrow\qquad
L_t = \frac{\eta_t^2}{\eta_i^2}\, L_i .
\label{eq:veach-eta2}
\end{equation}
$$

For water this factor is about 1.78. (This is for spectral radiance per unit frequency; per unit wavelength the factor is $(\eta_t/\eta_i)^3$.)

**The BSDF of a mirror and of refraction.** Specular BSDFs are written with a Dirac distribution with respect to the projected solid angle, $\delta_{\sigma^{\perp}}$, defined by $\int_{\mathbb{S}^2} f(\omega)\, \delta_{\sigma^{\perp}}(\omega - \omega')\, \mathrm{d}\sigma^{\perp}(\omega) = f(\omega')$. With $M_N(\omega_o) = 2(\omega_o \cdot \mathbf{n})\mathbf{n} - \omega_o$ the mirror direction, a perfect mirror is

$$
{\class{term-bsdf}{f_s(\omega_i \to \omega_o)}} = \delta_{\sigma^{\perp}}\big(\omega_i - M_N(\omega_o)\big) = \frac{\delta_{\sigma}\big(\omega_i - M_N(\omega_o)\big)}{\lvert\omega_i \cdot \mathbf{n}\rvert},
$$

which reproduces $L_o(\omega_o) = L_i(M_N(\omega_o))$ in the scattering equation. Expressions with Dirac distributions must be evaluated with care when the measure of the distribution differs from the measure of the integral; the two forms above differ by exactly that cosine. If $R(\omega)$ is the refracted direction (its own inverse, $R(R(\omega)) = \omega$), perfect refraction is

$$
\begin{equation}
{\class{term-bsdf}{f_s(\omega_i \to \omega_t)}} = \frac{\eta_t^2}{\eta_i^2}\, \delta_{\sigma^{\perp}}\big(\omega_i - R(\omega_t)\big) .
\label{eq:veach-refraction}
\end{equation}
$$

**Generalized reciprocity.** Veach derives the symmetry condition that replaces $f_r(\omega_i \to \omega_o) = f_r(\omega_o \to \omega_i)$ for any physically valid material (Section 6.2). Put a small patch inside an isothermal enclosure, in thermodynamic equilibrium. The power scattered from a cone around $\omega_i$ into a cone around $\omega_o$, and in the reverse direction, are

$$
\begin{aligned}
\mathrm{d}\Phi_1 &= L_i(\omega_i)\, \mathrm{d}\sigma^{\perp}(\omega_i)\, f_s(\omega_i \to \omega_o)\, \mathrm{d}A\, \mathrm{d}\sigma^{\perp}(\omega_o), \\
\mathrm{d}\Phi_2 &= L_i(\omega_o)\, \mathrm{d}\sigma^{\perp}(\omega_o)\, f_s(\omega_o \to \omega_i)\, \mathrm{d}A\, \mathrm{d}\sigma^{\perp}(\omega_i).
\end{aligned}
$$

The principle of **detailed balance** says that in equilibrium every process and its reverse proceed at the same rate, so $\mathrm{d}\Phi_1 = \mathrm{d}\Phi_2$ and $L_i(\omega_i) f_s(\omega_i \to \omega_o) = L_i(\omega_o) f_s(\omega_o \to \omega_i)$. **Kirchhoff's equilibrium radiance law** says that $L/\eta^2$ is the same everywhere in the enclosure, so $L_i(\omega_i)/\eta_i^2 = L_i(\omega_o)/\eta_o^2$. Together:

> **Theorem (Veach 6.1).** For the BSDF of a physically valid surface, either the boundary of an opaque object or the interface between two non-absorbing media, and with no external magnetic fields,
> $$\frac{f_s(\omega_i \to \omega_o)}{\eta_o^2} = \frac{f_s(\omega_o \to \omega_i)}{\eta_i^2},$$
> where $\eta_i$ and $\eta_o$ are the refractive indices on the sides of $\omega_i$ and $\omega_o$.

The BSDF is a property of the surface, so the result holds outside the enclosure too. It reduces to ordinary symmetry for reflection, and it covers diffuse transmitters such as frosted glass, not just perfect refraction. Veach also shows that the second law of thermodynamics alone is not enough to prove reciprocity: a mirror that rotates the reflected direction by 90° instead of 180° about the normal is not symmetric, yet in an isothermal enclosure, where incident radiance is uniform, no experiment can tell it from an ordinary mirror. Detailed balance supplies the missing information.

**The adjoint BSDF of refraction.** From the theorem and $\eqref{eq:veach-refraction}$,

$$
\begin{equation}
{\class{term-bsdf}{f_s^*(\omega_i \to \omega_t)}} = f_s(\omega_t \to \omega_i) = \frac{\eta_i^2}{\eta_t^2}\, f_s(\omega_i \to \omega_t) = \delta_{\sigma^{\perp}}\big(\omega_i - R(\omega_t)\big) .
\label{eq:veach-refraction-adjoint}
\end{equation}
$$

The $(\eta_t/\eta_i)^2$ factor is absent: radiance is scaled when it crosses the interface, but importance and light particles are not, which matches the intuition that particles carry power and power is conserved across the interface. Veach's example is a pool lit from above, rendered by tracing particles to the pool bottom and then tracing camera rays: the caustics come out right only if the camera rays are scaled at the water surface and the particles are not. Scaling neither makes them too bright by $(\eta_t/\eta_i)^2$; scaling both makes them too dim by the same factor. Since a specular BSDF can only be sampled, not evaluated, an implementation needs two sampling procedures, or a flag saying whether the BSDF or its adjoint is being sampled.

For a path tracer alone the factor matters less: when a path enters and then leaves a medium, the two factors cancel. Results are still wrong if the light and the camera are in different media (an underwater light seen from above, modelled as an emitter in the water). PBRT's path tracer tracks the accumulated $\eta^2$ factors of a path separately and removes them from the throughput before the Russian roulette test, so that a path is not terminated just because a refraction scaled its throughput by a factor that the refraction back out of the object will undo [[2]](#ref-2).

**Energy conservation for general BSDFs.** Veach also generalizes the BRDF condition $\eqref{eq:bsdf-energy}$ (Theorem 6.2): for a physically valid surface,

$$
\int_{\mathbb{S}^2} f_s(\omega_i \to \omega_o)\, \mathrm{d}\sigma^{\perp}(\omega_o) \le 1 \quad \text{for all } \omega_i \in \mathbb{S}^2 .
$$

*Proof.* The irradiance is $E = \int L_i\, \mathrm{d}\sigma^{\perp}$ and the radiant exitance is $M = \int L_o\, \mathrm{d}\sigma^{\perp}$, with $L_o$ from the scattering equation, and conservation of energy requires $M \le E$ for every incident radiance. Choose all incident light to arrive from one direction, $L_i(\omega) = \delta_{\sigma^{\perp}}(\omega - \omega_i)$. Then $E = 1$, $L_o(\omega_o) = f_s(\omega_i \to \omega_o)$, and $M = \int f_s(\omega_i \to \omega_o)\, \mathrm{d}\sigma^{\perp}(\omega_o) \le 1$. $\blacksquare$

#### Shading Normals

Shading normals change the apparent orientation of a surface without changing its geometry: interpolated vertex normals make a polygon mesh look smooth, and bump mapping perturbs the normal to add apparent detail (Veach, Section 5.3). The shading formula replaces the true **geometric normal** $\mathbf{N}_g$ by the **shading normal** $\mathbf{N}_s$, both in the BSDF and in the cosine:

$$
L_o(\omega_o) = \int_{\mathbb{S}^2} L_i(\omega_i)\, f_{s,\mathbf{N}_s}(\omega_i \to \omega_o)\, \lvert\omega_i \cdot \mathbf{N}_s\rvert\, \mathrm{d}\sigma(\omega_i).
$$

This does not change the surface; it changes the BSDF. Rewriting it in the standard form, with $\lvert\omega_i \cdot \mathbf{N}_g\rvert$, shows that the BSDF actually being used is

$$
\begin{equation}
\begin{aligned}
f_s(\omega_i \to \omega_o) &= f_{s,\mathbf{N}_s}(\omega_i \to \omega_o)\, \frac{\lvert\omega_i \cdot \mathbf{N}_s\rvert}{\lvert\omega_i \cdot \mathbf{N}_g\rvert}, \\[4pt]
f_s^*(\omega_i \to \omega_o) &= f_{s,\mathbf{N}_s}(\omega_o \to \omega_i)\, \frac{\lvert\omega_o \cdot \mathbf{N}_s\rvert}{\lvert\omega_o \cdot \mathbf{N}_g\rvert} .
\end{aligned}
\label{eq:veach-shading}
\end{equation}
$$

Even if the original BSDF is symmetric, this one is not, and the adjoint is what importance transport and particle tracing must use. Some quantities still depend on the geometric normal (how many particles a polygon receives, or the solid angle it subtends), so mixing the two normals without the adjoint gives an inconsistent scene.

- **Sampling differs between the two directions.** For a Lambertian surface, a camera path should sample $\omega_i$ proportional to $\lvert\omega_i \cdot \mathbf{N}_s\rvert$, but a particle should sample it proportional to $\lvert\omega_i \cdot \mathbf{N}_g\rvert$. For a mirror, a reflected particle must be weighted by an extra $\lvert\omega_i \cdot \mathbf{N}_g\rvert / \lvert\omega_o \cdot \mathbf{N}_g\rvert$.
- **Light leaks and black patches.** If $\omega_i$ and $\omega_o$ are on opposite sides of the surface geometrically but on the same side with respect to $\mathbf{N}_s$, evaluating the BSDF with the shading normal "reflects" light through an opaque surface. Returning zero whenever a direction lies on different sides with respect to the two normals stops the leak, but when the test fails for $\omega_o$ the BSDF is zero for every $\omega_i$, and the surface shows black patches. Veach's fix extends the BRDF and BTDF to all pairs of directions and chooses between them by the *geometric* side of $\omega_i$ and $\omega_o$, evaluating the chosen one with the shading normal; a diffuse surface is then $f_r = K_d$ and $f_t = 0$ everywhere, which has neither problem.
- **Energy is not conserved.** For the modified BSDF, $\int f_s\, \mathrm{d}\sigma^{\perp}(\omega_o)$ contains the factor $\lvert\omega_i \cdot \mathbf{N}_s\rvert / \lvert\omega_i \cdot \mathbf{N}_g\rvert$, which is arbitrarily large when $\omega_i$ is nearly perpendicular to $\mathbf{N}_g$ but not to $\mathbf{N}_s$. Veach's illustration: a ridged surface whose shading normals all point at the light receives the same power as a flat one but, being larger and equally bright everywhere, reflects more than it receives. Particle weights can therefore grow during scattering.
- **Brightness discontinuities.** Without the adjoint, particle tracing renders a mesh with a continuous shading normal with visible discontinuities at polygon edges, because the particle density on each polygon depends on its geometric normal; weighting particles with the adjoint exactly compensates.

Using $\lvert\omega_i \cdot \mathbf{N}_g\rvert$ instead in the shading formula keeps the BSDF symmetric, but it defeats the purpose: a diffuse surface then looks the same for every shading normal, and a mirror's reflectivity changes with the normal. Veach's conclusion is to keep shading normals, accept that they make the BSDF non-symmetric, and use the adjoint.


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


#### Where the Equation Comes From

The rendering equation is three statements from the previous sections put together (Veach, Section 3.7.2; PBRT, Section 13.1).

1. **Energy balance.** The radiance leaving a surface is what it emits plus what it scatters: ${\class{term-light}{L_o}} = {\class{term-light}{L_e}} + {\class{term-light}{L_{o,s}}}$. The emitted radiance ${\class{term-light}{L_e}}$ is part of the scene description and represents all the light sources.
2. **Scattering.** The scattered part is given by the [scattering equation](#the-bsdf) $\eqref{eq:scattering-equation}$: ${\class{term-light}{L_{o,s}(x, \omega_o)}} = \int {\class{term-light}{L_i(x, \omega_i)}}\, {\class{term-bsdf}{f_s(x, \omega_i \to \omega_o)}}\, \mathrm{d}\sigma^{\perp}(\omega_i)$.
3. **Propagation.** Radiance is constant along a ray in empty space, so the light arriving at $x$ from direction $\omega_i$ is the light leaving the first surface visible in that direction:

$$
\begin{equation}
{\class{term-light}{L_i(x, \omega_i)}} = {\class{term-light}{L_o(x_{\mathcal{M}}(x, \omega_i), -\omega_i)}},
\label{eq:ray-casting}
\end{equation}
$$

where $x_{\mathcal{M}}(x, \omega)$ is the **ray-casting function**, which returns the first point of $\mathcal{M}$ visible from $x$ in direction $\omega$.

Substituting 2 and 3 into 1 removes ${\class{term-light}{L_i}}$ and leaves a single unknown, the exitant radiance, on both sides:

$$
\begin{equation}
{\class{term-light}{L(x, \omega_o)}} = {\class{term-light}{L_e(x, \omega_o)}} + \int_{\mathbb{S}^2} {\class{term-light}{L(x_{\mathcal{M}}(x, \omega_i), -\omega_i)}}\; {\class{term-bsdf}{f_s(x, \omega_i \to \omega_o)}}\; \mathrm{d}\sigma^{\perp}(\omega_i).
\label{eq:lte}
\end{equation}
$$

Veach calls this the **light transport equation**. It is the same equation as above, written over the whole sphere with a BSDF so that it covers transmission too; for an opaque surface the BSDF is zero below the surface and the domain reduces to the hemisphere $\Omega$. The unknown appears both outside and inside the integral. That is the precise sense in which the equation is recursive, and it is why it is solved by repeated substitution (the [Neumann series](#neumann-series-expansion) below) and not by a single integration.

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

### The Measurement Equation

The rendering equation describes radiance everywhere in the scene, but a renderer does not output a radiance function. It outputs a finite set of numbers $I_1, \ldots, I_M$, one per pixel. Each is modelled as the response of a small sensor to the radiance falling on it (Veach, Sections 3.7.1 and 4.5):

$$
\begin{equation}
I_j = \int_{\mathcal{M} \times \mathbb{S}^2} W_e^{(j)}(x, \omega)\; {\class{term-light}{L_i(x, \omega)}}\; \mathrm{d}A(x)\, \mathrm{d}\sigma^{\perp}_x(\omega).
\label{eq:measurement}
\end{equation}
$$

This is the **measurement equation**. The integral is over the sensor's surface and over the directions from which light reaches it, with the throughput measure $\mathrm{d}A\, \mathrm{d}\sigma^{\perp}$. The function $W_e^{(j)}$ is the **responsivity** of sensor $j$: the response per unit of power arriving at $x$ from direction $\omega$. For a pixel it is non-zero only for the rays that pass through the lens and land on that pixel, and it contains the pixel's reconstruction filter.

In graphics $W_e$ is also called the **emitted importance**, because it can be treated exactly like an emitted quantity: where a light emits radiance ${\class{term-light}{L_e}}$ into the scene, a sensor emits importance $W_e$, and importance scatters and propagates by the same rules. Importance says how much the light arriving along a given ray matters to the measurement. Tracing paths from the camera, which is what a path tracer does, is transporting importance; tracing them from the lights is transporting radiance. The [operator form](#operator-form-of-the-rendering-equation) below makes this duality exact.

So the full problem a renderer solves is the pair: the light transport equation $\eqref{eq:lte}$ for ${\class{term-light}{L}}$, and the measurement equation $\eqref{eq:measurement}$ for each pixel. The [path integral formulation](#path-integral-formulation-of-light-transport) merges the two into one integral.

### Alternate Formulations of the Rendering Equation

The rendering equation above integrates over directions, but that is a choice, not a necessity. The same physical statement can be written as an integral over surface points, as an operator equation, or as an integral over whole light paths. These are not academic variations: **each one suggests a different thing to importance sample**, and the methods in the second half of these notes split along exactly these lines, with some learning a distribution over directions and one learning a distribution over paths.

The following formulations can be found in [Eric Veach's PhD thesis](https://graphics.stanford.edu/papers/veach_thesis/thesis.pdf) [[12]](#ref-12), or the [TU Wien Rendering Course](https://www.cg.tuwien.ac.at/courses/Rendering/VU/2021S) [[14]](#ref-14).

#### Classic Surface Rendering Equation
First, this is the standard rendering equation used in most local path guiding papers. It picks a direction of contribution and integrates over all the direction of contribution (upper hemisphere / sphere). For a given direction, the radiance already includes all visible surfaces along that ray in that direction, so no explicit visibility term is needed.

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

**Three-point notation.** Once directions have been replaced by points, the directional arguments can be dropped altogether (Veach, Section 8.1). Write $L(x \to x')$ for the radiance leaving $x$ towards $x'$, and $f_s(x \to x' \to x'')$ for the BSDF at $x'$ for light arriving from $x$ and leaving towards $x''$; the arrows follow the flow of light ({{< figref "fig-three-point" >}}). The equation above becomes

$$
\begin{equation}
{\class{term-light}{L(x' \to x'')}} = {\class{term-light}{L_e(x' \to x'')}} + \int_{\mathcal{M}} {\class{term-light}{L(x \to x')}}\; {\class{term-bsdf}{f_s(x \to x' \to x'')}}\; G(x \leftrightarrow x')\; \mathrm{d}A(x),
\label{eq:three-point}
\end{equation}
$$

where Veach folds the visibility into the geometry term,

$$
\begin{equation}
G(x \leftrightarrow x') = V(x \leftrightarrow x')\, \frac{\lvert\cos\theta_o\rvert\, \lvert\cos\theta'_i\rvert}{\lVert x - x' \rVert^2}.
\label{eq:G}
\end{equation}
$$

$G$ is symmetric in its two arguments, and it is exactly the change of measure from projected solid angle to area:

$$
\begin{equation}
\mathrm{d}\sigma^{\perp}_{x'}(\omega_i) = G(x \leftrightarrow x')\, \mathrm{d}A(x).
\label{eq:dsigma-perp-G}
\end{equation}
$$

These notes write $G$ and $V$ as separate factors where it helps to see them apart, and as one symbol $G(x \leftrightarrow x')$ where it does not. Applying the same change of variables to the [measurement equation](#the-measurement-equation) $\eqref{eq:measurement}$ gives

$$
\begin{equation}
I_j = \int_{\mathcal{M} \times \mathcal{M}} W_e^{(j)}(x \to x')\; {\class{term-light}{L(x \to x')}}\; G(x \leftrightarrow x')\; \mathrm{d}A(x)\, \mathrm{d}A(x'),
\label{eq:measurement-three-point}
\end{equation}
$$

where $x'$ is on the sensor and $W_e^{(j)}(x \to x')$ is the importance emitted from $x'$ towards $x$.

{{< figure src="/images/path_tracing/paths/three_point.svg" id="fig-three-point" caption="Geometry of the three-point form. Light leaves $x$, is scattered at $x'$ and continues to $x''$. The geometry term $G(x \leftrightarrow x')$ contains the cosines of $\theta_o$ and $\theta'_i$, the squared distance and the visibility between the two points. (After Veach [[12]](#ref-12), Fig. 8.1)" width="75%" >}}

#### Operator Form of the Rendering Equation

The operator form hides the integrals behind linear operators that act on whole radiance functions. It is the form used to prove that a solution exists, to state what "one bounce" means precisely, and to show that tracing from the camera and tracing from the lights compute the same number. This section follows Veach, Chapter 4.

**Two operators.** Physically, light transport alternates between two steps: *scattering* at a surface and *propagation* in a straight line to the next surface. Each is a linear operator on functions of a ray $(x, \omega)$.

The **local scattering operator** $\mathcal{K}$ turns incident radiance into exitant radiance by applying the scattering equation at every point:

$$
\begin{equation}
(\mathcal{K}h)(x, \omega_o) = \int_{\mathbb{S}^2} {\class{term-bsdf}{f_s(x, \omega_i \to \omega_o)}}\; h(x, \omega_i)\; \mathrm{d}\sigma^{\perp}_x(\omega_i).
\label{eq:op-K}
\end{equation}
$$

The **propagation operator** $\mathcal{G}$ turns exitant radiance into incident radiance by looking up what the ray-casting function sees:

$$
\begin{equation}
(\mathcal{G}h)(x, \omega_i) =
\begin{cases}
h(x_{\mathcal{M}}(x, \omega_i), -\omega_i) & \text{if the ray hits a surface,} \\
0 & \text{otherwise.}
\end{cases}
\label{eq:op-G}
\end{equation}
$$

So ${\class{term-light}{L_i}} = \mathcal{G}{\class{term-light}{L_o}}$ and ${\class{term-light}{L_o}} = \mathcal{K}{\class{term-light}{L_i}}$ for the scattered part. (The propagation operator $\mathcal{G}$ is not the geometry term $G$ of the previous section. The script letter is Veach's.)

**The light transport operator.** One propagation followed by one scattering is one bounce:

$$
\mathcal{T} = \mathcal{K}\mathcal{G}.
$$

$\mathcal{T}$ maps an exitant radiance function to the exitant radiance after one more scattering step. Written out, $(\mathcal{T}L)(x, \omega_o)$ is the integral in $\eqref{eq:lte}$. The equilibrium condition, emitted plus scattered, is then

$$
\begin{equation}
{\class{term-light}{L}} = {\class{term-light}{L_e}} + \mathcal{T} {\class{term-light}{L}}.
\label{eq:op-lte}
\end{equation}
$$

This form emphasizes that global illumination is a fixed-point problem: the solution is the radiance function that one more bounce, plus emission, leaves unchanged.

**Solution operator.** Rearranging $\eqref{eq:op-lte}$,

$$
(\mathcal{I} - \mathcal{T})\,{\class{term-light}{L}} = {\class{term-light}{L_e}}
\quad\Longrightarrow\quad
{\class{term-light}{L}} = (\mathcal{I} - \mathcal{T})^{-1} {\class{term-light}{L_e}} = \mathcal{S}\,{\class{term-light}{L_e}},
$$

where $\mathcal{I}$ is the identity and $\mathcal{S} = (\mathcal{I} - \mathcal{T})^{-1}$ is the **solution operator**. It maps the emission of a scene directly to its equilibrium radiance.

#### Neumann-Series Expansion

The inverse exists when $\lVert\mathcal{T}\rVert < 1$, where $\lVert\mathcal{T}\rVert = \sup_{\lVert f\rVert \le 1} \lVert\mathcal{T}f\rVert$ is the operator norm, and it is then given by the **Neumann series**:

$$
\begin{equation}
\mathcal{S} = (\mathcal{I} - \mathcal{T})^{-1} = \sum_{i=0}^{\infty} \mathcal{T}^i = \mathcal{I} + \mathcal{T} + \mathcal{T}^2 + \cdots
\label{eq:neumann}
\end{equation}
$$

Applied to the emission,

$$
{\class{term-light}{L}} = {\class{term-light}{L_e}} + \mathcal{T}{\class{term-light}{L_e}} + \mathcal{T}^2{\class{term-light}{L_e}} + \mathcal{T}^3{\class{term-light}{L_e}} + \cdots
$$

which expresses the radiance as emitted light, plus light scattered once, twice, and so on. This is the operator version of the [expansion shown earlier](#rendering-equation-visualization). A path tracer estimates this sum one term per bounce, and the `max_depth` parameter truncates it.

**When does it converge?** The norm condition is a statement about energy. Veach summarizes the cases:

*   For reflective surfaces, Arvo showed that $\lVert\mathcal{G}\rVert \le 1$, and that $\lVert\mathcal{K}\rVert \le 1$ when every BRDF is energy-conserving and symmetric. With the extra assumption that no surface is perfectly reflective, $\lVert\mathcal{K}\rVert < 1$ and so $\lVert\mathcal{T}\rVert \le \lVert\mathcal{K}\rVert\,\lVert\mathcal{G}\rVert < 1$.
*   With refraction, $\lVert\mathcal{K}\rVert < 1$ no longer holds, because radiance can increase when light is refracted. The weaker condition $\lVert\mathcal{T}^k\rVert < 1$ for some $k \ge 1$ is still enough for the series to converge, and Veach shows it holds for any physically valid scene. It allows perfect mirrors, as long as light cannot bounce between them forever without some of it escaping to a more absorptive part of the scene.

**Worked example: the furnace.** PBRT gives a case that can be solved by hand. Take the inside of a sphere whose surface is Lambertian with BRDF $f_r = c$ and emits the same radiance ${\class{term-light}{L_e}}$ in every direction from every point. By symmetry the radiance is the same constant everywhere, so the rendering equation reduces to a scalar equation, with albedo $\rho = c\pi$:

$$
\begin{equation}
L = L_e + c\,\pi\, L = L_e + \rho L
\quad\Longrightarrow\quad
L = \frac{L_e}{1 - \rho} = L_e\left(1 + \rho + \rho^2 + \cdots\right).
\label{eq:furnace}
\end{equation}
$$

Here $\mathcal{T}$ is multiplication by $\rho$, the Neumann series is a geometric series, and it converges because $\rho < 1$. With $\rho = 0.5$ the surface appears twice as bright as its emission; the first three terms (direct view, one bounce, two bounces) give $1.75\,L_e$ of the final $2\,L_e$.

**Sensors, adjoints and importance.** Functions of a ray have a natural inner product, $\langle f, g\rangle = \int f(x,\omega)\, g(x,\omega)\, \mathrm{d}A(x)\, \mathrm{d}\sigma^{\perp}_x(\omega)$, and the [measurement equation](#the-measurement-equation) is one: $I = \langle W_e, {\class{term-light}{L_i}}\rangle$. Using ${\class{term-light}{L_i}} = \mathcal{G}{\class{term-light}{L}}$ and ${\class{term-light}{L}} = \mathcal{S}{\class{term-light}{L_e}}$,

$$
\begin{equation}
I = \langle W_e,\; \mathcal{G}\mathcal{S}\,{\class{term-light}{L_e}} \rangle .
\label{eq:op-measure}
\end{equation}
$$

The **adjoint** $\mathcal{H}^*$ of an operator is defined by $\langle \mathcal{H}^* f, g\rangle = \langle f, \mathcal{H}g\rangle$ for all $f, g$, the analogue of the transpose of a matrix. Veach shows that $\mathcal{G}$ is self-adjoint, and that $\mathcal{K}^*$ is $\mathcal{K}$ with the adjoint BSDF $f_s^*(\omega_i \to \omega_o) = f_s(\omega_o \to \omega_i)$ in place of $f_s$. So when every BSDF is symmetric, $\mathcal{K}$ is self-adjoint too, $\mathcal{G}\mathcal{S}$ is self-adjoint, and

$$
\begin{equation}
I = \langle W_e,\; \mathcal{G}\mathcal{S}\,{\class{term-light}{L_e}} \rangle = \langle \mathcal{G}\mathcal{S}\,W_e,\; {\class{term-light}{L_e}} \rangle .
\label{eq:op-duality}
\end{equation}
$$

The two sides differ only in that $W_e$ and ${\class{term-light}{L_e}}$ have changed places. The left side transports light from the sources and measures it at the sensor. The right side transports importance from the sensor, with equilibrium importance $W = \mathcal{S}W_e$ satisfying $W = W_e + \mathcal{T}W$, and measures it at the light sources. Any algorithm for one works for the other, which is the formal justification for tracing paths from the camera and collecting emission where they land. With a non-symmetric BSDF (refraction, shading normals) the two transport operators differ, $\mathcal{T}_L = \mathcal{K}\mathcal{G}$ for light and $\mathcal{T}_W = \mathcal{K}^*\mathcal{G}$ for importance, and an implementation has to use the adjoint BSDF on one of the two sides.

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

The forms so far are all *equations* for an unknown function. The path integral formulation (Veach, Chapter 8) removes the unknown and writes each pixel as a plain integral,

$$
\begin{equation}
I_j = \int_{\mathcal{P}} f_j(\bar{x})\; \mathrm{d}\mu(\bar{x}),
\label{eq:path-integral}
\end{equation}
$$

over the set $\mathcal{P}$ of all light transport paths. Once the problem is an integral, every general-purpose integration technique applies to it directly: importance sampling, multiple importance sampling, and the learned densities of the second half of these notes.

**Derivation.** Start from the measurement equation in three-point form $\eqref{eq:measurement-three-point}$, which contains the unknown ${\class{term-light}{L}}$, and substitute the three-point transport equation $\eqref{eq:three-point}$ for it. The emitted term gives an integral with no unknown; the scattered term contains ${\class{term-light}{L}}$ again, one vertex further back, so substitute again, and keep going. This is the Neumann series once more, with each term now written as an integral over the positions of the path vertices:

$$
\begin{equation}
\begin{aligned}
I_j = \sum_{k=1}^{\infty} \int_{\mathcal{M}^{k+1}}
&{\class{term-light}{L_e(x_0 \to x_1)}}\, G(x_0 \leftrightarrow x_1)
\prod_{i=1}^{k-1} {\class{term-bsdf}{f_s(x_{i-1} \to x_i \to x_{i+1})}}\, G(x_i \leftrightarrow x_{i+1}) \\
&\times W_e^{(j)}(x_{k-1} \to x_k)\; \mathrm{d}A(x_0) \cdots \mathrm{d}A(x_k).
\end{aligned}
\label{eq:path-expansion}
\end{equation}
$$

The three parts of $\eqref{eq:path-integral}$ are read off from this:

- **Domain.** A path of length $k$ is a sequence of $k+1$ surface points, $\bar{x} = x_0 x_1 \cdots x_k$, with $x_0$ on a light source and $x_k$ on the sensor. $\mathcal{P}_k$ is the set of all paths of length $k$, and the **path space** is the union over all finite lengths,
  $$
  \mathcal{P} = \bigcup_{k=1}^{\infty} \mathcal{P}_k .
  $$
  Vertices lie on surfaces (volumes are excluded in these notes).
- **Measure.** The **area-product measure** on paths of length $k$ is $\mathrm{d}\mu_k(x_0 \cdots x_k) = \mathrm{d}A(x_0) \cdots \mathrm{d}A(x_k)$, and the measure of a set of paths of mixed lengths is the sum of the measures of its paths of each length. This is what lets the sum over $k$ in $\eqref{eq:path-expansion}$ be absorbed into a single integral sign.
- **Integrand.** The **measurement contribution function** $f_j$ is the integrand of $\eqref{eq:path-expansion}$ for the given path length ({{< figref "fig-path-contribution" >}}):

$$
\begin{equation}
\begin{aligned}
f_j(\bar{x}) =
{}&{\class{term-light}{L_e(x_0 \to x_1)}}\;
G(x_0 \leftrightarrow x_1) \\
&\times \left[\prod_{i=1}^{k-1}
{\class{term-bsdf}{f_s(x_{i-1} \to x_i \to x_{i+1})}}\;
G(x_i \leftrightarrow x_{i+1})\right]
W_e^{(j)}(x_{k-1} \to x_k),
\end{aligned}
\label{eq:contribution}
\end{equation}
$$

with the visibility $V$ included in each $G$ as in $\eqref{eq:G}$. There is one emission factor, one importance factor, a BSDF at every interior vertex and a geometry term on every edge.

{{< figure src="/images/path_tracing/paths/path_contribution.svg" id="fig-path-contribution" caption="The measurement contribution function is a product of one factor per vertex and one per edge, shown for a path of length 3. (After Veach [[12]](#ref-12), Fig. 8.2)" width="85%" >}}

Veach lists what this buys over the integral-equation forms:

1. Each measurement is an integral, so general-purpose integration methods apply.
2. One expression defines each measurement. There is no recursion, no adjoint equation and no choice between transporting light or importance.
3. Paths can be built in any way at all: from the camera, from the lights, from both ends, or from a vertex in the middle. An integral equation, sampled recursively, only ever suggests building a path from one end.
4. It gives a single framework for computing the probability density of a path, so the densities with which *different* techniques generate the *same* path can be compared. Multiple importance sampling needs exactly this.

{{< 
figure src="/images/path_tracing/paths/paths.png"
id="fig-paths"
caption="Sample paths from path space contributing to the final image"
width="80%" 
>}}

**Visualizing different paths.** 
We can see the interaction of light with Specular (S), Diffuse (D) objects. We can write all of the types of interaction of lights as regular expression $L(D | S)^*E$

<iframe src="/interactive/light_paths.html" title="light paths" width="100%" height="535" frameborder="0"></iframe>

**Estimating the path integral.** The Monte Carlo estimate of $\eqref{eq:path-integral}$ has the same form as for any integral (the estimator is derived [below](#the-monte-carlo-estimator)): sample a random path $\bar{X}$ with density $p$ and compute

$$
\begin{equation}
I_j \approx \frac{f_j(\bar{X})}{p(\bar{X})},
\label{eq:path-estimator}
\end{equation}
$$

which is unbiased provided $p$ is a density with respect to the same area-product measure $\mu$ that the integral uses. Every unbiased path-sampling algorithm (path tracing, light tracing, bidirectional path tracing) is this one estimator with a different $p$.

**The density of a path.** A density with respect to $\mu$ is a product of one area density per vertex,

$$
\begin{equation}
p(\bar{x}) = \prod_{i=0}^{k} p_A(x_i),
\label{eq:path-pdf}
\end{equation}
$$

where $p_A(x_i)$ is the probability per unit area with which vertex $x_i$ was generated, given the vertices generated before it. Veach's **local path sampling** model has three ways to generate a vertex or an edge:

1. Sample a vertex from a distribution over surfaces chosen in advance, for example a point on a light source or on the lens. Its area density $p_A$ is known directly.
2. Sample a direction at an existing vertex $x$, for example from the BSDF, and cast a ray to find the new vertex $x'$.
3. Connect two existing vertices by testing the visibility between them. This creates an edge and no new vertex.

In case 2 the density is known per unit solid angle, $p_\sigma(\omega)$, not per unit area. The two are related by the change of variables $\eqref{eq:rad-dsigma-dA}$:

$$
\begin{equation}
p_A(x') = p_\sigma(\omega)\, \frac{\mathrm{d}\sigma(\omega)}{\mathrm{d}A(x')} = p_\sigma(\omega)\, \frac{\lvert\cos\theta'\rvert}{\lVert x - x' \rVert^2},
\label{eq:pdf-sigma-to-A}
\end{equation}
$$

where $\theta'$ is the angle at the *new* vertex $x'$. If the directional density is instead given per unit *projected* solid angle, $p_{\sigma^\perp}(\omega) = p_\sigma(\omega)/\lvert\cos\theta\rvert$ with $\theta$ the angle at $x$, the conversion factor becomes the symmetric geometry term:

$$
\begin{equation}
p_A(x') = p_{\sigma^\perp}(\omega)\; G(x \leftrightarrow x').
\label{eq:pdf-sigmaperp-to-A}
\end{equation}
$$

These two conversions are used constantly. They are why the geometry terms cancel in a path tracer ([derived below](#from-the-path-integral-to-the-path-tracer)), and they are what puts a light-sampling density and a BSDF-sampling density on the same footing in MIS.

#### Limits of Local Path Sampling

Path sampling has limits, and Veach makes them precise (Section 8.3). If point light sources and perfect mirrors are allowed, some kinds of transport path cannot be sampled at all, and the images computed by path sampling algorithms simply miss their contribution. His example: a point light reflects off a mirror and creates caustics on a diffuse surface. Bidirectional path tracing can render these caustics when they are seen directly, but if they are seen indirectly, through a second mirror, they are missing from the image.

The analysis covers **local path sampling** algorithms, the [three mechanisms](#path-integral-formulation-of-light-transport) above (sample a vertex from a fixed distribution, sample a direction and cast a ray, connect two vertices). For these, problems are caused not only by mirrors and point lights but also by refraction, perfectly anisotropic surfaces, parallel light sources, pinhole lenses and orthographic projections.

**Heckbert's notation for general materials.** Heckbert's regular expressions $L(S|D)^*E$, as in the widget above, describe a path by its scattering events: $L$ is the vertex on the light, $E$ the eye, and each scattering vertex is $S$ or $D$. Veach defines the two letters for any material through the BSDF. A scattering event at $\mathbf{x}_i$ is $D$ if the BSDF there is finite,

$$
{\class{term-bsdf}{f_s(\mathbf{x}_{i-1} \to \mathbf{x}_i \to \mathbf{x}_{i+1})}} < \infty ,
$$

and $S$ otherwise. $S$ therefore includes not only pure specular reflection and refraction, which scatter light into a zero-dimensional set of directions, but also pure anisotropic scattering into a one-dimensional set (like idealized brushed aluminium). The letters describe the scattering *event*, not the surface, which may be a mixture of both.

**Full-path regular expressions.** Heckbert's notation says nothing about the light and the sensor, yet some sampling strategies fail exactly because of them ("pure" path tracing never hits a point light). Veach adds two letters at each end. A light is written $LXY$: the first letter is $D$ for a source of finite area and $S$ for a source of zero area (a point or a line), the second is $D$ if it emits over a finite solid angle and $S$ if it emits into a set of directions of measure zero. A sensor is written $YXE$: the first letter is its directional sensitivity, the second its area.

| Expression | Example (Veach, Table 8.1) |
|---|---|
| $LDD$ | a diffusely emitting sphere |
| $LDS$ | sunlight through a window, with the window modelled as the light source |
| $LSD$ | a point spotlight |
| $LSS$ | a laser beam |
| $DDE$ | a finite-aperture lens |
| $SDE$ | an orthographic projection lens |
| $DSE$ | a pinhole lens |
| $SSE$ | an idealized spot meter, measuring radiance along a single ray |

A whole path is then, for example, $LDD\,S^*\,DDE$: an area light, zero or more specular bounces, a finite-aperture lens.

Formally, the emitted radiance is split into a spatial and a directional factor,

$$
\begin{equation}
L_e^{(0)}(\mathbf{x}) = \int_{\mathbb{S}^2} {\class{term-light}{L_e(\mathbf{x}, \omega)}}\, \mathrm{d}\sigma^{\perp}(\omega),
\qquad
L_e^{(1)}(\mathbf{x}, \omega) = \frac{{\class{term-light}{L_e(\mathbf{x}, \omega)}}}{L_e^{(0)}(\mathbf{x})},
\label{eq:veach-le-split}
\end{equation}
$$

the radiant exitance at a point of the light and the directional distribution of its emission ($L_e^{(1)}$ integrates to one over $\mathrm{d}\sigma^{\perp}$, so it is the density of the emitted direction given the point). In $LXY$, $X = D$ if $L_e^{(0)}(\mathbf{x}_0) < \infty$ and $Y = D$ if $L_e^{(1)}(\mathbf{x}_0 \to \mathbf{x}_1) < \infty$, and $S$ otherwise; the sensor letters are defined the same way from $W_e$.

To give every letter the same meaning, Veach adds an imaginary vertex at each end of the path, $\Psi_L\, \mathbf{x}_0 \cdots \mathbf{x}_k\, \Psi_W$. All light is emitted at $\Psi_L$ and all measurements are made at $\Psi_W$; the spatial and directional parts of emission become "BSDFs" at $\Psi_L$ and at $\mathbf{x}_0$ (for example $f_s(\Psi_L \to \mathbf{x} \to \mathbf{x}') = L_e^{(1)}(\mathbf{x} \to \mathbf{x}')$), and likewise at the sensor end. Then every $D$ means that the BSDF at that vertex is finite, so energy spreads over a two-dimensional set of adjacent vertices, and every $S$ means it spreads over a zero- or one-dimensional set.

**Which paths can be sampled.** The result is that a local sampling algorithm can only generate paths containing the substring $DD$.

> **Lemma (Veach 8.1).** Let $\bar{x}$ be a path generated by a local sampling algorithm with non-zero measurement contribution. If $\mathbf{x}_i$ is a specular vertex, then one of its neighbours $\mathbf{x}_{i-1}$ or $\mathbf{x}_{i+1}$ was generated by sampling the BSDF at $\mathbf{x}_i$.

*Proof.* Fix $\mathbf{x}_i$ and $\mathbf{x}_{i-1}$. The positions of $\mathbf{x}_{i+1}$ for which $f_s(\mathbf{x}_{i-1} \to \mathbf{x}_i \to \mathbf{x}_{i+1}) = \infty$ form a set of area measure zero, since they subtend zero solid angle at $\mathbf{x}_i$; the same holds with the roles of $\mathbf{x}_{i-1}$ and $\mathbf{x}_{i+1}$ exchanged. So if both neighbours were generated independently of the BSDF at $\mathbf{x}_i$, the vertex would have type $D$ with probability one. If it has type $S$, one neighbour must have come from sampling its BSDF, the only other option local sampling allows. $\blacksquare$

The same argument extends to a run of specular vertices: in a subpath of the form $DS^+D$, one of the two $D$ endpoints must have been generated by sampling the BSDF of the adjacent $S$ vertex (Corollary 8.2).

> **Theorem (Veach 8.3).** A path with non-zero contribution generated by a local sampling algorithm necessarily has the form
> $$L\,(S|D)^*\,D\,D\,(S|D)^*\,E ,$$
> that is, it contains the substring $DD$. Conversely, every path of this form can be generated by some local sampling strategy.

*Proof.* A path without the substring $DD$ has the form $L\,(D|\epsilon)\,S^+\,(DS^+)^*\,(D|\epsilon)\,E$. It has $n$ specular runs $S^+$ but only $n-1$ $D$ vertices between them (the letters next to $L$ and $E$ do not count, since they are the fixed imaginary vertices $\Psi_L$ and $\Psi_W$, not sampled). By the corollary, one of these $D$ vertices would have to be generated by sampling the BSDFs of *both* neighbouring specular runs, which is impossible: there are not enough $D$ vertices. Conversely, if the path has an edge $\mathbf{x}_i\mathbf{x}_{i+1}$ of type $DD$, generate $\mathbf{x}_0 \cdots \mathbf{x}_i$ starting from a light, $\mathbf{x}_{i+1} \cdots \mathbf{x}_k$ starting from the lens, and connect them across that edge. $\blacksquare$

Specific algorithms are more restrictive. Ordinary path tracing generates every vertex from the lens except $\mathbf{x}_0$, which is chosen directly on a light, so it can only sample paths of the form $L\,(S|D)\,D\,D\,(S|D)^+\,E$.

| Expression | Cannot be sampled locally (Veach, Table 8.2) |
|---|---|
| $LSDSDSE$ | a point light reflected in a mirror, viewed with a pinhole lens |
| $LDSSDSDE$ | caustics from a parallel light source, viewed with an orthographic lens |
| $LSDSDSDSE$ | caustics from a point light, viewed indirectly through a mirror with a pinhole lens |

Veach gives two reasons this matters. First, point lights and perfect mirrors are common in rendering systems even though they are idealizations that do not exist physically, and scenes that use them will be missing some lighting. Second, even without them (for instance with every path starting $LDD$), path sampling should be expected to perform badly as a scene *approaches* such a configuration: the difficult paths are no longer missing, but they are sampled with very high variance and show up as noise. The path-guiding course notes [[23]](#ref-23) point out that directional guiding lets a plain path tracer render specular-diffuse-specular transport, such as caustics seen through the refractive surface of an eye, with one crucial assumption: that the light sources have a reasonable size, so that a path started at the camera can hit them at all.

**Getting around the restriction.** The simplest fix restricts the scene: allowing only area lights (so every path starts with $LDD$), only finite-aperture lenses (every path ends with $DDE$), or no perfectly specular surfaces each guarantees that path sampling is unbiased, though variance can still be high near the limiting cases. The alternative is non-local sampling. Veach splits a path into **chains** at its $D$ vertices (and at $\Psi_L$, $\Psi_W$); a **connector** is a method that, given two $D$ vertices, generates the specular chain between them. Testing visibility is the simplest connector (a chain $DD$). For a planar mirror, computing the point on the mirror that reflects one vertex to the other gives a chain $DSD$. In general, light travels between two points along specular paths of stationary optical length (Fermat paths), which can be found by solving an optimization problem. Veach considers the general case unlikely to be practical, but useful for planar mirrors, short sequences of them, or simple curved surfaces.

### Probability Foundations

None of the formulations above has an analytic solution for a general scene. The rendering equation is an integral equation whose integrand contains the unknown itself, over a domain with arbitrary geometry and visibility. What we can do is *estimate* it, and the tool for that is Monte Carlo integration.

Monte Carlo integration is based on randomization, so this section first reviews the necessary ideas from probability. The definitions follow Pishro-Nik [[11]](#ref-11) and PBRT, Section 2.1 [[2]](#ref-2); a more measure-theoretic treatment of Monte Carlo estimators is given by Owen [[13]](#ref-13).

**Random variables.** A **random variable** $X$ is a function that assigns a real number to every outcome of a random experiment, $X : S \to \mathbb{R}$, where $S$ is the sample space of the experiment. A random variable is **discrete** if it takes values in a finite or countable set $\lbrace x_1, x_2, \ldots \rbrace$, and **continuous** if it takes values in a continuum, such as a direction on the hemisphere.

**Probability mass function.** The distribution of a discrete random variable is described by its **probability mass function** (PMF),

$$
p_X(x_k) = P(X = x_k), \qquad k = 1, 2, \ldots
$$

Each value lies in $[0, 1]$, the values sum to one, and the probability of a set of values is the sum of their masses, $P(X \in A) = \sum_{x \in A} p_X(x)$. Choosing one of several light sources, or one lobe of a BSDF, is sampling a PMF.

**Cumulative distribution function.** A PMF cannot be defined for a continuous variable, since each single value then has probability zero. The **cumulative distribution function** (CDF) works for every kind of random variable, discrete, continuous or mixed:

$$
F_X(x) = P(X \le x) \quad \text{for all } x \in \mathbb{R},
\qquad
P(a < X \le b) = F_X(b) - F_X(a) .
$$

**Probability density function.** For a continuous random variable, the **probability density function** (PDF) $p_X$ is the non-negative function whose integral over an interval is the probability of landing in it,

$$
P(a \le X \le b) = \int_a^b p_X(x)\, \mathrm{d}x,
\qquad
p_X(x) \ge 0, \qquad \int_{-\infty}^{\infty} p_X(x)\, \mathrm{d}x = 1 .
$$

It is the derivative of the CDF, $p_X = \mathrm{d}F_X/\mathrm{d}x$. Unlike a PMF, a density is not itself a probability: only its integral over a region is, and its value at a point can exceed one. The subscript is dropped from here on, and densities are written $p(x)$; the letter $f$ is kept for the function being integrated.

**Expected value.** The **expected value**, or mean, of a continuous random variable is

$$
\mathbb{E}[X] = \int_{-\infty}^{\infty} x\, p(x)\, \mathrm{d}x ,
\qquad
\mathbb{E}[g(X)] = \int_{-\infty}^{\infty} g(x)\, p(x)\, \mathrm{d}x
$$

for a function $g$ of it. It is the value that the average of many independent draws approaches. Expectation is linear: $\mathbb{E}[aX + bY] = a\,\mathbb{E}[X] + b\,\mathbb{E}[Y]$ for any random variables $X$, $Y$ and constants $a$, $b$.

**Variance.** The **variance** is the expected squared deviation from the mean, with $\mu = \mathbb{E}[X]$:

$$
\mathbb{V}[X] = \mathbb{E}\big[(X - \mu)^2\big] = \int_{-\infty}^{\infty} (x - \mu)^2\, p(x)\, \mathrm{d}x = \mathbb{E}[X^2] - \mathbb{E}[X]^2 .
$$

It measures the spread of the distribution around its mean. Two of its properties are used repeatedly below: $\mathbb{V}[cX] = c^2\, \mathbb{V}[X]$ for a constant $c$, and the variance of a sum of *independent* random variables is the sum of their variances.

#### Inverse Transform Sampling

The definitions above describe a distribution; inverse transform sampling **draws** from one. Every sampling routine in a renderer (a cosine-weighted direction, a point on an area light, the choice of which technique to use) is this single mechanism applied to uniform random numbers.

Let $U \sim \mathrm{Unif}[0,1]$ and let $X$ be the target random variable with CDF $F_X$. Assume for now that $F_X$ is continuous and strictly increasing, so that its inverse $F_X^{-1}$ is well defined. The goal is a strictly increasing transformation

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

One consequence of $\eqref{eq:inverse-cdf}$ carries into the rest of these notes: a sampler is a **map from the unit hypercube to the domain of interest**. The uniform numbers are the raw material and the map is the design choice. Several dimensions are handled one at a time, as shown in the next section.

<iframe src="/interactive/inverse_transform_sampling.html" title="inverse transform sampling" width="100%" height="350" frameborder="0"></iframe>

#### Transforming Between Distributions

Inversion draws a sample; the next question is what density a sample has after it has been pushed through a function. This is needed whenever a sampler works in one set of coordinates and the estimator needs the density in another (PBRT, Section 2.4).

If $X$ has density $p_X$ and $Y = T(X)$ for a bijection $T$, then

$$
\begin{equation}
p_Y(y) = \frac{p_X(x)}{\lvert J_T(x) \rvert},
\label{eq:pdf-transform}
\end{equation}
$$

where $\lvert J_T \rvert$ is the absolute value of the determinant of the Jacobian of $T$ (in one dimension, $\lvert \mathrm{d}y/\mathrm{d}x \rvert$). Where $T$ stretches space the density thins out, and where it compresses space the density piles up. Two cases come up repeatedly:

- **Polar coordinates.** $(r, \phi) \mapsto (r\cos\phi, r\sin\phi)$ has Jacobian determinant $r$, so $p(r, \phi) = r\, p(x, y)$.
- **Spherical coordinates.** By $\eqref{eq:rad-sph}$, a density per unit solid angle and the density of the angles themselves are related by $p(\theta, \phi) = \sin\theta\, p(\omega)$.

The same rule gives the density of a [normalizing flow](#normalizing-flows-and-nice) in the second half of these notes, where $T$ is a neural network, and the two path-density conversions $\eqref{eq:pdf-sigma-to-A}$ and $\eqref{eq:pdf-sigmaperp-to-A}$ are instances of it.

**Two dimensions: marginal and conditional.** A 2D density $p(x, y)$ is sampled one coordinate at a time. Compute the marginal and the conditional,

$$
p(x) = \int p(x, y)\, \mathrm{d}y, \qquad p(y \mid x) = \frac{p(x, y)}{p(x)},
$$

sample $X$ from the marginal by inversion, then sample $Y$ from the conditional given that $X$, again by inversion. This is how a tabulated environment map is sampled, and it is exactly the structure that [Distribution Factorization](#distribution-factorization-2025) asks two networks to predict.

**Worked example: uniform hemisphere.** The target is $p(\omega) = 1/(2\pi)$, so $p(\theta, \phi) = \sin\theta/(2\pi)$. The marginal is $p(\theta) = \int_0^{2\pi} p(\theta,\phi)\, \mathrm{d}\phi = \sin\theta$ and the conditional is $p(\phi \mid \theta) = 1/(2\pi)$. Their CDFs are $P(\theta) = 1 - \cos\theta$ and $P(\phi \mid \theta) = \phi/(2\pi)$. Inverting with two uniform numbers $\xi_1, \xi_2$, and using the fact that $1 - \xi_1$ is as uniform as $\xi_1$:

$$
\theta = \cos^{-1}\xi_1, \qquad \phi = 2\pi\xi_2,
\qquad
\omega = \left( \cos(2\pi\xi_2)\sqrt{1-\xi_1^2},\; \sin(2\pi\xi_2)\sqrt{1-\xi_1^2},\; \xi_1 \right).
$$

**Worked example: cosine-weighted hemisphere.** The target is $p(\omega) = \cos\theta/\pi$, the density that matches the cosine factor of the rendering equation and is the exact importance-sampling density for a Lambertian surface. **Malley's method** samples it with no trigonometry: pick a point uniformly on the unit disc, then project it straight up onto the hemisphere. To see why, a uniform point on the disc has $p(x,y) = 1/\pi$, so $p(r, \phi) = r/\pi$ by the polar rule; it is generated by $r = \sqrt{\xi_1}$, $\phi = 2\pi\xi_2$. The vertical projection sets $\sin\theta = r$, a change of variables $(r, \phi) \mapsto (\theta, \phi)$ with Jacobian determinant $\mathrm{d}r/\mathrm{d}\theta = \cos\theta$, so

$$
p(\theta, \phi) = \cos\theta \cdot \frac{r}{\pi} = \frac{\cos\theta \sin\theta}{\pi}
\quad\Longrightarrow\quad
p(\omega) = \frac{p(\theta,\phi)}{\sin\theta} = \frac{\cos\theta}{\pi}.
$$

### The Monte Carlo Estimator

With those definitions in hand, the estimator itself can be stated, followed by the three properties that make it usable: it converges to the right answer, its error falls at a known rate, and that error is controlled by a single quantity. The treatment follows PBRT, Section 2.1 [[2]](#ref-2), and Veach, Chapter 2 [[12]](#ref-12).

Let $I$ be the integral to be estimated (for us, the rendering equation) over a domain $\Omega$:

$$
I = \int_{\Omega} f(x)\, \mathrm{d}x .
$$

#### From Integration to Expectation

Monte Carlo integration rests on rewriting the integral as an **expectation**. Take any probability density $p$ on $\Omega$ and multiply and divide by it:

$$
I = \int_{\Omega} f(x)\, \mathrm{d}x = \int_{\Omega} \frac{f(x)}{p(x)}\, p(x)\, \mathrm{d}x .
$$

The right-hand side is the expected value of $g(X) = f(X)/p(X)$ for a random variable $X$ with density $p$, since $\mathbb{E}[g(X)] = \int_{\Omega} g(x)\, p(x)\, \mathrm{d}x$. Hence

$$
I = \mathbb{E}\!\left[\frac{f(X)}{p(X)}\right], \qquad X \sim p .
$$

An integral that cannot be evaluated becomes an average that can be estimated by drawing samples. The widget below estimates $\pi$ this way.

<iframe src="/interactive/monte_carlo.html" title="Monte Carlo estimate of pi" width="100%" height="402" frameborder="0"></iframe>

**Conditions on $p$.** Besides being a density ($p \ge 0$ and $\int_\Omega p\, \mathrm{d}x = 1$), $p$ must be nonzero wherever $f$ is:

$$
p(x) > 0 \quad \text{whenever } f(x) \neq 0 .
$$

If $p$ vanishes on a region where $f$ does not, that region is never sampled, its contribution is missing from every estimate, and the estimator converges to the wrong value. This is the condition that a path tracer must respect when it combines or replaces sampling techniques, for example in [path guiding](#advances-in-importance-sampling).

#### The Estimator

Drawing $N$ independent samples $X_1, \ldots, X_N$ from $p$ and averaging gives the **Monte Carlo estimator**

$$
\begin{equation}
\hat{I}_N = \frac{1}{N} \sum_{i=1}^{N} \frac{f(X_i)}{p(X_i)}, \qquad X_i \stackrel{\text{i.i.d.}}{\sim} p .
\label{eq:mc-estimator}
\end{equation}
$$

With $p$ uniform on a domain of volume $V$ it reduces to $\hat I_N = \frac{V}{N}\sum_i f(X_i)$. Choosing a nonuniform $p$ that resembles $f$ is **importance sampling**, the subject of [the next chapter](#importance-sampling).

**Unbiasedness.** The expected value of the estimator is the integral, for any $N$:

$$
\begin{equation}
\begin{aligned}
\mathbb{E}\!\left[\hat{I}_N\right]
  &= \frac{1}{N}\sum_{i=1}^{N}\mathbb{E}\!\left[\frac{f(X_i)}{p(X_i)}\right]
  && \text{[linearity of expectation]} \\[6pt]
  &= \frac{1}{N}\sum_{i=1}^{N}\int_{\Omega}\frac{f(x)}{p(x)}\,p(x)\,\mathrm{d}x
  && \text{[}X_i \sim p\text{]} \\[6pt]
  &= \frac{1}{N}\sum_{i=1}^{N}\int_{\Omega} f(x)\,\mathrm{d}x = I .
  && \text{[}p > 0 \text{ wherever } f \neq 0\text{]}
\end{aligned}
\label{eq:mc-unbiased}
\end{equation}
$$

The last step is where the support condition is used: the cancellation of $p$ is valid only where $p > 0$, so the integral of $f$ over the region where $p = 0$ would otherwise be lost.

**Variance.** The samples are independent and identically distributed, so the variance of the sum is the sum of the variances, and the factor $1/N$ comes out squared:

$$
\begin{equation}
\mathbb{V}\!\left[\hat{I}_N\right]
  = \frac{1}{N^{2}}\sum_{i=1}^{N}\mathbb{V}\!\left[\frac{f(X_i)}{p(X_i)}\right]
  = \frac{1}{N}\mathbb{V}\!\left[\frac{f(X)}{p(X)}\right] .
\label{eq:mc-variance}
\end{equation}
$$

Everything that depends on the choice of $p$ is in the single-sample variance $\mathbb{V}[f(X)/p(X)]$; every method in the second half of these notes is an attempt to make it small.

**Convergence rate.** The standard deviation, the typical size of the error, is the square root of $\eqref{eq:mc-variance}$:

$$
\sigma\!\left[\hat{I}_N\right] = \frac{1}{\sqrt{N}}\,\sqrt{\mathbb{V}\!\left[\frac{f(X)}{p(X)}\right]} = \mathcal{O}\!\left(N^{-1/2}\right) .
$$

Halving the error takes four times as many samples. The rate does not depend on the dimension of $\Omega$, whereas deterministic quadrature rules converge more slowly as the dimension grows. The path integral is infinite-dimensional, which is why rendering relies on Monte Carlo.

### Bias, Consistency and Mean Squared Error

The estimator above is one member of a larger family. In general a Monte Carlo **estimator** is any function $F_N = F_N(X_1, \ldots, X_N)$ of random variables that is meant to approximate a quantity $Q$, and the vocabulary for judging one is the following (Veach, Section 2.4.3).

- The **error** is $F_N - Q$, and its expected value is the **bias**: $\beta[F_N] = \mathbb{E}[F_N - Q]$.
- An estimator is **unbiased** if $\mathbb{E}[F_N] = Q$ for every sample count $N$.
- An estimator is **consistent** if the error goes to zero with probability one as $N \to \infty$. A sufficient condition is that both the bias and the variance go to zero. An unbiased estimator is consistent as long as its variance does.

A biased estimator can still be consistent: its error vanishes in the limit, but at any finite $N$ its average is off. Path tracing with Russian roulette is unbiased. Path tracing truncated at a fixed `max_depth` is biased and not consistent, since no number of samples recovers the missing bounces. A neural radiance cache used to terminate paths is biased by whatever the network gets wrong.

The quantity one actually wants small is the **mean squared error**, and it splits into exactly these two parts:

$$
\begin{equation}
\begin{aligned}
\mathrm{MSE}[F] &= \mathbb{E}\left[(F - Q)^2\right] \\
&= \mathbb{E}\left[(F - \mathbb{E}[F])^2\right] + 2\,\mathbb{E}\left[F - \mathbb{E}[F]\right]\left(\mathbb{E}[F] - Q\right) + \left(\mathbb{E}[F] - Q\right)^2 \\
&= \mathbb{V}[F] + \beta[F]^2 ,
\end{aligned}
\label{eq:mse-decomposition}
\end{equation}
$$

where the middle term vanishes because $\mathbb{E}[F - \mathbb{E}[F]] = 0$. Variance shows up in an image as noise, and bias as a systematic error.

Veach's reason for preferring unbiased estimators is that their error can be *estimated*. For an unbiased estimator the MSE is just the variance, and the variance can be measured from the samples themselves: with independent samples $Y_1, \ldots, Y_N$ and $F_N = \frac{1}{N}\sum Y_i$,

$$
\begin{equation}
\hat{V}[F_N] = \frac{1}{N-1}\left[ \frac{1}{N}\sum_{i=1}^{N} Y_i^2 - \left(\frac{1}{N}\sum_{i=1}^{N} Y_i\right)^2 \right]
\label{eq:sample-variance}
\end{equation}
$$

is an unbiased estimate of $\mathbb{V}[F_N]$. Bounding the bias of a biased estimator, by contrast, needs extra knowledge about the answer.

Veach argues (Section 1.4.4) that unbiased estimators are essential for light transport calculations to be robust, a point worth stating because many algorithms used in graphics are merely consistent. With an unbiased algorithm any error is guaranteed to show up as random variation among the samples, so the sample variance above measures it. With a merely consistent one the bias must also be bounded, and that cannot be done by drawing a few more samples. Bias gives results that are not noisy but are still wrong, and in images it tends to appear as discontinuities, excessive blurring or objectionable shading. For the same reason unbiased algorithms are used to render reference images, against which the artifacts of approximate methods are detected and measured; for scenes of realistic complexity they are the only practical way to produce an image that can confidently be called correct. Veach's recommended practice is to start from an unbiased algorithm and adopt approximations only where they are clearly necessary and their effects are understood.

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

By $\eqref{eq:mc-variance}$, the only part of the estimator's variance that depends on the choice of $p$ is the single-sample variance $\mathbb{V}[f(X)/p(X)]$. The question is which $p$ makes it small. Expanding it:

$$
\begin{aligned}
\mathbb{V}\!\left[\frac{f(X)}{p(X)}\right]
  &= \mathbb{E}\!\left[\left(\frac{f(X)}{p(X)}\right)^{2}\right]
   -\left(\mathbb{E}\!\left[\frac{f(X)}{p(X)}\right]\right)^{2}
  && \text{[}\mathbb{V}[Y] = \mathbb{E}[Y^{2}] - \mathbb{E}[Y]^{2}\text{]} \\[6pt]
  &= \mathbb{E}\!\left[\left(\frac{f(X)}{p(X)}\right)^{2}\right] - I^{2}
  && \text{[by }\eqref{eq:mc-unbiased}\text{]}
\end{aligned}
$$

The second term is fixed, being the square of the integral being computed, so minimizing the variance means minimizing the first:

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

The best choice is a density proportional to the integrand, $p = c f$ (Veach, Section 2.5.2 [[12]](#ref-12)). For $f \ge 0$, normalization fixes the constant:

$$
p^*(x) = \frac{f(x)}{\int_{\Omega} f(y)\, \mathrm{d}y} = \frac{f(x)}{I} .
$$

Every sample then gives the same value,

$$
\frac{f(X)}{p^*(X)} = \frac{f(X)}{f(X)/I} = I ,
$$

so the estimator has **zero variance**: a single sample returns the exact integral. (If $f$ takes both signs, the best choice is $p \propto \lvert f \rvert$, which no longer gives zero variance.)

The reason is visible in the integral $\int f^2/p$ above. Where $f$ is large, a large $p$ keeps the ratio $f/p$ from growing; where $f$ is small, a small $p$ costs little, because few samples are needed where there is little to integrate. With $p \propto f$ the ratio is the same everywhere. A uniform $p$ does the opposite: it spends as many samples where $f \approx 0$ as where $f$ is large, and the ratio $f/p$ varies as much as $f$ does.

### The Catch

The optimal density cannot be used directly: its normalization constant is $\int_\Omega f$, the integral being estimated. What remains useful is the principle. The variance $\frac{1}{N}\left(\int_\Omega f^2/p - I^2\right)$ falls as $p$ comes closer to being proportional to $f$, so the practical goal is a density that has roughly the shape of $f$ and can be sampled cheaply. Veach describes the usual way to get one: drop or approximate the factors of $f$ that cannot be integrated analytically, and sample in proportion to what remains. In a path tracer, sampling the BSDF keeps the BSDF and cosine and drops the incident radiance; light sampling keeps the direct light from the emitters and drops the BSDF. The learned methods in the second half approximate the full incident radiance, including indirect light, which neither strategy captures. {{< figref "fig-importance-sampling" >}} contrasts a poor and a good choice.

{{< 
figure src="/images/path_tracing/sampling/importance_sampling_graph.svg"
id="fig-importance-sampling"
caption="The same integrand $f(x)$ with a sampling density $p(x)$ that puts its mass in the wrong place (left) and one that follows $f$ (right)."
width="85%" 
>}}

<iframe src="/interactive/importance_sampling.html" title="importance sampling" width="100%" height="412" frameborder="0"></iframe>

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

The previous sections provide every piece: a formulation of the rendering equation, an unbiased estimator for it, and a criterion for choosing the sampling density. Path tracing assembles them.

**Path tracing** estimates the rendering equation by following random paths of light backwards from the camera, bouncing off surfaces until they reach a light. 

With Russian roulette instead of a hard depth limit, it is an unbiased estimator of the rendering equation (the `max_depth` cutoff used in the code below introduces a small bias, see [Russian roulette](#russian-roulette)):

$$
{\class{term-light}{L_o(x, \omega_o)}} = {\class{term-light}{L_e(x, \omega_o)}} + \int_{\Omega} {\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}\;{\class{term-light}{L_i(x, \omega_i)}}\; (\omega_i \cdot n)\; d\omega_i
$$

### From the Path Integral to the Path Tracer

The loop that a path tracer runs, multiplying a throughput by BSDF times cosine over density at each bounce, can be derived from the [path integral](#path-integral-formulation-of-light-transport) in a few lines. This follows PBRT, Section 13.2.

**Setup.** A path tracer builds paths from the camera, so number the vertices that way here: $y_0$ is the point on the camera, $y_1$ the first surface hit, and $y_n$ the vertex on a light. (This is the reverse of the path-integral numbering, $y_i = x_{k-i}$.) The radiance arriving at the camera along the ray from $y_1$ is the sum over path lengths

$$
\begin{equation}
\begin{aligned}
{\class{term-light}{L(y_1 \to y_0)}} &= \sum_{n=1}^{\infty} P(\bar{y}_n), \\
P(\bar{y}_n) &= \int_{\mathcal{M}^{n-1}} {\class{term-light}{L_e(y_n \to y_{n-1})}} \left[\prod_{i=1}^{n-1} {\class{term-bsdf}{f_s(y_{i+1} \to y_i \to y_{i-1})}}\; G(y_{i+1} \leftrightarrow y_i)\right] \\
&\qquad \mathrm{d}A(y_2) \cdots \mathrm{d}A(y_n),
\end{aligned}
\label{eq:pt-sum}
\end{equation}
$$

where $P(\bar{y}_n)$ is the light that reaches the camera after exactly $n-1$ scattering events. The product in brackets is called the **throughput** of the path.

**Why not sample vertices by area?** The measure is area, so the obvious strategy is to pick each $y_i$ uniformly over all the surfaces in the scene. It is correct and nearly useless: most pairs of consecutive vertices are not mutually visible, so $G = 0$ and the path contributes nothing, and a glossy BSDF makes almost every remaining path contribute very little.

**Incremental construction.** Instead, build the path one vertex at a time. At $y_i$, sample a direction $\omega_i$ from a density $p_\sigma(\omega_i)$ (the BSDF's sampling density, or a guiding distribution), and trace a ray to find $y_{i+1}$. By $\eqref{eq:pdf-sigma-to-A}$ the area density of the vertex found this way is

$$
p_A(y_{i+1}) = p_\sigma(\omega_i)\, \frac{\lvert\cos\theta'_{i+1}\rvert}{\lVert y_i - y_{i+1} \rVert^2},
$$

with $\theta'_{i+1}$ the angle at the new vertex. Now divide the geometry term on that edge by this density. The cosine at the new vertex and the squared distance are in both and cancel, and the visibility is 1 because the vertex was found by tracing a ray:

$$
\begin{equation}
\frac{G(y_{i+1} \leftrightarrow y_i)}{p_A(y_{i+1})}
= \frac{\lvert\cos\theta_i\rvert\, \lvert\cos\theta'_{i+1}\rvert}{\lVert y_i - y_{i+1} \rVert^2} \cdot \frac{\lVert y_i - y_{i+1} \rVert^2}{p_\sigma(\omega_i)\, \lvert\cos\theta'_{i+1}\rvert}
= \frac{\lvert\cos\theta_i\rvert}{p_\sigma(\omega_i)} .
\label{eq:G-cancels}
\end{equation}
$$

Only the cosine at the vertex being *left* survives. Doing this on every edge, the estimate $f/p$ of $P(\bar{y}_n)$ is

$$
\begin{equation}
P(\bar{y}_n) \approx {\class{term-light}{L_e(y_n \to y_{n-1})}} \prod_{i=1}^{n-1} \frac{{\class{term-bsdf}{f_s(y_{i+1} \to y_i \to y_{i-1})}}\; \lvert\cos\theta_i\rvert}{p_\sigma(\omega_i)}
= {\class{term-light}{L_e(y_n \to y_{n-1})}}\; \beta_n .
\label{eq:pt-estimator}
\end{equation}
$$

$\beta_n$ is the running product a path tracer keeps in its throughput variable. No distances, no visibility tests and no cosines at the far end of an edge appear: ray casting has importance-sampled all of them exactly.

**Reusing the prefix.** A separate path for every length $n$ would be wasteful. The path of length $n+1$ is the path of length $n$ extended by one vertex, so one random walk estimates every term of the sum at once:

$$
\begin{equation}
{\class{term-light}{L(y_1 \to y_0)}} \approx \sum_{n=1}^{\infty} \beta_n\, {\class{term-light}{L_e(y_n \to y_{n-1})}},
\qquad
\beta_{n+1} = \beta_n \cdot \frac{{\class{term-bsdf}{f_s}}\, \lvert\cos\theta_n\rvert}{p_\sigma(\omega_n)}, \quad \beta_1 = 1 .
\label{eq:pt-loop}
\end{equation}
$$

This is the line `L ← L + β * Lₑ` followed by `β ← β * (fᵣ / pᵢ)` in the [loop formulation](#loop-formulation) below. Sharing vertices makes the terms correlated, which does not bias the estimator. It also shows precisely where importance sampling enters: the variance of each factor of $\beta$ is zero when $p_\sigma \propto f_s \lvert\cos\theta\rvert$, and the variance of the whole estimate is zero only if $p_\sigma$ is also proportional to the radiance that will be found further along the path, which is the quantity path guiding learns.

**Next event estimation.** The estimator $\eqref{eq:pt-estimator}$ only collects light when a random walk happens to land on an emitter, which is hopeless for a small light. **Next event estimation** (NEE) samples the last vertex differently: instead of a direction at $y_{n-1}$, pick a point $y_n$ directly on a light with area density $p_A(y_n)$, and connect it to $y_{n-1}$ with a shadow ray. Nothing cancels on this last edge, so the geometry term stays:

$$
\begin{equation}
P(\bar{y}_n) \approx \frac{{\class{term-light}{L_e(y_n \to y_{n-1})}}\; {\class{term-bsdf}{f_s(y_n \to y_{n-1} \to y_{n-2})}}\; G(y_n \leftrightarrow y_{n-1})}{p_A(y_n)}\; \beta_{n-1},
\label{eq:nee}
\end{equation}
$$

where $G$ includes the visibility, evaluated by the shadow ray. This is the same integral $P(\bar{y}_n)$ estimated by a second technique. A path tracer that uses both must not add both at full weight, or direct light is counted twice. Either the emission found by BSDF sampling is dropped whenever NEE was used at the previous vertex, or the two are combined with [multiple importance sampling](#mis-in-a-path-tracer), which is what PBRT's path integrator does.

### Russian Roulette

There is a problem left over from the [Neumann series](#neumann-series-expansion): the expansion has infinitely many terms, so a path could in principle bounce forever. Truncating at a fixed depth is simple but **biased**, because it throws away all the energy beyond that depth. Russian roulette removes the bias while still terminating.

Take any estimator $F$, here the contribution of the rest of a path. Russian roulette evaluates it only with a **survival probability** $q$ (the same $q$ as in the pseudocode below), and scales it up when it does:

$$
\begin{equation}
F_{RR} =
\begin{cases}
F / q & \text{with probability } q, \\
0 & \text{with probability } 1 - q .
\end{cases}
\label{eq:rr}
\end{equation}
$$

Its expected value is unchanged,

$$
\mathbb{E}[F_{RR}] = q \cdot \frac{\mathbb{E}[F]}{q} + (1 - q) \cdot 0 = \mathbb{E}[F],
$$

so the estimator stays unbiased although some samples are never evaluated: the surviving paths are scaled up by exactly enough to compensate for the terminated ones. The work saved is that of the samples skipped, which is worthwhile when they would have contributed little.

**Choosing $q$.** The survival probability is not arbitrary. Since the point is to kill paths that contribute little, $q$ is chosen from the **path throughput** $\beta$, the running product of BSDF-over-PDF factors accumulated so far. A common choice is to continue with probability $q = \min(1, \max(\beta_r, \beta_g, \beta_b))$, the largest colour channel of $\beta$, so a path whose throughput has decayed to $0.1$ survives with probability $0.1$ and is boosted by $10\times$ if it does. Paths carrying full energy are never killed.

**The trade-off.** Russian roulette always *increases* variance, since it replaces a certain contribution with a random one of the same mean. It pays off because it reduces the expected cost per path by more than it raises variance, which is a win in the [efficiency](#measuring-error-and-efficiency) sense defined above. Applying it too aggressively, with survival probability $q$ near 0, produces the characteristic bright-speckle noise of a few surviving paths carrying enormous weights.

**Splitting.** Russian roulette has a counterpart (Veach, Section 2.7.2). Splitting replaces an estimator $F_i$ by the average of $k$ independent samples of it,

$$
\begin{equation}
F_i' = \frac{1}{k} \sum_{j=1}^{k} F_{i,j},
\qquad
\mathbb{E}[F_i'] = \mathbb{E}[F_i],
\label{eq:splitting}
\end{equation}
$$

so it is unbiased too. In a particle-transport setting it splits one particle into $k$ particles that follow independent paths, each with $1/k$ of the original weight. The splitting factor is chosen from the estimated contribution, larger where more is expected.

The two techniques rest on the same idea. Given the current state $\mathbf{x}_0 \mathbf{x}_1 \cdots \mathbf{x}_k$ of a random walk, any function of that state may be used to decide how many samples of the next vertex $\mathbf{x}_{k+1}$ to take. If the path is predicted to contribute little, usually take none (roulette); if much, take several (splitting). Applied at every vertex, the result is a tree of paths, and unlike adaptive sampling this introduces no bias. Splitting also amortizes the cost of the path up to the split point over several continuations. Veach calls Russian roulette indispensable in transport calculations, since it terminates otherwise infinite random walks without bias, and splitting useful when judiciously applied; together they direct sampling effort into the most productive regions of the domain.

Russian roulette reappears in the second half: PPG adopts **adjoint-based** Russian roulette, where the termination probability additionally accounts for how much light the path is expected to find.

### The Algorithm

Put together, one sample of a pixel is computed as follows:

1. **Generate a camera ray** through a random point in the pixel.
2. **Find the nearest intersection.** A ray that leaves the scene returns the environment's radiance (zero in the pseudocode below, which assumes a black background).
3. **Add the emission** ${\class{term-light}{L_e}}$ of the surface that was hit, multiplied by the throughput.
4. **Sample a direction** $\omega_i$ from the BSDF and multiply the throughput by the weight ${\class{term-bsdf}{f_s}}\lvert\cos\theta_i\rvert / p(\omega_i)$ of $\eqref{eq:pt-loop}$.
5. **Continue the path** along $\omega_i$ from step 2, until the maximum depth is reached or Russian roulette terminates it.

The pixel value is the average of many such samples. Pixels are independent of each other, so they are computed in parallel. Direct lighting by next event estimation, combined with these steps through MIS, is added in [MIS in a Path Tracer](#mis-in-a-path-tracer).

The stepper below follows one path through a small scene with these steps, and then adds a second sample to the same pixel. Both objects are diffuse and are sampled with the cosine-weighted density $p(\omega) = \cos\theta/\pi$. With ${\class{term-bsdf}{f_r}} = \rho/\pi$ the weight of a bounce is then ${\class{term-bsdf}{f_r}}\cos\theta/p = \rho$, the albedo, so the radiance carried back is the light's ${\class{term-light}{L_e}}$ multiplied, per colour channel, by the albedo of every surface the path bounced off. The numbers on the right are those RGB values.

<iframe src="/interactive/pt_steps.html" title="Path tracing step by step" width="100%" height="378" frameborder="0"></iframe>

The workbench below runs the same algorithm on a full image: it traces pixels one at a time, shows the path behind any selected pixel bounce by bounce, and accumulates a render.

{{< 
fullscreen-iframe 
id="rt_iframe" 
src="/interactive/ray_tracing.html" 
height="640" 
>}}

### Samples per Pixel and Maximum Depth

Two parameters of the algorithm above set the cost and the quality of an image: the number of samples per pixel and the maximum depth. The renders below show both on a real scene, path traced with next event estimation. In {{< figref "fig-bathroom-spp" >}} the image is cut into strips of increasing samples per pixel. The error (relMSE against the reference) falls by a factor of about four for every four times as many samples: the variance of the estimator is proportional to $1/N$, so halving the noise costs four times the work.

{{< 
figure src="/images/path_tracing/scenes/bathroom_spp.svg"
noinvert="true"
id="fig-bathroom-spp"
caption="The bathroom scene at 1 to 1024 samples per pixel (max depth 10). Bottom row: the marked region at each sample count and in the 32768 spp reference, with the relMSE of the whole image."
width="100%" 
>}}

{{< figref "fig-bathroom-depth" >}} fixes the sample count and varies the maximum depth, the number of bounces a path may make. At depth 0 only the emitter is visible. Depth 1 adds direct lighting, so everything the window does not see directly stays black, and the mirror reflects only the window itself. Each further bounce adds one more order of indirect light; the contributions shrink with depth, but the glass bulbs, which light must enter and leave through several interfaces, are still dark at depth 4.

{{< 
figure src="/images/path_tracing/scenes/bathroom_depth.svg"
noinvert="true"
id="fig-bathroom-depth"
caption="The bathroom scene at increasing maximum path depth (2048 spp; depth 10 is the reference)."
width="100%" 
>}}

### Recursive and Iterative Formulations

| Symbol | Meaning |
|--------|---------|
| $w$ | **Weight** of one bounce: $w = f_r\,\lvert\cos\theta_i\rvert / p_i$ (in the code, $f_r$ already includes $\lvert\cos\theta_i\rvert$) |
| $\beta$ | **Throughput** - product of the weights of all bounces so far, $\beta = \prod_{k=0}^{d-1} w^{(k)}$, the $\beta_n$ of $\eqref{eq:pt-loop}$ |
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
function PATHTRACE(scene, ray, depth, β)      # β: throughput of the path so far, 1 for a camera ray
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
    w ← fᵣ / p_ωᵢ                             # weight of this bounce
    β ← β · w                                 # only needed for Russian roulette

    if depth ≥ rr_depth then                   # decide BEFORE recursing
        q ← min(1, max(β.r, β.g, β.b))         # survival probability
        if RAND() ≥ q then
            return Lₑ
        end if
        w ← w / q
        β ← β / q
    end if

    next_ray ← RAY(si.p, ωᵢ)
    Lᵢ ← PATHTRACE(scene, next_ray, depth + 1, β)

    return Lₑ + w · Lᵢ
end function
```
**Recursion relation:**
$${\class{term-light}{L_o^{(d)}(x, \omega_o)}} = {\class{term-light}{L_e(x, \omega_o)}} + \frac{{\class{term-bsdf}{f_r(x, \omega_i, \omega_o)}}\, \lvert\cos\theta_i\rvert}{p(\omega_i)}\, {\class{term-light}{L_i^{(d+1)}(x, \omega_i)}}$$

#### Loop Formulation
The loop version keeps the throughput $\beta$ explicitly instead of on the call stack:

```markdown
function PATHTRACE(scene, ray):
    depth ← 0
    β ← 1                # throughput
    L ← 0                # accumulated radiance

    while depth < max_depth
        si ← INTERSECT(ray, scene)
        if not si.valid():
            break

        bsdf ← si.bsdf()
        Lₑ ← si.emission()
        L ← L + β * Lₑ   # accumulate emitted radiance

        (ωᵢ, fᵣ, pᵢ) ← BSDF_SAMPLE(bsdf)   # function implicitly returns (fᵣ​ × ∣cosθ∣)
        if pᵢ == 0:
            break

        β ← β * (fᵣ / pᵢ)   # update throughput
        ray ← RAY(si.p, ωᵢ)

        # Russian roulette termination
        if depth ≥ rr_depth:
            q ← min(1, max(β.r, β.g, β.b))   # survival probability
            if RAND() ≥ q:
                break
            β ← β / q

        depth ← depth + 1

    return L
```

**Accumulation relation:**
$${\class{term-light}{L}} = \sum_{d=0}^{\infty} \beta^{(d)} \cdot {\class{term-light}{L_e^{(d)}}}$$
where $\beta^{(d)} = \prod_{k=0}^{d-1} \frac{\class{term-bsdf}{f_r^{(k)}}}{p_i^{(k)}}$ (with $f_r$ understood to include $\lvert\cos\theta_i\rvert$, as in the code)

**Equivalence.** Both formulations compute the same estimate $\eqref{eq:pt-loop}$. The recursive one mirrors the rendering equation: each call returns the estimate $\hat L_o$ at its vertex, and the sum is assembled as the calls return. The loop carries the throughput forward and adds each emission as soon as it is found, which needs no call stack and suits GPUs.

#### The Two Formulations Side by Side

Both versions below trace the same path $x_1 \cdots x_5$ with `max_depth = 5`. Only $x_2$ and $x_4$ emit, and $w_k = {\class{term-bsdf}{f_r}}\lvert\cos\theta\rvert/p$ is the weight of the direction sampled at $x_k$. The weights and emissions are given numbers so that every line can be checked by hand. Every value is a one-sample estimate: $L(x_k)$ in the widget stands for $\hat L_o(x_k) = L_e(x_k) + w_k\, \hat L_o(x_{k+1})$, with directions left implicit ($L_e(x_k)$ is the emission from $x_k$ back along the path).

In the recursive version nothing is added up on the way out; each edge is labelled with the radiance it carries once its call has returned. In the loop each edge is labelled with the throughput $\beta$ it carries forward, and $L$ is complete as soon as the last vertex is reached. Both end with the same sum, $w_1 L_e(x_2) + w_1 w_2 w_3 L_e(x_4)$: each emitter is scaled by the weights of the vertices between it and the camera, which is $\eqref{eq:pt-loop}$.

<iframe src="/interactive/pt_loop.html" title="Recursive and iterative path tracing" width="100%" height="496" frameborder="0"></iframe>

#### Consequences for Collecting Training Data

The guiding methods in the second half learn from the incident radiance observed at each vertex of a path. The recursive formulation has this value at hand: when the call at depth $d$ returns, it holds the estimate ${\class{term-light}{L_i}}^{(d)}$ together with the sampled direction $\omega_i^{(d)}$ and the surface point $x^{(d)}$.

The loop never computes the incident radiance at intermediate vertices; it only accumulates the final $L$ by carrying the throughput forward. To obtain per-vertex training data from it, each vertex's throughput and emitted radiance are stored, and a reverse accumulation after the path ends (linear in the path length) recovers the incident radiance at every vertex.

### Path Tracing Integrator in Mitsuba

Mitsuba 3 is a research-oriented retargetable rendering system, written in portable C++17 on top of the Dr.Jit Just-In-Time compiler.

Its Python bindings are enough to write a complete path tracer from Mitsuba's components. The scene objects are the ones listed in [Scene Components](#scene-components).

The sensor generates the camera rays:

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

Those rays are given to the integrator, which traces them through the scene. It is the [loop formulation](#loop-formulation) line for line, with `β` the throughput. The code is for Mitsuba 3.6 (Dr.Jit 1.0), where `@dr.syntax` turns the `while` loop into a loop over all rays at once; on the Cornell box it gives the same image, up to noise, as Mitsuba's own `path` integrator.

```python
class Simple(mi.SamplingIntegrator):
    def __init__(self, props=mi.Properties()):
        super().__init__(props)
        self.max_depth = props.get("max_depth")  # Max Depth for Tracing
        self.rr_depth = props.get("rr_depth")    # Depth After which Russian Roulette Starts

    @dr.syntax
    def sample(self, scene: mi.Scene, sampler: mi.Sampler, ray_: mi.RayDifferential3f, medium: mi.Medium = None, active: bool = True):
        bsdf_ctx = mi.BSDFContext()  # get the bsdf context

        ray = mi.Ray3f(ray_)         # Copy the Rays given by the Sensor
        depth = mi.UInt32(0)         # Initialize depth to 0
        β = mi.Spectrum(1.)          # Initialize throughput to 1
        L = mi.Spectrum(0.)          # Initialize Radiance to 0
        active = mi.Bool(active)

        while active:
            #  Intersect Ray with the Primitive in the Scene
            si: mi.SurfaceInteraction3f = scene.ray_intersect(
                ray, ray_flags=mi.RayFlags.All, coherent=(depth == 0))

            # Emission: L ← L + β * Lₑ (zero unless the primitive is an emitter)
            L += β * si.emitter(scene).eval(si)

            # BSDF Sampling: returns the direction and the weight fᵣ |cos θ| / p
            active_next = (depth + 1 < self.max_depth) & si.is_valid()
            bsdf: mi.BSDF = si.bsdf(ray)
            bsdf_sample, bsdf_weight = bsdf.sample(
                bsdf_ctx, si, sampler.next_1d(), sampler.next_2d(), active_next)

            # Update loop variables: β ← β * (fᵣ / pᵢ)
            ray = si.spawn_ray(si.to_world(bsdf_sample.wo))
            β *= bsdf_weight
            active_next &= dr.max(β) != 0

            # Russian roulette: survival probability, capped below 1 (as in Mitsuba's own path.py)
            rr_prob = dr.minimum(dr.max(β), 0.95)
            rr_active = depth >= self.rr_depth
            β[rr_active] *= dr.rcp(rr_prob)
            active_next &= ~rr_active | (sampler.next_1d() < rr_prob)

            active = active_next
            depth += 1
        return (L, depth != 0, [])

mi.register_integrator("integrator", lambda props: Simple(props))
```


### Choosing the Next Direction
The illustrations above sampled the next direction from the BSDF (or an approximation of it). That is one choice among several, and which one is best depends on the scene. Below, one shading point is lit by a small bright light and a large dim one, and the same 16 samples are drawn in three ways: uniformly, towards the lights, and from the BSDF. The blue lobe is the material's ${\class{term-bsdf}{f_r}}\cos\theta$. A ray is orange if it found a light, and fainter where the material reflects little of that light towards the camera. The bar under each panel is the noise of that strategy, the exact relative standard error of a single sample. Switch the material and compare which panel wins.

<iframe src="/interactive/next_direction.html" title="Sampling the next direction" width="100%" height="316" frameborder="0"></iframe>

The pattern to take away: uniform sampling ignores both factors and wastes most samples. Sampling the lights (next event estimation) works very well on a diffuse surface, where the BSDF is flat and the light is the only thing that varies. On a glossy surface it loses, because a light sample that falls outside the narrow lobe is multiplied by a near-zero BSDF; there sampling the BSDF wins.

The densities of the two strategies are sketched in {{< figref "fig-pdf-bsdf" >}} and {{< figref "fig-pdf-nee" >}}:

<div style="display:flex; justify-content:center; gap:20px;">

  <div style="flex:1; text-align:center;">
    {{< 
    figure src="/images/path_tracing/sampling/bsdf.svg"
    id="fig-pdf-bsdf"
    caption="Diffuse BRDF PDF (Cosine Weighted)"
    width="100%" 
    >}}
  </div>

  <div style="flex:1; text-align:center;">
    {{< 
    figure src="/images/path_tracing/sampling/nee.svg"
    id="fig-pdf-nee"
    caption="Next Event Estimation PDF"
    width="100%" 
    >}}
  </div>

</div>

Each strategy is the better one in some parts of a scene and the worse one in others, so the question is how to use several sampling strategies in one estimator.

### Example: a Pair of Scenes

The renders in this section are from Nikita Lisitsa's [blog post](https://lisyarus.github.io/blog/posts/multiple-importance-sampling.html) on multiple importance sampling [[17]](#ref-17).

The two scenes are a diffuse plane lit by a small light source (left) and a metallic plane lit by a large one (right). Each is rendered at 64 spp, first with uniform sampling of the hemisphere and then with cosine-weighted sampling, which matches the $\cos\theta$ factor and, on a diffuse surface, the constant BRDF as well:

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

Cosine weighting helps little in either scene, because in both the density misses the factor that varies most. On the diffuse plane it matches the BRDF and the cosine, but the light arrives only from the few directions that point at the small sphere. On the metallic plane the light arrives from many directions, so the incident light is matched reasonably well, but a polished metal reflects only around the mirror direction, which neither density follows.

Each scene has a strategy that fits it. For the diffuse plane it is **light sampling**: choose directions that point at the light source. For the metallic plane it is **BSDF sampling**: draw a microfacet normal from the [distribution of visible normals](#microfacet-models-the-basics) (VNDF) and reflect $\omega_o$ about it, which concentrates the rays around the mirror direction in proportion to the glossy lobe.

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

The next example is a Cornell box with only diffuse materials, rendered with five strategies: uniform sampling, cosine-weighted sampling, light sampling alone, MIS of cosine-weighted and light sampling, and a "wrong" combination that picks one of the two at random without MIS weights.

Light sampling alone gives a wrong image, not just a noisy one. Much of the light in this scene is indirect, reflected diffusely between the walls, and a density that only generates directions towards the light source is zero for all of it. The [support condition](#the-monte-carlo-estimator), $p > 0$ wherever $f \neq 0$, is violated, so that light is missing from every sample.

Each strategy works in some situations and fails in others, so the natural step is to use several at once. The obvious way is to pick one density at random for each sample. With two densities $p_1$ and $p_2$ and a fair coin, the estimate is $\frac{f(X)}{p_1(X)}$ or $\frac{f(X)}{p_2(X)}$ with probability $\tfrac12$ each. With cosine-weighted sampling as $p_1$ and light sampling as $p_2$, this is the **wrong MIS** image below. This is biased: its expectation is $\tfrac12 I + \tfrac12\int_{p_2>0} f$, and light sampling misses all indirect light. The correct one-sample combination divides by the mixture density, $f(X)/(\tfrac12 p_1(X)+\tfrac12 p_2(X))$, which is exactly the balance heuristic below.

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


Multiple importance sampling provides the correct weights for such a combination.

### The Balance and Power Heuristics

Multiple importance sampling (MIS) addresses exactly this issue. This section follows Chapter 9 of Veach's thesis [[12]](#ref-12).

The basic idea is that, when estimating an integral, we should draw samples from multiple sampling distributions, chosen in the hope that at least one of them will match the shape of the integrand reasonably well, even if we do not know which one this will be. MIS then provides a method to weight the samples from each technique that can eliminate large variance spikes due to mismatches between the integrand's value and the sampling density.

**The multi-sample model.** We are given $n$ sampling techniques with densities $p_1, \ldots, p_n$, and take $n_i \ge 1$ independent samples $X_{i,1}, \ldots, X_{i,n_i}$ from each $p_i$. All that is assumed is that $f$ and every $p_i$ can be evaluated at any point, and that each $p_i$ can be sampled.

> **Definition - Multi-Sample Estimator**
>
> $$F = \sum_{i=1}^{n}\frac{1}{n_i}\sum_{j=1}^{n_i}w_i(X_{i, j})\, \frac{f(X_{i, j})}{p_i(X_{i, j})}$$
>
> where $w_i(x)$ is the weight given to a sample at $x$ that was drawn from technique $i$. With two techniques and one sample from each, $X \sim p_a$ and $Y \sim p_b$, this is
> $$w_a(X)\frac{f(X)}{p_a(X)} + w_b(Y)\frac{f(Y)}{p_b(Y)}.$$

The weights are functions of the sample position, not constants, and that is the whole point. The estimator is unbiased when they satisfy two conditions:

- **(W1)** $\sum_{i=1}^{n} w_i(x) = 1$ wherever $f(x) \neq 0$;
- **(W2)** $w_i(x) = 0$ wherever $p_i(x) = 0$.

*Proof.* Take the expectation; each of the $n_i$ samples from technique $i$ contributes the same integral, which cancels the $1/n_i$:

$$
\mathbb{E}[F] = \sum_{i=1}^{n} \frac{1}{n_i} \sum_{j=1}^{n_i} \int \frac{w_i(x)\, f(x)}{p_i(x)}\, p_i(x)\, \mathrm{d}x
= \int \sum_{i=1}^{n} w_i(x)\, f(x)\, \mathrm{d}x = \int f(x)\, \mathrm{d}x .
$$

A consequence of (W1) and (W2) together is that no single $p_i$ has to cover the whole domain. It is enough that at every point where $f \neq 0$ *some* technique has non-zero density. Light sampling alone fails the support condition in the Cornell box above; light sampling inside an MIS combination with BSDF sampling does not.

Familiar strategies are special cases. Constant weights $w_i = c_i$ give a plain weighted average of the individual estimators, whose variance $\sum_i c_i^2\, \mathbb{V}[F_i]$ is high as soon as any one technique is bad. Weights that are 1 in one region and 0 elsewhere partition the domain among the techniques, which is what a renderer does when it splits the directions into those that reach a light source, handled by light sampling, and the rest, handled by BSDF sampling.

**The balance heuristic.** Veach's choice of weights is

$$
\begin{equation}
\hat{w}_i(x) = \frac{n_i\, p_i(x)}{\sum_k n_k\, p_k(x)} .
\label{eq:balance}
\end{equation}
$$

Substituting it into the estimator shows what it does:

$$
\begin{equation}
\hat{F} = \sum_{i=1}^{n}\sum_{j=1}^{n_i} \frac{f(X_{i,j})}{\sum_k n_k\, p_k(X_{i,j})}
= \frac{1}{N} \sum_{i=1}^{n}\sum_{j=1}^{n_i} \frac{f(X_{i,j})}{\hat{p}(X_{i,j})},
\qquad
\hat{p}(x) = \sum_{k=1}^{n} c_k\, p_k(x),
\label{eq:balance-combined}
\end{equation}
$$

with $N = \sum_i n_i$ and $c_k = n_k/N$ the fraction of samples taken from technique $k$. The balance heuristic is the ordinary estimator $f/p$ with the **combined sample density** $\hat{p}$ in the denominator: every sample is divided by the density with which the whole group of samples, taken together, lands at that point, taking into account all the ways the sample could have been generated and not only the one that was used. A sample's contribution no longer depends on which technique produced it, which is the "balance" in the name. A sample drawn from $p_a$ where $p_a$ is tiny but $p_b$ is large is divided by the large value, so the spike $f/p_a$ never appears.

Using it requires one thing beyond ordinary importance sampling: for a sample generated by technique $i$, the densities $p_k$ of all the *other* techniques must be evaluated at that same point, **all with respect to the same measure**.

**How good is it?** The balance heuristic is not always optimal, but nothing can beat it by much:

> **Theorem (Veach 9.2).** Let $F$ be *any* unbiased estimator of the multi-sample form, and $\hat{F}$ the balance heuristic estimator with the same $f$, $n_i$ and $p_i$. Then
> $$\mathbb{V}[\hat{F}] \le \mathbb{V}[F] + \left( \frac{1}{\min_i n_i} - \frac{1}{\sum_i n_i} \right) \mu^2,$$
> where $\mu = \mathbb{E}[F]$ is the quantity being estimated.

The gap is additive and goes to zero as the sample counts grow, whereas a poor choice of weights can make the variance larger by an arbitrary factor. For two techniques with four samples each, the bound is $(1/4 - 1/8)\mu^2 = \mu^2/8$.

<blockquote style="margin: 1.5rem 0; padding: 0.8rem 1.2rem; border-left: 4px solid var(--site-link-color, #1565c0); background: var(--site-blockquote-bg, #f4f6fb); border-radius: 8px;">
<details>
<summary style="cursor: pointer;"><strong>Proof of Theorem 9.2 (Veach, Appendix 9.A)</strong></summary>

<div style="margin-top: 1rem;">

Let $F_{i,j} = w_i(X_{i,j}) f(X_{i,j}) / p_i(X_{i,j})$, with mean $\mu_i = \int w_i f\, \mathrm{d}\mu$, which does not depend on $j$. The samples are independent, so there are no covariance terms and

$$
\begin{aligned}
\mathbb{V}[F] &= \mathbb{V}\left[\sum_{i=1}^{n} \frac{1}{n_i} \sum_{j=1}^{n_i} F_{i,j}\right]
= \sum_{i=1}^{n} \frac{1}{n_i^2} \sum_{j=1}^{n_i} \mathbb{V}[F_{i,j}] \\
&= \left(\sum_{i=1}^{n} \frac{1}{n_i^2} \sum_{j=1}^{n_i} \mathbb{E}[F_{i,j}^2]\right) - \left(\sum_{i=1}^{n} \frac{1}{n_i^2} \sum_{j=1}^{n_i} \mathbb{E}[F_{i,j}]^2\right) \\
&= \left(\int \sum_{i=1}^{n} \frac{w_i^2(x)\, f^2(x)}{n_i\, p_i(x)}\, \mathrm{d}\mu(x)\right) - \left(\sum_{i=1}^{n} \frac{1}{n_i}\, \mu_i^2\right).
\end{aligned}
$$

The two brackets are bounded separately.

*First term.* It is minimized by minimizing the integrand at each point. With $f^2(x)$ fixed and $x$ dropped, minimize $\sum_i w_i^2/(n_i p_i)$ subject to $\sum_i w_i = 1$. Setting the derivatives of $\sum_i w_i^2/(n_i p_i) + \lambda(\sum_i w_i - 1)$ to zero gives $2 w_i / (n_i p_i) = -\lambda$, so $w_i \propto n_i p_i$, and with the constraint

$$
\hat{w}_i = \frac{n_i p_i}{\sum_k n_k p_k},
$$

the balance heuristic. No other weighting makes the first term smaller.

*Second term.* For any weights, $\sum_i \mu_i^2 / n_i$ lies between two bounds. Upper: since every $\mu_i \ge 0$,

$$
\sum_i \frac{\mu_i^2}{n_i} \le \frac{1}{\min_i n_i} \sum_i \mu_i^2 \le \frac{1}{\min_i n_i} \left(\sum_i \mu_i\right)^2 = \frac{\mu^2}{\min_i n_i} .
$$

Lower: minimizing $\sum_i \mu_i^2/n_i$ subject to $\sum_i \mu_i = \mu$ with a Lagrange multiplier gives $\mu_i = \mu\, n_i / \sum_k n_k$, and the minimum value $\mu^2 / \sum_k n_k$.

The balance heuristic has the smallest first term, and its second term can exceed that of any other estimator by at most $\big(1/\min_i n_i - 1/\sum_i n_i\big)\mu^2$, which is the theorem. $\blacksquare$

</div>
</details>
</blockquote>

**The power heuristic.** The additive gap matters in one common case: when one of the techniques is an almost perfect match for the integrand, so that the best possible variance is close to zero. The balance heuristic then adds visible noise, because good samples near the edge of their technique's region get weights noticeably below 1. The remedy is to sharpen the weights, pushing large ones towards 1 and small ones towards 0. Writing $q_i = n_i\, p_i$:

$$
\begin{equation}
\begin{aligned}
&\text{power:} && w_i = \frac{q_i^{\beta}}{\sum_k q_k^{\beta}}, \\[6pt]
&\text{cutoff:} && w_i =
\begin{cases}
0 & \text{if } q_i < \alpha\, q_{\max} \\
\dfrac{q_i}{\sum_k \lbrace q_k \mid q_k \ge \alpha\, q_{\max} \rbrace} & \text{otherwise.}
\end{cases}
\end{aligned}
\label{eq:power}
\end{equation}
$$

Veach found $\beta = 2$ to be a reasonable value, and this is the heuristic used in practice. $\beta = 1$ (or $\alpha = 0$) is the balance heuristic, and the other limit, $\beta = \infty$ (or $\alpha = 1$), is the **maximum heuristic**, which gives all the weight to the technique with the largest $q_i$ and so partitions the domain; it does not work as well in practice because it throws too many samples away. The power heuristic satisfies a bound of the same form as the theorem above, with a constant factor on $\mathbb{V}[F]$ that for $\beta = 2$ is $\tfrac{1}{2}(1 + \sqrt{n})$.

**The one-sample model.** A second model matters as much for path guiding. Instead of taking samples from every technique, choose *one* technique at random, with probabilities $c_1, \ldots, c_n$ that sum to one, and take a single sample from it:

$$
\begin{equation}
F = \frac{w_I(X_I)\, f(X_I)}{c_I\, p_I(X_I)},
\label{eq:one-sample}
\end{equation}
$$

where $I$ is the randomly chosen technique. For this model the balance heuristic is not merely good but optimal (Veach's Theorem 9.4: no other weighting has lower variance), and the estimator collapses to

$$
\begin{equation}
F = \frac{f(X)}{\sum_k c_k\, p_k(X)} .
\label{eq:one-sample-mixture}
\end{equation}
$$

This is plain importance sampling from the **mixture density** $\sum_k c_k p_k$. It describes a BSDF with diffuse, glossy and specular lobes that picks one lobe at random, and it is exactly how every guiding method in the second half is combined with BSDF sampling: sample the BSDF with probability $\alpha$ and the learned distribution otherwise, and divide by $\alpha\, p_{\text{bsdf}} + (1-\alpha)\, p_{\text{guide}}$. The "Wrong MIS" image above is what happens when the same random choice is made but each sample is divided only by its own density.

<blockquote style="margin: 1.5rem 0; padding: 0.8rem 1.2rem; border-left: 4px solid var(--site-link-color, #1565c0); background: var(--site-blockquote-bg, #f4f6fb); border-radius: 8px;">
<details>
<summary style="cursor: pointer;"><strong>Proof of Theorem 9.4 (Veach, Appendix 9.A)</strong></summary>

<div style="margin-top: 1rem;">

$\mathbb{V}[F] = \mathbb{E}[F^2] - \mathbb{E}[F]^2$, and $\mathbb{E}[F]^2 = \mu^2$ is the same for every unbiased estimator, so it is enough to show that the balance heuristic minimizes the second moment. Technique $i$ is chosen with probability $c_i$ and then samples from $p_i$, so

$$
\mathbb{E}[F^2] = \sum_{i=1}^{n} c_i \int \frac{w_i^2(x)\, f^2(x)}{c_i^2\, p_i^2(x)}\, p_i(x)\, \mathrm{d}\mu(x)
= \int \sum_{i=1}^{n} \frac{w_i^2(x)\, f^2(x)}{c_i\, p_i(x)}\, \mathrm{d}\mu(x) .
$$

Apart from $c_i$ in place of $n_i$, this is exactly the first term of the variance in the proof of Theorem 9.2, which the balance heuristic $w_i = c_i p_i / \sum_k c_k p_k$ minimizes pointwise. Unlike the multi-sample model there is no second term, so here the balance heuristic is optimal, not just close to it. $\blacksquare$

</div>
</details>
</blockquote>

**How many samples from each technique?** Less important than it seems. Veach shows that for a fixed total $N$, an estimator that takes an equal number of samples from each of the $n$ techniques and combines them with the balance heuristic satisfies $\mathbb{V}[\hat{F}] \le n\,\mathbb{V}[F] + \frac{n-1}{N}\mu^2$ against *any* allocation and weighting. Changing the allocation can gain at most a factor of $n$, whereas bad weights can lose an arbitrary amount. In the one-sample model the allocation is the selection probability, and learning it per shading point is what [PPG in production](#extension-3-learning-the-mis-selection-probability) and [NIS](#learned-selection-probabilities) do.

**Relation to classical techniques.** MIS generalizes importance sampling to several techniques, and it generalizes stratified sampling to strata that are allowed to overlap.

<iframe src="/interactive/mis.html" title="Multiple importance sampling" width="100%" height="516" frameborder="0"></iframe>


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

### Sampling the Lights: the Basics

[Next event estimation](#from-the-path-integral-to-the-path-tracer) needs a point on a light, and [MIS](#mis-in-a-path-tracer) needs the density of that choice in solid angle. This is how PBRT provides both [[2]](#ref-2) (Sections 6.2, 6.5, 12.1 and 12.6).

**What a light sample is.** At a receiving point, a light's `SampleLi` returns the radiance $L$ arriving from the light, the direction $\omega_i$ it arrives along, the point on the light it came from, and the density $p(\omega_i)$ of that direction, **measured with respect to solid angle at the receiving point**. Occlusion is not included; the shadow ray tests it separately. For a point or other delta light the density is defined as 1, and the sample gets no MIS weight, since BSDF sampling can never hit it.

Sampling is done in two steps, choosing a light $l$ with probability $P(l)$ and then a direction towards it with density $p(\omega \mid l)$, so the density used in the estimator and in the MIS weight is the product

$$
\begin{equation}
p_l(\omega) = P(l)\, p(\omega \mid l) .
\label{eq:ls-product}
\end{equation}
$$

When a BSDF-sampled ray happens to hit an emitter, the MIS weight needs this same density for that direction, which is why PBRT's path tracer asks the light sampler for $P(l)$ and the light for its solid-angle density at the hit.

**Sampling a point by area.** The general method picks a point uniformly on the light's surface, with density $1/A$, and converts it to solid angle with $\eqref{eq:pdf-A-to-sigma}$, $p(\omega) = p_A\, r^2 / \lvert\cos\theta_y\rvert$. It is always correct, but it ignores the $1/r^2$ factor and the parts of the light that cannot be seen at all, both of which vary over the light.

**Sampling a sphere by solid angle.** For a spherical light of radius $r$ centred at $\mathbf{p}_c$, seen from $\mathbf{p}$ at distance $d$, every visible point lies inside the cone of directions the sphere subtends ({{< figref "fig-sphere-cone" >}}),

$$
\begin{equation}
\begin{aligned}
\sin\theta_{\max} &= \frac{r}{\lVert \mathbf{p}_c - \mathbf{p} \rVert},
\qquad
p(\omega) = \frac{1}{2\pi\,(1 - \cos\theta_{\max})}, \\[4pt]
\cos\theta &= (\cos\theta_{\max} - 1)\, u_0 + 1,
\end{aligned}
\label{eq:ls-cone}
\end{equation}
$$

so directions are drawn uniformly inside that cone (with $\phi$ uniform around its axis), and the corresponding point on the sphere is then computed. No sample is wasted on the far side of the sphere. If $\mathbf{p}$ is inside the sphere there is no cone, and PBRT falls back to area sampling. (For a very small cone, it replaces $1 - \cos\theta_{\max}$ by $\tfrac{1}{2}\sin^2\theta_{\max}$ to avoid losing precision.)

{{< figure src="/images/path_tracing/sampling/sphere_cone.svg" id="fig-sphere-cone" caption="Sampling a spherical light from $\mathbf{p}$: every visible point lies inside the cone of half-angle $\theta_{\max}$, with $\sin\theta_{\max} = r/d$, and directions are drawn uniformly inside it." width="65%" >}}

**Sampling a triangle by solid angle.** Area sampling a triangle leaves the $1/\lVert \mathbf{p}' - \mathbf{p}\rVert^2$ factor unaccounted for, and it can vary a lot over a large or nearby triangle. PBRT therefore samples the **spherical triangle** the light projects to on the unit sphere around $\mathbf{p}$, uniformly in solid angle. When the receiving point has a normal, it first warps the two uniform numbers with a bilinear function of the cosines towards the three vertices, which approximately accounts for the $\lvert\cos\theta\rvert$ at the receiver too. For triangles subtending a very small or very large solid angle (outside $3 \times 10^{-4}$ to $6.22$ sr), it falls back to area sampling.

**Choosing among many lights.** A scene can have thousands of lights; evaluating all of them at every vertex is too expensive, so one is chosen at random and its contribution divided by its probability, $\sum_j f_j \approx f_l / P(l)$, which is unbiased as long as $P(l) > 0$ wherever $f_l \neq 0$.

- **Uniform:** $P(l) = 1/n$. Simple, and ignores everything about the scene.
- **By power:** $P(l) \propto \Phi_l$, the light's emitted power. On PBRT's *Zero Day* scene, with 8,878 lights, this lowers the MSE by a factor of 12.4 over uniform selection at 16 spp. Its weakness is that power says nothing about where a light is relative to the receiving point: a large, dim light far away, or facing away, gets as many samples as its power suggests, and seen from any one point a light can subtend at most a hemisphere.
- **By a light BVH:** lights are clustered in a bounding volume hierarchy, and each node stores bounds on its lights' positions, their total power and a cone bounding their emission directions. At a receiving point, a node's **importance** estimates its contribution from that information: power over squared distance, reduced by how far the emitters face away and by the cosine at the receiver, and zero if the receiver lies outside every emitter's cone. Traversal picks a child with probability proportional to its importance, and $P(l)$ is the product of the choices along the way. This is PBRT's default; on *Zero Day* it lowers the MSE by a further factor of 2.37 over power sampling.

### MIS in a Path Tracer

The standard use of MIS in a path tracer is on the direct-lighting term at every vertex: the two techniques are light sampling ([next event estimation](#from-the-path-integral-to-the-path-tracer)) and BSDF sampling, one sample each. This section follows PBRT, Section 13.4.

**Same measure.** The balance and power heuristics compare densities, so both must be densities over the same thing. BSDF sampling gives a density per unit solid angle, $p_b(\omega)$. Light sampling picks a point $y$ on the light per unit area, $p_A(y)$. Inverting $\eqref{eq:pdf-sigma-to-A}$ converts it to the solid-angle density of the direction $\omega$ from the shading point $x$ towards $y$:

$$
\begin{equation}
p_l(\omega) = p_A(y)\, \frac{\lVert x - y \rVert^2}{\lvert\cos\theta_y\rvert},
\label{eq:pdf-A-to-sigma}
\end{equation}
$$

with $\theta_y$ the angle between the light's normal at $y$ and the direction back to $x$. If one of several lights is chosen first with some probability, that probability multiplies $p_l$. In solid-angle measure the light-sampling estimate $\eqref{eq:nee}$ has the same shape as the BSDF-sampling one, $f_s L_e \lvert\cos\theta\rvert / p$.

**The estimator.** With one light sample $\omega_l$ and one BSDF sample $\omega_b$, the direct light scattered at $x$ towards $\omega_o$ is estimated by

$$
\begin{equation}
\frac{{\class{term-bsdf}{f_s(\omega_l)}}\; {\class{term-light}{L_e(\omega_l)}}\; \lvert\cos\theta_l\rvert\; V(\omega_l)}{p_l(\omega_l)}\; w_l(\omega_l)
\;+\;
\frac{{\class{term-bsdf}{f_s(\omega_b)}}\; {\class{term-light}{L_e(\omega_b)}}\; \lvert\cos\theta_b\rvert}{p_b(\omega_b)}\; w_b(\omega_b),
\label{eq:mis-direct}
\end{equation}
$$

where ${\class{term-light}{L_e(\omega)}}$ is the radiance emitted towards $x$ by whatever light lies in direction $\omega$, and with the power heuristic ($\beta = 2$, one sample each)

$$
w_l(\omega) = \frac{p_l(\omega)^2}{p_l(\omega)^2 + p_b(\omega)^2},
\qquad
w_b(\omega) = \frac{p_b(\omega)^2}{p_l(\omega)^2 + p_b(\omega)^2}.
$$

Each weight needs the *other* technique's density at the sampled direction. For the light sample that means evaluating the BSDF's density for $\omega_l$. For the BSDF sample it means asking, once the ray has hit an emitter, what density light sampling would have had for that same point.

The second term costs nothing extra: the BSDF sample is the ray the path continues along anyway. So the emission found at the next vertex is added with weight $w_b$, which is what replaces the "drop the emission to avoid double counting" rule.

**Special cases.**

- **Camera ray, and after a specular bounce.** No light sample was taken at the previous vertex (there is none before the camera ray, and a delta BSDF evaluates to zero for any light-sampled direction), so BSDF sampling is the only technique and the emission is added with weight 1.
- **Point and directional lights.** BSDF sampling can never hit a delta light, so light sampling is the only technique and its contribution is added with weight 1.

**The path tracer with next event estimation and MIS.** The loop below is the [loop formulation](#loop-formulation) with these additions, organized as in PBRT's path integrator. `p_b` carries the BSDF density of the previous bounce forward to the vertex where it is needed.

```markdown
function PATHTRACE_NEE_MIS(scene, ray):
    L ← 0                  # accumulated radiance
    β ← 1                  # throughput
    depth ← 0
    specular ← true        # no light sample precedes the camera ray
    p_b ← 0                # solid-angle density of the last BSDF sample

    loop:
        si ← INTERSECT(ray, scene)
        if not si.valid():
            break                              # an environment light is handled like Lₑ below

        # 1. Emission found by BSDF sampling (the w_b term)
        if si.is_emitter():
            if depth = 0 or specular:
                L ← L + β · si.Lₑ(-ray.d)
            else:
                p_l ← LIGHT_PDF(prev, si)      # light sampling's density for this hit, in solid angle from prev
                L ← L + β · W(p_b, p_l) · si.Lₑ(-ray.d)

        if depth ≥ max_depth:
            break
        depth ← depth + 1
        ωₒ ← -ray.d

        # 2. Next event estimation (the w_l term)
        if not si.bsdf.is_delta():
            (y, Lₑ, p_l) ← SAMPLE_LIGHT(si)    # p_l already converted to solid angle
            ωₗ ← direction from si.p to y
            if p_l > 0 and VISIBLE(si.p, y):
                f ← si.bsdf.eval(ωₒ, ωₗ) · |cos θₗ|
                if light is a delta light:
                    L ← L + β · f · Lₑ / p_l
                else:
                    L ← L + β · W(p_l, si.bsdf.pdf(ωₒ, ωₗ)) · f · Lₑ / p_l

        # 3. Continue the path by BSDF sampling
        (ωᵢ, fᵣ, p_b) ← BSDF_SAMPLE(si.bsdf, ωₒ)     # fᵣ includes |cos θᵢ|
        if p_b = 0:
            break
        β ← β · fᵣ / p_b
        specular ← (the sampled component is a delta)
        prev ← si
        ray ← RAY(si.p, ωᵢ)

        # 4. Russian roulette, as before
        if depth ≥ rr_depth:
            q ← min(1, max(β.r, β.g, β.b))
            if RAND() ≥ q:
                break
            β ← β / q

    return L

function W(p₁, p₂):                            # power heuristic, β = 2
    return p₁² / (p₁² + p₂²)
```

A guided path tracer changes one line of this: step 3 samples from the mixture of the BSDF and the learned distribution, and `p_b` becomes the mixture density of $\eqref{eq:one-sample-mixture}$, used both in the throughput and in the MIS weight against light sampling.

### Combining Multiple Paths
So far MIS has combined two ways of choosing the next direction. The [path integral formulation](#path-integral-formulation-of-light-transport) allows the same for whole paths: one path can be constructed by several techniques, each with its own density on path space, as the slides below show. The images are from the [CMU 15-468: Physically Based Rendering and Advanced Image Synthesis](https://graphics.cs.cmu.edu/courses/15-468/2024_spring) course [[18]](#ref-18).


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

Connecting every vertex of a camera subpath to every vertex of a light subpath uses all of these techniques together, and yields many paths from a few vertices ({{< figref "fig-all-paths" >}}).

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

Each technique $(s, t)$ joins a light subpath of $s$ vertices to a camera subpath of $t$ vertices and produces a path of length $k = s + t - 1$. For a given length there are $k + 2$ techniques ($s = 0, \ldots, k+1$), each with its own density on path space. For $k = 2$ the four are (Veach, Fig. 10.2): $(0, 3)$, path tracing with no special handling of light sources; $(1, 2)$, path tracing with a direct lighting calculation, i.e. next event estimation; $(2, 1)$, tracing particles from the light and connecting each hit to the camera; and $(3, 0)$, tracing particles until they happen to hit the lens. Bidirectional path tracing generates all of them from one pair of subpaths and combines them with MIS, which is possible only because the [path integral](#path-integral-formulation-of-light-transport) puts all their densities in one measure.

{{< 
figure src="/images/path_tracing/paths/combination.png"
id="fig-all-combinations"
caption="All combination of Paths (NEE + Path Tracing + Light Tracing)"
width="100%" 
>}}

Everything so far has treated the sampling distribution as something we *design*: cosine-weighted, BSDF-proportional, light-area-proportional, combined with MIS. Each of those is a fixed analytic guess at one factor of the integrand, chosen before any rendering happens, and none of them improves as the renderer learns about the scene.

But a path tracer generates an enormous amount of information about where the light actually is, since every path it traces is a measurement of ${\class{term-light}{L_i}}$, and then discards it. The rest of these notes is about methods that keep it.

## Advances in Importance Sampling

The sampling densities used so far were fixed in advance: BSDF sampling (including [VNDF sampling](#microfacet-models-the-basics) for microfacet materials) and light sampling, combined with MIS. The methods in this part instead **learn the density** from the samples generated during rendering, several of them with neural networks. The papers below trace how that idea developed.

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

The KAIST CS580 *Neural Rendering* course notes [[15]](#ref-15) cover several of these in lecture form. Many more methods exist, not all of them neural; the papers above span the development of the field from its foundations to recent work.

The sections below follow that chronology. A recurring question is worth keeping in view while reading them: **what exactly is being learned?** Every method here is trying to approximate some part of the numerator of the reflection estimator

$$
\langle {\class{term-light}{L_r}} \rangle = \frac{1}{N}\sum_{j=1}^{N}
\frac{{\class{term-light}{L(x, \boldsymbol{\omega}_j)}}\; {\class{term-bsdf}{f_s(x, \boldsymbol{\omega}_o, \boldsymbol{\omega}_j)}}\; \lvert\cos\theta_j\rvert}{p(\boldsymbol{\omega}_j \mid x, \boldsymbol{\omega}_o)},
$$

and they differ mainly in *which factor* they model and *how* they represent it. Methods that learn only <span class="term-light">incident radiance</span> must still combine with BSDF sampling through MIS; methods that learn the <span class="term-light">radiance</span>&#8239;&times;&#8239;<span class="term-bsdf">BSDF</span> product aim directly at the zero-variance ideal but face a harder fitting problem.


**Mapping the sphere to a square.** Several of the methods below store or learn a directional density over a 2D square rather than on the sphere itself, for example the quadtree of the [SD-tree](#path-guiding-with-sd-trees) and the [sphere-to-square mapping](#sphere-to-square-mapping) of distribution factorization. The widget shows common mappings between the two:

{{< 
fullscreen-iframe 
id="fig-sphere-mapping" 
src="/interactive/sphere_mapping.html" 
height="420" 
>}}


### Target Densities: What Should a Guiding Method Learn?

Every method below picks a **target density**: the function it tries to make its sampling density proportional to. The usual choice comes from the [zero-variance argument](#the-optimal-choice): sample the next direction in proportion to incident radiance (radiance-based guiding), or to its product with the BSDF and cosine (product guiding). That argument assumes the integrand is known exactly. In a path tracer it is not: the ${\class{term-light}{L_i}}$ in the integrand is itself estimated by the rest of the random walk, and many later decisions are not guided at all (the reflect-or-refract choice on glass, the light picked for next event estimation, Russian roulette). Rath et al. [[27]](#ref-27) derive the target that minimizes the variance under these conditions. This section follows their derivation.

**A nested estimator.** Take the simplest case, the irradiance at a point, $E(\mathbf{x}) = \int {\class{term-light}{L_i(\mathbf{x}, \omega)}}\, \lvert\cos\theta\rvert\, \mathrm{d}\omega$. A path tracer estimates it with one sampled direction and a *nested* estimate $\hat L_i$ of the radiance arriving from that direction, obtained by continuing the path:

$$
\begin{equation}
\hat E = \frac{\hat L_i(\omega)\, \lvert\cos\theta\rvert}{p(\omega)}, \qquad \omega \sim p, \qquad \mathbb{E}\big[\hat L_i(\omega)\big] = {\class{term-light}{L_i(\omega)}} .
\label{eq:td-nested}
\end{equation}
$$

The estimate is unbiased for any valid $p$. Its variance is $\mathbb{E}[\hat E^2] - E^2$, and only the second moment depends on $p$. Averaging first over the nested estimate for a fixed $\omega$, then over $\omega$:

$$
\begin{equation}
\mathbb{E}\big[\hat E^2\big] = \int \frac{\mathbb{E}\big[\hat L_i(\omega)^2\big]\, \cos^2\theta}{p(\omega)}\, \mathrm{d}\omega,
\qquad
\mathbb{E}\big[\hat L_i^2\big] = {\class{term-light}{L_i^2}} + \mathbb{V}\big[\hat L_i\big].
\label{eq:td-second-moment}
\end{equation}
$$

**The optimal density.** Write $g(\omega) = \lvert\cos\theta\rvert \sqrt{\mathbb{E}[\hat L_i(\omega)^2]}$. For any density $p$, the Cauchy–Schwarz inequality gives

$$
\left(\int g\, \mathrm{d}\omega\right)^2 = \left(\int \frac{g}{\sqrt{p}}\, \sqrt{p}\; \mathrm{d}\omega\right)^2 \le \int \frac{g^2}{p}\, \mathrm{d}\omega \cdot \int p\, \mathrm{d}\omega = \mathbb{E}\big[\hat E^2\big],
$$

with equality exactly when $g/\sqrt{p}$ is proportional to $\sqrt{p}$, that is, when $p \propto g$. (Rath et al. reach the same minimizer with a Lagrange multiplier.) So

$$
\begin{equation}
\begin{aligned}
p^\star(\omega) &\propto \lvert\cos\theta\rvert\, \sqrt{\mathbb{E}\big[\hat L_i(\omega)^2\big]} = \lvert\cos\theta\rvert \sqrt{ {\class{term-light}{L_i(\omega)^2}} + \mathbb{V}\big[\hat L_i(\omega)\big] }, \\[4pt]
\mathbb{V}^\star\big[\hat E\big] &= \left(\int g\, \mathrm{d}\omega\right)^2 - E^2 .
\end{aligned}
\label{eq:td-optimal}
\end{equation}
$$

Three things follow.

1. If the nested estimate has no variance, $p^\star \propto {\class{term-light}{L_i}}\lvert\cos\theta\rvert$: the usual radiance-based target, and $\mathbb{V}^\star = 0$. The zero-variance target is the special case of a noise-free nested estimate.
2. Otherwise the optimal density sends **more samples where the nested estimate is noisy**, not only where the radiance is large. A direction that returns little light on average but returns it very unreliably (for example the reflection of a light in glass, reached only when an unguided Fresnel choice happens to reflect) deserves more samples than its mean suggests.
3. Even the optimal local density leaves $\mathbb{V}^\star > 0$ whenever $\mathbb{V}[\hat L_i] > 0$: $\int g \ge E$, with equality only if the nested variance vanishes almost everywhere. Guiding one decision cannot remove variance that comes from later ones. Zero variance for a whole path needs every decision along it to be perfect, which is why guiding directions alone has a ceiling.

**Including the BSDF without learning it.** For reflected radiance the integrand also contains the BSDF, which depends on the outgoing direction $\omega_o$. Product guiding learns a density conditioned on $(\mathbf{x}, \omega_o)$; radiance-based guiding drops the BSDF. Rath et al. instead learn a density conditioned only on $\mathbf{x}$, and choose it to minimize the second moment *averaged over the outgoing directions* that occur. The same steps, with $g^2$ now $\mathbb{E}_{\omega_o}\big[{\class{term-bsdf}{f_s}}(\omega, \omega_o)^2\big]\, \mathbb{E}[\hat L_i(\omega)^2]\cos^2\theta$ (the nested estimate does not depend on $\omega_o$), give

$$
\begin{equation}
p(\omega \mid \mathbf{x}) \propto \lvert\cos\theta\rvert\, \sqrt{\mathbb{E}_{\omega_o}\big[{\class{term-bsdf}{f_s(\mathbf{x}, \omega, \omega_o)^2}}\big]\; \mathbb{E}\big[\hat L_i(\mathbf{x}, \omega)^2\big]} .
\label{eq:td-marginal}
\end{equation}
$$

On a diffuse surface the BSDF factor is constant and this reduces to $\eqref{eq:td-optimal}$. On a glossy surface it moves samples towards the directions the BSDF reflects strongly for the outgoing directions that actually occur, while still storing only one directional density per location.

**Caches shared by many points.** Guiding densities are stored per spatial cell $S$ (a leaf of the [SD-tree](#path-guiding-with-sd-trees), for example), not per point. Minimizing the second moment averaged over the points of the cell gives

$$
\begin{equation}
p(\omega \mid S) \propto \sqrt{\mathbb{E}_{\mathbf{x} \in S}\Big[\mathbb{E}_{\omega_o}\big[{\class{term-bsdf}{f_s^2}}\big]\, \mathbb{E}\big[\hat L_i^2\big] \cos^2\theta\Big]} ,
\label{eq:td-cache}
\end{equation}
$$

with the square root taken *after* averaging over the cell. Averaging the radiance itself, as the radiance-based target does, gives an almost-zero density to a direction that matters to only a few points of the cell (near the cell boundary, for example), and those points then get rare samples with huge weights. The square root raises small averages, so such directions keep a reasonable density; Rath et al. show it removes the outliers that appear along cell boundaries.

**Weighting by the image.** A point only matters through the pixels it contributes to. If $\bar{x}$ is the camera path that reached $\mathbf{x}$, its contribution to the pixel is scaled by the path's throughput, and minimizing the error of the pixel rather than of the local estimate multiplies each squared term inside the average by $\big(f_{px}(\bar x) / (p(\bar x)\, \tilde I_{px})\big)^2$: the camera-path throughput over its sampling density, divided by an approximate pixel value $\tilde I_{px}$. Dividing by $\tilde I_{px}$ minimizes the relative MSE instead of the MSE, so dark pixels count as much as bright ones (the [error metrics](#measuring-error-and-efficiency) section explains why that is the usual choice). $\tilde I_{px}$ comes from a filtered image of the previous training iteration, the same estimate that [adjoint-driven Russian roulette](#other-production-details) uses.

**Inside an MIS combination.** A guiding density is used in a [one-sample MIS](#the-balance-and-power-heuristics) mixture with BSDF sampling, so it does not need to cover directions that BSDF sampling already handles well, such as the glossy reflection of a bright sky. Treating the MIS weight $w_g$ of the guided technique as fixed (it changes slowly between training iterations), the target becomes the MIS-weighted part of the integrand, with $w_g^2$ multiplying the squared terms above. The selection probability $\alpha$ between BSDF and guiding is likewise optimized with each sample weighted by its pixel contribution, and the paper recommends keeping $\alpha \ge 0.1$, so that a badly fitted guiding density is never the only technique.

**In an implementation.** For a piecewise-constant density such as a quadtree, with leaves $D_k$ of solid angle $\lvert D_k\rvert$ and leaf probabilities $\pi_k$, the density in leaf $k$ is $\pi_k / \lvert D_k\rvert$, and the second moment becomes $\sum_k \lvert D_k\rvert \int_{D_k} g^2\, \mathrm{d}\omega / \pi_k$. The same Cauchy–Schwarz step over the discrete $\pi_k$ gives

$$
\begin{equation}
\pi_k \propto \sqrt{\lvert D_k\rvert \int_{D_k} g^2\, \mathrm{d}\omega} .
\label{eq:td-leaf}
\end{equation}
$$

So the change to PPG is small: instead of splatting the radiance estimate $\hat L_i$ into the tree, splat the *squared* sample weight $g^2 / p$ (BSDF times cosine times $\hat L_i$, times the MIS weight and the relative pixel throughput, all squared, divided by the sampling density), then multiply each leaf by its size and take the square root before normalizing. There is no extra cost and no new parameter. At equal time, Rath et al. report the relMSE of PPG dropping from 0.149 to 0.084 on the Veach Door scene and from 0.076 to 0.041 on a glossy kitchen (1.8× in both).

**Reading the methods below with this in mind.** The radiance-based methods (PPG, the radiance variants of SDMM and NPM, the irradiance field of VXPG) learn $\mathbb{E}[\hat L_i]$ and drop the BSDF. The product methods (NIS, NASG, the product variant of NPM, warp composition, distribution factorization) learn the noise-free product ${\class{term-bsdf}{f_s}}{\class{term-light}{L_i}}\lvert\cos\theta\rvert$. Neither accounts for the variance of the nested estimate. The training loss decides which target a learned density actually converges to when its training targets are noisy Monte Carlo estimates $\hat f$ of the integrand. The [KL loss](#minimizing-kl-divergence) enters $\hat f$ linearly, so its expectation is the KL loss for the mean $f$, and its minimizer is $q \propto f$, whatever the noise. The [χ² (variance) loss](#minimizing-variance-χ-divergence) enters $\hat f$ squared, so its expectation is $\int \mathbb{E}[\hat f^2]/q$, minimized by $q \propto \sqrt{\mathbb{E}[\hat f^2]}$: the variance-aware target of $\eqref{eq:td-optimal}$.

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

{{< fullscreen-iframe id="ppg-splatting" src="/interactive/ppg_filtered_splatting.html" height="562" >}}

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

Neural Importance Sampling (NIS) [[6]](#ref-6) uses neural networks to generate the samples of a Monte Carlo estimator. It builds on Non-linear Independent Components Estimation (NICE) [[19]](#ref-19), a normalizing flow, and extends it with new coupling transforms and with training objectives designed for integration. The aim is a sampling density $q(x;\theta)$, with trainable parameters $\theta$, that follows the integrand closely.

The setting is the [Monte Carlo estimator](#the-monte-carlo-estimator) $\eqref{eq:mc-estimator}$, written in the paper's notation for an integral $F = \int_D f(x)\, \mathrm{d}x$:

$$
F \approx \langle F \rangle_N = \frac{1}{N} \sum_{i=1}^{N} \frac{f(X_i)}{q(X_i;\theta)}, \qquad X_i \sim q(x;\theta) .
$$

Its variance depends on how closely $q$ matches the normalized integrand $p(x) \equiv f(x)/F$, and it is zero when the two are equal.

#### Normalizing Flows and NICE

A **normalizing flow** represents a density through a deterministic, bijective map $x = h(z;\theta)$ from a latent variable $z$ with a simple density $q(z)$, uniform or Gaussian, to the variable of interest. The density of $x$ follows from the [change of variables](#transforming-between-distributions) $\eqref{eq:pdf-transform}$:

$$
q(x;\theta) = q(z) \left|\det\left(\frac{\partial h(z;\theta)}{\partial z^T}\right)\right|^{-1} ,
$$

where the inverse Jacobian determinant accounts for how the map stretches or compresses the density.

Monte Carlo integration needs both to draw a sample and to evaluate the density of any given point, so three things are required of $h$: its inverse $z = h^{-1}(x)$ must be tractable, both $h$ and $h^{-1}$ must be fast to evaluate, and the Jacobian determinant must be cheap to compute. NICE meets all three with **coupling layers** ({{< figref "fig-coupling-layer" >}}), whose Jacobian matrices are triangular, so that the determinant is the product of the diagonal terms.

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

Each coupling layer has its own network $m$, a **U-shaped network of fully connected layers**. Its input is the one-blob encoding of the dimensions in partition $A$, together with any additional features such as position and normal. The network has 8 fully connected layers with ReLU activations, plus 2 layers that adapt the input and output dimensionality to and from 256, so 10 layers per coupling layer. The outermost layers have 256 neurons, and the width is halved at each nesting level. The output layer produces the parameters of the coupling transform: $Q$, or $W$ and $V$.

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

The integration domain is 2D, the full sphere of directions in world-space cylindrical coordinates, so partitions $A$ and $B$ each contain one of the two coordinates. A direction is generated by drawing a uniform pair $u \in [0,1]^2$, passing it through the inverted coupling layers, $h_1^{-1}(\cdots h_L^{-1}(u))$, and converting the resulting cylindrical coordinates to a direction $\omega$.

The network $m$ of each coupling layer receives the cylindrical coordinate in partition $A$ (one-blob encoded, $k=32$) and the quantities the density is conditioned on: the surface position $x$ (normalized and one-blob encoded per dimension, $3k$ values), the outgoing direction $\omega_o$ (cylindrical coordinates, one-blob encoded, $2k$ values) and the surface normal $\mathbf{n}(x)$ (one-blob encoded). Further features can be appended in the same way.

##### MIS-Aware Optimization

When combining the learned distribution $q$ with existing techniques (e.g., BSDF sampling) using multiple importance sampling (MIS), the effective PDF becomes:

$$
q'(\omega) = c \cdot q(\omega) + (1-c) \cdot p_{f_s}(\omega)
$$

where $c$ is the selection probability. The networks are optimized with respect to $q'$ instead of $q$, minimizing $D(p \| q')$ where $D$ is either KL or χ² divergence.

##### Learned Selection Probabilities

An additional network $\hat{m}$ learns approximately optimal selection probability $c = \ell(\hat{m}(x,\omega_o))$, where $\ell$ is the logistic function. This network is optimized jointly with the coupling layer networks using the same architecture except for the output layer.

#### Training Procedure

Training happens online, interleaved with rendering. Samples are drawn with the current network parameters, the integrand $f(x)$ is evaluated at them, a stochastic gradient of the KL or $\chi^2$ loss is computed from those values, and Adam updates the network weights; the next samples are drawn from the updated networks.

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

The **von Mises–Fisher (vMF) distribution** is an isotropic probability distribution on the unit sphere $\mathbb{S}^{D-1}$, the analogue of a Gaussian in $\mathbb{R}^D$. It has two parameters, a mean direction $\mu \in \mathbb{S}^{D-1}$ and a concentration $\kappa \in [0,\infty)$. (The concentration is written $\kappa$ in the path-guiding literature and $\tau$ by Straub [[22]](#ref-22), whose figures are used below; the two denote the same parameter.) Its density for a direction $\omega$ is

$$
v(\omega \mid \mu,\kappa)= C_D(\kappa)\,\exp(\kappa\,\mu^\top \omega),
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

A single lobe cannot represent light arriving from several directions, so NPM predicts a **mixture** of $K$ vMF lobes:

$$
V(\omega \mid \Theta)=
\sum_{k=1}^K
\lambda_k \,
v(\omega\mid\mu_k,\kappa_k),
\qquad
\Theta = \{ (\lambda_k,\mu_k,\kappa_k) \}_{k=1}^K .
$$

Each lobe has a mean direction $\mu_k \in \mathbb{S}^2$, a concentration $\kappa_k \in [0,\infty)$ and a weight $\lambda_k \in [0,1]$, and the weights sum to one. The widget below shows such a mixture and how its parameters shape it.

{{< figure src="/images/path_tracing/npm/vmf_mixture.png"
caption="vMF Mixture with $K=3$ components" 
width="60%" >}}

<iframe src="/interactive/vmf.html" title="von Mises-Fisher mixture" width="100%" height="395" frameborder="0"></iframe>


#### Radiance-Based NPM

In its basic form, NPM makes the mixture at each position proportional to the incident radiance there:

$$
V(\omega_i\mid\Theta(x))
\propto
{\class{term-light}{L_i(x,\omega_i)}}.
$$

Earlier guiding methods store one distribution per cell of a spatial subdivision such as a kd-tree or an octree. All positions inside a cell then share a distribution that was fitted to samples scattered over the whole cell, which causes **parallax error**: the direction towards a nearby light differs from one end of the cell to the other, but the shared distribution cannot follow it.

{{< figure src="/images/path_tracing/npm/parallax.svg"
caption="Parallax issue caused by spatial discretizations (a). For a subdivided volume $\mathcal{S}(x)$ in (a), the guiding distribution is marginalized with training samples scattered over the volume $\mathcal{S}(x)$, and is shared by different positions (e.g., $x_1$ and $x_2$). NPM does not suffer from parallax because it implicitly represents a monolithic function, continuously mapping from spatial positions to parametric guiding distributions, as shown in (b). (Image by Dong et al. [[8]](#ref-8))" width="100%" >}}

NPM avoids the subdivision altogether. It learns a single **continuous function** from a position to the parameters of the mixture at that position,

$$
\mathrm{NPM}(x\mid\Phi)=\hat{\Theta}(x),
$$

where $\Phi$ collects all trainable parameters: those of a spatial embedding and those of an MLP, described next.

#### Multi-resolution Spatial Embedding

A single MLP struggles to represent high-frequency spatial variation. NPM therefore first encodes the position with a learnable **multi-resolution grid**: $L$ grids of exponentially increasing resolution, each storing a trainable feature vector $\mathbf{v}\in\mathbb{R}^F$ at every grid vertex.

To query a position $x$, the eight grid features $V_\ell[x]$ surrounding it are gathered at each level $\ell$ and interpolated trilinearly, and the results of all levels are concatenated into the spatial embedding

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

A lightweight MLP with parameters $\Phi_M$ turns the embedding into the mixture parameters. Its raw outputs $(\lambda'_k,\kappa'_k,\theta'_k,\phi'_k)$ are unconstrained, so each is mapped into its valid range by an activation:

| Parameter | Domain | Activation | Mapping |
|----------|--------|------------|---------|
| $\kappa_k$ | $[0,\infty)$ | Exponential | $\kappa_k=\exp(\kappa'_k)$ |
| $\lambda_k$ | $[0,1]$ | Softmax | $\lambda_k=\frac{\exp(\lambda'_k)}{\sum_j\exp(\lambda'_j)}$ |
| $\theta_k,\phi_k$ (spherical coords of $\mu_k$) | $[0,1]$ | Logistic | $\theta_k=\frac1{1+\exp(-\theta'_k)}$ |

The mean directions are then obtained from the normalized spherical coordinates. (The paper only states that $(\theta_k,\phi_k)$ are the normalized spherical coordinates of $\mu_k$; the explicit formula below is the natural reading.)

$$
\mu_k = \bigl(
\sin(\pi\theta_k)\cos(2\pi\phi_k),\,
\sin(\pi\theta_k)\sin(2\pi\phi_k),\,
\cos(\pi\theta_k)
\bigr).
$$

{{< figure src="/images/path_tracing/npm/decoding_parameters.svg"
caption="Decoding the parameters $\Theta$ of the vMF mixture $\mathcal{V}(\omega_i \mid \Theta)$ with $K$ components from the MLP output, giving the learned parametric mixture used to importance sample the scattering direction. (Detail of the NPM overview figure above; image by Dong et al. [[8]](#ref-8))"
width="100%" >}}


#### Loss: KL Divergence

The embedding and the MLP are trained together to minimize the KL divergence between the target distribution $D(\omega)\propto {\class{term-light}{L_i(x,\omega)}}$ and the decoded mixture:

$$
D_{KL}(D\|V)
=\int D(\omega)
\log\frac{D(\omega)}{V(\omega\mid\hat{\Theta})}\,d\omega.
$$

With directions $\omega_j$ drawn from a density $p$, the divergence and its gradient with respect to the mixture parameters are estimated by

$$
D_{KL}\approx
\frac1N\sum_j
\frac{D(\omega_j)}{p(\omega_j)}
\log\frac{D(\omega_j)}{V(\omega_j)},
\qquad
\nabla_\Theta D_{KL}\approx
-\frac1N\sum_j
\frac{D(\omega_j)\,\nabla_\Theta V(\omega_j)}{p(\omega_j)V(\omega_j)} .
$$

The gradient is back-propagated through the activations, the MLP and the grid interpolation, all of which are differentiable. Since one set of parameters serves every position, the objective is the divergence averaged over positions:

$$
\Phi^*=\arg\min_\Phi
\mathbb{E}_x[D_{KL}(D(x)\|V;\Theta(x))].
$$


#### Product Distribution for Importance Sampling

On surfaces, the guiding distribution benefits from following the BSDF as well as the incident radiance. **NPM-product** therefore adds the outgoing direction as an input, $\mathrm{NPM}_\Phi : (\mathbf{x},\omega_o) \mapsto \hat{\Theta}(\mathbf{x},\omega_o)$, and trains the decoded mixture directly against the **full integrand**:

$$
\mathcal{V}(\omega_i \mid \hat{\Theta}(x,\omega_o))
\;\propto\;
{\class{term-bsdf}{f_s(x,\omega_o,\omega_i)}}\,
{\class{term-light}{L_i(x,\omega_i)}}\,
|\cos\theta_i| .
$$

The MLP then receives the spatial embedding together with the auxiliary inputs. The outgoing direction $\omega_o$ and the surface normal $n$ are encoded with a spherical-harmonics basis (as in Ref-NeRF), and the roughness $r$ is appended:

$$
\hat{\Theta}(x,\omega_o)=
\mathrm{MLP}\big(G(x\mid\Phi_E)\oplus \mathrm{SH}(\omega_o)\oplus \mathrm{SH}(n)\oplus r \mid\Phi_M\big) .
$$

NPM-radiance omits $\omega_o$. No precomputed BSDF mixture is multiplied in: the BSDF and cosine factors are learned by the network itself. The gain in accuracy comes at a modest cost, roughly 10–20% longer render time than NPM-radiance in the paper's timing table. During rendering, directions are drawn from a 50/50 mixture of BSDF sampling and $\mathcal{V}$.


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

**Extensions.** Several established path-guiding extensions are noted as straightforward to integrate and promising: the **BSDF selection probability** could be learned by the network or by a caching strategy, better handling near-specular surfaces; and the **variance-aware target distribution** of Rath et al. [[27]](#ref-27) (see [Target Densities](#target-densities-what-should-a-guiding-method-learn)) could be learned to account for the variance within noisy MC estimates.

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
\exp\!\left( 2\lambda\, t^{\,1 + s} - 2\lambda \right) t^{\,s} & \text{if } v \neq \pm z \\[1ex]
1 & \text{if } v = z \\[1ex]
0 & \text{if } v = -z,
\end{cases}
\label{eq:nasg}
\end{equation}
$$

with the shorthand

$$
t = \frac{v \cdot z + 1}{2},
\qquad
s = \frac{a (v \cdot x)^2}{1 - (v \cdot z)^2},
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

Neural product importance sampling [[9]](#ref-9) targets one specific integrand: direct lighting from a distant environment map. The ideal density is proportional to a *product* of two functions,

$$
p^*(\omega) \propto L(\omega)\, {\class{term-bsdf}{f_r(\omega_o,\omega)}}\,\cos\theta ,
$$

where $L(\omega)$ is the unshadowed radiance of the environment map, ${\class{term-bsdf}{f_r(\omega_o,\omega)}}$ is the BRDF and $\cos\theta = n \cdot \omega$. Such a product is often highly multi-modal, has a high dynamic range and changes with the material, so an MIS mixture of light sampling and BSDF sampling fits it poorly.

The method learns a sampler for the product as a **composition of two warps** ({{< figref "fig-warp-overview" >}}). The **tail warp** is an *unconditional* neural flow that represents the environment map. The **head warp** is a small *conditional* neural spline flow that maps uniform samples to an intermediate density $p_Y(y \mid c)$, chosen so that the result after the tail warp is proportional to the product. It is not a fit to the material factor alone. The decomposition reduces the complexity of what has to be learned: the tail warp embeds the structure of the lighting once, and the head warp learns a much smoother intermediate density, which the tail warp then turns into the product.

{{<
figure src="/images/path_tracing/warp_composition/overview.svg"
noinvert="true"
id="fig-warp-overview"
caption="Given a shading condition, the model maps uniform points through two warps to produce samples distributed approximately proportionally to a target product density. The shape of the intermediate density is coarse, similarly to a naive product fit (see the first figure of this section), but leads to a precise fit when mapped through the tail warp. (Image by Litalien et al. [[9]](#ref-9))"
width="100%"
>}}


#### Decomposing the Product: $p_1$ and $p_2$

The product is separated into an emitter-driven factor, which depends only on the environment map, and a material-driven factor, which depends on the **shading condition** $c = (\omega_o, n, \text{material parameters})$:

$$
p_1(\omega) \propto L(\omega),
\qquad
p_2(\omega \mid c)
\propto {\class{term-bsdf}{f_r(\omega_o,\omega)}}\,\cos\theta,
\qquad
p^*(\omega \mid c) \propto p_1(\omega)\, p_2(\omega \mid c).
$$

The two factors are difficult in different ways. $p_1$ is the *unshadowed* distant environment map and carries its high-frequency, high-dynamic-range detail (very peaked suns are a known failure case, see Limitations). Visibility is not modelled: the sampler targets the unshadowed product. $p_2$ contains the smooth shaping of the BRDF, which varies with roughness and towards grazing angles. A single normalizing flow struggles to learn the detail of the first and the conditioning of the second at once, which is the reason for separating them.


#### Neural Warp Composition

The goal is a sampler $\omega = T_\Phi(u, c)$, with $u \sim \text{Uniform}[0,1]^2$, whose induced density $p_\Phi(\omega \mid c)$ matches $p^*(\omega \mid c)$. It is the composition ({{< figref "fig-architecture" >}})

$$
T_\Phi = T_{\text{tail}} \circ T_{\text{head}},
$$

of the conditional head warp $T_{\text{head}} = h_\theta$ and the unconditional tail warp $T_{\text{tail}} = C$. A sample is generated in four steps: draw $u \sim \text{Uniform}[0,1]^2$, compute $y = h_\theta(u \mid c)$, compute $x = C(y)$, and map $x \in [0,1]^2$ to a direction $\omega \in \mathbb{S}^2$ with the lat-long parameterization.

{{<
figure src="/images/path_tracing/warp_composition/warp.svg"
id="fig-architecture"
noinvert="true"
caption="Given a <span style=\"color:#c44e52\">shading condition $\mathbf{c}$</span> (view direction $\omega_o$, surface normal $\mathbf{n}$ and material descriptor $\rho$), a <span style=\"color:#55a868\">conditioner encoder</span> first produces a latent vector $\xi$. The vectors $\mathbf{c}$ and $\xi$ condition two <span style=\"color:#8172b3\">coupling layers</span>, each warping samples via a circular piecewise rational quadratic (RQ) spline whose parameters (i.e., knot positions and derivatives) are inferred by a <span style=\"color:#4c72b0\">spline network</span>. The output $y = (y_0, y_1)$ is then passed through the tail warp to produce the final sample $x$ which is converted to a direction $\omega$ via lat-long mapping. (Image by Litalien et al. [[9]](#ref-9))"
width="80%"
>}}


#### Head Warp - Conditional Neural Spline Flow
The head warp learns the intermediate density that, composed with the fixed emitter warp, reproduces the product $p_1 \cdot p_2$. The paper stresses that this differs from fitting $p_2$ directly, which would not yield the correct product distribution.

{{<
figure src="/images/path_tracing/warp_composition/head_warp.png"
id="fig-head-warp"
caption="Toy example: the simple conditioned density $p_2(\cdot \mid \mu)$, a Gaussian with parameterized mean $\mu$, standing in for the material factor. (Detail of the naive-fit figure at the start of this section; image by Litalien et al. [[9]](#ref-9))"
width="50%"
>}}

It is conditioned on the shading condition $c = (\omega_o, n, \text{material parameters})$, which an optional conditioner encoder converts into a latent vector $\xi$. The warp $y = h_\theta(u \mid c)$, $u \in [0,1]^2$, consists of two coupling layers, each a **circular rational-quadratic spline** whose parameters are predicted, per layer, from the concatenation $(c, \xi)$ and the pass-through coordinate. The head warp is intentionally compact, because the intermediate density it has to learn is much smoother than the product.


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

The tail warp is a large normalizing flow, trained **once per environment map**, that encodes the detail of the lighting: spikes, sharp regions and multiple lobes. For rendering it is precomputed into a **high-resolution lookup**, which gives constant-time forward evaluation and a stable Jacobian, with no conditioning.


#### Final Product Sampler

For the composed map $T(u,c) = C(h_\theta(u\mid c))$, the change of variables is applied once per warp, and the induced density is

$$
p_\Phi(x \mid c)=
\left|
\det J_{h_\theta}(u \mid c)
\right|^{-1}
\left|
\det J_C(y)
\right|^{-1},
\qquad y = h_\theta(u \mid c),
$$

where $J_{h_\theta}$ and $J_C$ are the Jacobians of the head and tail flows. Together they approximate the ideal product $p^*(\omega \mid c) \propto p_1(\omega)\, p_2(\omega\mid c)$.

This density lives on the unit square $\mathcal{X}$, where the KL training is done; the paper omits the final lat-long warp. For use in a renderer (in the estimator and in MIS weights), the solid-angle density additionally needs the lat-long Jacobian. For the standard parameterization $x = (\phi/2\pi,\ \theta/\pi)$ this gives $p_\Phi(\omega \mid c) = p_\Phi(x \mid c)/(2\pi^2\sin\theta)$.

{{<
figure src="/images/path_tracing/warp_composition/product_warp.png"
id="fig-product-warp"
caption="Toy example: the target product $p_1 \cdot p_2$ that the composed mapping $T = C \circ h_\theta$ is trained to reproduce. (Detail of the naive-fit figure at the start of this section; image by Litalien et al. [[9]](#ref-9))"
width="50%"
>}}


#### Training Objective - Forward KL

The head warp is trained, with the tail warp fixed, by minimizing the **forward KL divergence**

$$
\begin{aligned}
\mathcal{L}_{\mathrm{KL}}(\theta) &=
D_{\mathrm{KL}}\!\left(p^* \,\|\, p_\Phi\right)=
-\mathbb{E}_{x\sim p^*}
\Big[
\log p_\Phi(x \mid c)
\Big]+ \text{const}, \\
\log p_\Phi(x \mid c) &= -\log \left| \det J_{h_\theta} \right|-\log \left| \det J_C \right| ,
\end{aligned}
$$

where the second expression is the change of variables above.

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

Distribution factorization [[10]](#ref-10) returns to the question of how the guiding distribution is represented. Like the other product methods, it aims at the **target distribution**

$$
p^*(\boldsymbol{\omega} \mid \mathbf{x}) \propto {\class{term-bsdf}{f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega})}} \, {\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega})}} \, \lvert\cos\theta\rvert,
$$

where $\boldsymbol{\omega}$ is the incoming direction, $\boldsymbol{\omega}_o$ is the outgoing direction, ${\class{term-bsdf}{f_s}}$ is the BSDF, and $\theta$ is the angle between $\boldsymbol{\omega}$ and the shading normal.

Learning this distribution directly on the sphere is difficult. It varies from point to point in the scene, and it may be multi-modal and high-frequency. The existing neural representations are either expressive but slow to sample and evaluate (the normalizing flows of NIS) or fast but limited in expressiveness (vMF and NASG mixtures), and having a network predict a full $M_1 \times M_2$ grid of densities directly would be expensive.

**Distribution factorization** addresses these by factorizing the directional PDF into a marginal and a conditional distribution, each one-dimensional, defined on a square domain ({{< figref "fig-df-overview" >}}).


#### Sphere-to-Square Mapping

The incoming direction $\boldsymbol{\omega}$, over the full sphere, is mapped to coordinates $(\epsilon_1, \epsilon_2) \in [0,1]^2$ on a square: a normalized azimuth and a polar coordinate,

$$
\epsilon_1 = \frac{\phi}{2\pi} \in [0,1],
\qquad
\epsilon_2 = \frac{1-\cos\theta}{2} \in [0,1] .
$$

The inverse is $\phi = 2\pi\epsilon_1$ and $\theta = \cos^{-1}(1-2\epsilon_2)$. Since $\phi$ is periodic, the distribution of $\epsilon_1$ wraps around at its boundaries.

A density $p(\epsilon_1, \epsilon_2 \mid \mathbf{x}, \boldsymbol{\omega}_o)$ on the square is converted to a density over directions, $p_\Omega(\boldsymbol{\omega} \mid \mathbf{x}, \boldsymbol{\omega}_o)$, through the Jacobian of the mapping. Since $\mathrm{d}\epsilon_1\,\mathrm{d}\epsilon_2 = \frac{\mathrm{d}\phi}{2\pi}\cdot\frac{\sin\theta\,\mathrm{d}\theta}{2} = \frac{\mathrm{d}\boldsymbol{\omega}}{4\pi}$, the mapping is area-preserving (hence a "uniform" square space), and

$$
p_\Omega(\boldsymbol{\omega} \mid \mathbf{x}, \boldsymbol{\omega}_o) = \frac{p(\epsilon_1, \epsilon_2 \mid \mathbf{x}, \boldsymbol{\omega}_o)}{4\pi}.
$$


#### Factorized Distribution Representation

By the product rule, the joint PDF on the square is a marginal over the first coordinate times a conditional over the second:

$$
p(\epsilon_1, \epsilon_2 \mid \mathbf{x}, \boldsymbol{\omega}_o) = p_{\boldsymbol{\omega}_1}(\epsilon_1 \mid \mathbf{x}, \boldsymbol{\omega}_o) \cdot p_{\boldsymbol{\omega}_2}(\epsilon_2 \mid \epsilon_1, \mathbf{x}, \boldsymbol{\omega}_o) .
$$

Estimating the joint PDF therefore comes down to predicting two 1D distributions. This is the [marginal-and-conditional scheme](#transforming-between-distributions) used to sample any tabulated 2D density, with the two tables replaced by network outputs.


#### Neural Network Architecture and Discretization

The two coordinates $\epsilon_1$ and $\epsilon_2$ are discretized into $M_1$ and $M_2$ locations ({{< figref "fig-df-pdf-grid" >}}), and **two independent networks** estimate the PDF at those locations ({{< figref "fig-df-network" >}}). The marginal network $f_{\boldsymbol{\omega}_1}$ takes $\mathbf{x}$ and $\boldsymbol{\omega}_o$ and outputs an $M_1$-dimensional vector $\mathbf{v}_1$, which models $p_{\boldsymbol{\omega}_1}(\epsilon_1 \mid \mathbf{x}, \boldsymbol{\omega}_o)$. The conditional network $f_{\boldsymbol{\omega}_2}$ additionally takes $\epsilon_1$ and outputs an $M_2$-dimensional vector $\mathbf{v}_2$, which models $p_{\boldsymbol{\omega}_2}(\epsilon_2 \mid \epsilon_1, \mathbf{x}, \boldsymbol{\omega}_o)$. The PDF at an arbitrary location is obtained by interpolating between the discrete locations.

The paper sets $M_1 = 32$ and $M_2 = 16$. The second dimension gets the lower resolution because $\epsilon_2$ covers the smaller angular range, $\theta \in [0, \pi]$, against $\phi \in [0, 2\pi]$ for $\epsilon_1$.

{{< 
figure src="/images/path_tracing/distribution_factorization/grid.svg"
id="fig-df-pdf-grid"
noinvert="true"
caption="The $M$-dimensional vector $\mathbf{v}$ holding the PDF estimate at discrete locations, obtained by applying softmax to the network output and multiplying each element by $M$. (Detail of the network figure below; image by Figueiredo et al. [[10]](#ref-10))"
width="60%" 
>}}

Both networks have the same architecture: 3 hidden layers of 64 neurons with ReLU activations. To make the output a valid PDF that integrates to one, a softmax is applied and each element is multiplied by the number of bins $M$,

$$
\mathbf{v} = M \cdot \text{softmax}(f_{\boldsymbol{\omega}}(\mathbf{C})),
$$

where $\mathbf{C}$ is the condition (different for the marginal and the conditional). This holds for both interpolation schemes described below, with wrap-around boundary handling for $\epsilon_1$ and nearest-neighbour boundaries for $\epsilon_2$ in the linear case.

{{< 
figure src="/images/path_tracing/distribution_factorization/network_architecture.svg"
id="fig-df-network"
caption="MLP takes the condition $\mathcal{C}$ as the input and estimates an $M$ dimensional vector. A softmax is applied to this vector and each element is multiplied by $M$ to obtain a vector containing the PDF estimate at discrete locations. This network models the marginal and conditional distributions. Note that $x$ and $ω_o$ are the condition when modeling the marginal distribution, but for the conditional one, the first dimension $\epsilon_1$ is additionally passed to the network. Two separate networks model the two distributions, but both follow the process illustrated in this figure. (Image by Figueiredo et al. [[10]](#ref-10))"
width="70%" 
>}}

The inputs are encoded before they reach the networks: the position $\mathbf{x}$ with a learnable dense grid, the direction $\boldsymbol{\omega}_o$ with spherical harmonics of degree 4, and the normal and roughness with one-blob encoding using 4 bins. The conditional input $\epsilon_1$ of $f_{\boldsymbol{\omega}_2}$ uses a triangle wave encoding with 12 frequencies. The networks are implemented in tiny-cuda-nn.


#### Interpolation Strategies

The paper explores two ways of turning the vector $\mathbf{v}$ into a PDF over the whole interval ({{< figref "fig-df-interpolation" >}}).

**Nearest neighbour.** The domain is divided into $M$ bins, and the PDF inside each bin is the corresponding element of $\mathbf{v}$:

$$
p_{\boldsymbol{\omega}}(\epsilon \mid \mathbf{C}) = \mathbf{v}[\lfloor\epsilon M\rfloor] .
$$

{{< 
figure src="/images/path_tracing/distribution_factorization/nearest_neighbor.svg"
id="fig-df-nearest"
caption="Nearest neighbor interpolation: the PDF at an arbitrary location uses the estimate at the closest sample, giving a piecewise-linear CDF. (Detail of the interpolation figure below; image by Figueiredo et al. [[10]](#ref-10))"
width="50%" 
>}}

**Linear interpolation.** The PDF is linearly interpolated between the estimates at the two nearest discrete coordinates,

$$
p_{\boldsymbol{\omega}}(\epsilon \mid \mathbf{C}) = (1-\alpha)\mathbf{v}[m] + \alpha\mathbf{v}[m+1],
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

Sampling uses [inverse transform sampling](#inverse-transform-sampling): the inverse CDF is evaluated at a uniform random number $u \sim \mathcal{U}[0,1]$, $\epsilon = P_{\boldsymbol{\omega}}^{-1}(u \mid \mathbf{C})$. The first coordinate is drawn from the marginal, $\epsilon_1 = P_{\boldsymbol{\omega}_1}^{-1}(u_1 \mid \mathbf{x}, \boldsymbol{\omega}_o)$, the second from the conditional given the first, $\epsilon_2 = P_{\boldsymbol{\omega}_2}^{-1}(u_2 \mid \epsilon_1, \mathbf{x}, \boldsymbol{\omega}_o)$, and the pair is converted to a direction with $\phi = 2\pi\epsilon_1$ and $\theta = \cos^{-1}(1-2\epsilon_2)$.


#### Optimization with Radiance Caching

The learned PDF $p_{\boldsymbol{\Theta}}$ is fitted to the target distribution by minimizing the KL divergence

$$
D_{\text{KL}}(p^* \,\|\, p_{\boldsymbol{\Theta}}) = \int_{\Omega} p^*(\boldsymbol{\omega}) \log\frac{p^*(\boldsymbol{\omega})}{p_{\boldsymbol{\Theta}}(\boldsymbol{\omega})} \, d\boldsymbol{\omega} ,
$$

whose gradient with respect to the network parameters $\boldsymbol{\Theta}$ is

$$
\nabla_{\boldsymbol{\Theta}} D_{\text{KL}}(p^* \,\|\, p_{\boldsymbol{\Theta}}) = -\int_{\Omega} p^*(\boldsymbol{\omega}) \nabla_{\boldsymbol{\Theta}} \log p_{\boldsymbol{\Theta}}(\boldsymbol{\omega}) \, d\boldsymbol{\omega}
\approx -\frac{1}{N} \sum_{i=1}^N \frac{\hat{p}^*(\boldsymbol{\omega}_i)}{q(\boldsymbol{\omega}_i)} \nabla_{\boldsymbol{\Theta}} \log p_{\boldsymbol{\Theta}}(\boldsymbol{\omega}_i),
$$

the Monte Carlo estimate using samples $\boldsymbol{\omega}_i$ drawn from a density $q$ and an estimate $\hat{p}^*$ of the target.

**Target distribution.** The ideal target is the integrand divided by its integral, the reflected radiance:

$$
p^*(\boldsymbol{\omega}_i \mid \mathbf{x}, \boldsymbol{\omega}_o) = \frac{f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega}_i) \, {\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega}_i)}} \, \lvert\cos\theta_i\rvert}{L_r(\mathbf{x}, \boldsymbol{\omega}_o)} .
$$

**Radiance caching network.** To reduce the variance of the gradients and to estimate the normalization factor, a neural network $f_{\boldsymbol{\Phi}}$ caches the **reflected radiance** ${\class{term-light}{L_r(\mathbf{x}', \boldsymbol{\omega}_o')}}$ at the next intersection point. Since ${\class{term-light}{L_i(\mathbf{x}, \boldsymbol{\omega}_i)}} = {\class{term-light}{L_r(\mathbf{x}', \boldsymbol{\omega}_o')}}$, this one network estimates both the incoming radiance and the normalization factor, and the estimated target becomes

$$
\hat{p}^*(\boldsymbol{\omega}_i \mid \mathbf{x}, \boldsymbol{\omega}_o) = \frac{f_s(\mathbf{x}, \boldsymbol{\omega}_o, \boldsymbol{\omega}_i) \cdot f_{\boldsymbol{\Phi}}(\mathbf{x}', \boldsymbol{\omega}_o') \cdot \lvert\cos\theta_i\rvert}{f_{\boldsymbol{\Phi}}(\mathbf{x}, \boldsymbol{\omega}_o)} .
$$

The cache follows Neural Radiance Caching (NRC) [[7]](#ref-7): a small MLP that takes a surface location and a ray direction and estimates the corresponding radiance.

{{< 
figure src="/images/path_tracing/distribution_factorization/radiance_cache.svg"
id="fig-df-radiance-cache"
caption="Computing the target distribution requires obtaining ${\class{term-light}{L_r(x,\omega_o)}}$ and ${\class{term-light}{L_i(x,\omega_i)}}$. A neural network takes location and direction as the input and estimates the cached reflected radiance along that particular ray. By evaluating the network at the next $(x', \omega_o')$ and current $(x,\omega_o)$ intersection points, an estimate of the reflected $L_r$ and incoming ${\class{term-light}{L_i}}$ radiance. Note that here the incoming radiance at $x,\omega_i$ is equal to the reflected radiance at $x', \omega_o'$. (Image by Figueiredo et al. [[10]](#ref-10))"
width="80%" 
>}}



#### Training Details

Training is online and takes the first 30% of the allocated budget. Adam is used with a learning rate of $10^{-2}$ for $f_{\boldsymbol{\Phi}}$ and $3 \times 10^{-2}$ for $f_{\boldsymbol{\omega}_1}$ and $f_{\boldsymbol{\omega}_2}$. 70% of the paths are guided by the learned distribution, and the remaining 30% use BSDF sampling for exploration.

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

2. <span id="ref-2"></span>Pharr, Matt, Wenzel Jakob, and Greg Humphreys. *Physically Based Rendering: From Theory to Implementation*. 4th ed., MIT Press, 2023. [https://www.pbr-book.org/4ed/contents](https://www.pbr-book.org/4ed/contents).

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

27. <span id="ref-27"></span>Rath, Alexander, Pascal Grittmann, Sebastian Herholz, Petr Vévoda, Philipp Slusallek, and Jaroslav Křivánek. *"Variance-Aware Path Guiding."* *ACM Transactions on Graphics (TOG)*, vol. 39, no. 4, 2020. Presented at SIGGRAPH 2020. [https://doi.org/10.1145/3386569.3392441](https://doi.org/10.1145/3386569.3392441).
