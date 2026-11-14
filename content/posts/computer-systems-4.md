---
author: ["Utkarsh Sharma"]
title: "Computer Systems IV: GPU Computing"
date: "2026-11-08T12:00:00"
description: "Lecture notes on GPU architecture and CUDA programming."
summary: "Part IV of the Computer Systems series: massively parallel programming on GPUs with CUDA (the design of GPUs and their graphics history, the CUDA program structure, threads, warps and scheduling, the CUDA memories, tiling and texture memory, divergence and warp-level primitives, coalescing and shared-memory banks, occupancy, ILP, streams and asynchronous transfers, floating-point accuracy, reduced precision and tensor cores, the parallel patterns of convolution, stencil, scan, histogram, sparse matrix–vector multiplication, merge and sort, two application case studies and computational thinking)."
tags: ["GPU", "CUDA", "Parallel Programming"]
categories: ["Computer Systems"]
series: ["Computer Systems"]
ShowToc: true
TocOpen: false
math: true
draft: false
---

<style>
  /* Only what this post's extra elements need; typography comes from the blog theme. */
  .post-content { counter-reset: defn ex fig tab; }
  .post-content .definition { counter-increment: defn; }
  .post-content .definition > p:first-child::before { content: "Definition " counter(defn) ". "; font-weight: 700; }
  .post-content .example { counter-increment: ex; }
  .post-content .example > p:first-child::before { content: "Example " counter(ex) ". "; font-weight: 700; }
  .post-content figure.table { counter-increment: tab; }
  .post-content figure.fig { counter-increment: fig; }
  .post-content figure.table figcaption::before { content: "Table " counter(tab) ". "; font-weight: 600; color: var(--primary); }
  .post-content figure.fig figcaption::before { content: "Figure " counter(fig) ". "; font-weight: 600; color: var(--primary); }
  .post-content figure table { display: table; width: auto; margin: 0 auto; }
  .post-content figure.table td.grp { vertical-align: middle; font-weight: 600; }
  .post-content.post-content figure.table table th, .post-content.post-content figure.table table td { padding: 6px 16px !important; }
  .post-content.post-content figure.table.tight table th, .post-content.post-content figure.table.tight table td { padding: 6px 10px !important; }
  .post-content figure svg { max-width: 100%; height: auto; color: var(--primary); }
  .post-content figure svg .dim { opacity: .65; }
  .post-content figure.fig .highlight, .post-content figure.fig pre { margin-bottom: 0 !important; }
  .post-content .figrow { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; align-items: flex-start; }
</style>

These notes follow Kirk and Hwu, *Programming Massively Parallel Processors* [[1]](#ref-1). The book was written for the first CUDA GPUs; where CUDA has changed since, the current rule is given from the CUDA C++ Programming Guide [[2]](#ref-2), and examples use my RTX 3060 Laptop GPU. The parallel-pattern chapters draw on the course notes and papers cited in them. The roofline model, hardware multithreading and SIMD from [Part III](/posts/computer-systems-3/#parallel-architectures) are used as background.


## Introduction

Microprocessors with a single central processing unit (CPU) drove performance up and cost down for more than two decades, and most software developers relied on the hardware to make the same program run faster on each new processor. This drive slowed after 2003: energy consumption and heat dissipation limited both the clock frequency and the amount of work that can be done in each clock period in a single CPU. Processor vendors switched to putting multiple processing units, called *processor cores*, on each chip.

A sequential program runs on only one of these cores, which will not get much faster. Applications that are to keep getting faster with each new generation of processors must therefore be **parallel programs**, in which multiple threads of execution cooperate to complete the work faster. This incentive has been called the *concurrency revolution*.

### GPUs as Parallel Computers

Since 2003 the industry has followed two trajectories for designing microprocessors:

- The **multicore** trajectory keeps the execution speed of sequential programs while moving to multiple cores. Each core is an out-of-order, multiple-issue processor that implements the full x86 instruction set. The Ryzen 7 5800H of my laptop is one: 8 such cores with two hardware threads each.
- The **many-core** trajectory focuses on the execution *throughput* of parallel applications. Many-cores began with a large number of much smaller cores, and the number of cores has grown with each generation. GPUs are the leading example. The RTX 3060 Laptop GPU of the same laptop has 30 SMs with 128 FP32 lanes each, 3840 in all, each SM being heavily multithreaded, in-order, and shared by many threads.

Many-core processors, especially GPUs, have led the race of floating-point performance since 2003. These are peak rates that the execution resources can support, not speeds that applications necessarily reach.

{{< figure src="/images/computer-systems/gpu-computing/introduction/peak_fp32_throughput_memory_bandwidth_ryzen.svg" alt="Peak FP32 throughput and memory bandwidth of the Ryzen 7 5800H and the RTX 3060 Laptop GPU" width="620px" class="fig" caption="Performance gap between the CPU and the GPU of the same laptop (replaces Kirk &amp; Hwu, Fig. 1.1). CPU: 8 cores × 32 FP32 FLOP/cycle (two 256-bit FMA pipes) × 3.2 GHz, dual-channel DDR4-3200. GPU: 3840 FP32 lanes × 2 FLOP (FMA) × 1.425 GHz, 192-bit GDDR6 at 14 Gb/s." >}}

The gap between the two comes from their **design philosophies** (the figure below).

- A CPU is optimized for **sequential code performance**. Sophisticated control logic lets instructions of a single thread execute in parallel or even out of order while keeping the appearance of sequential execution, and large caches reduce the instruction and data access latencies of large, complex applications. Neither the control logic nor the caches contribute to the peak calculation speed.
- The GPU design is shaped by the **video game industry**, which needs a massive number of floating-point calculations per frame. GPU vendors therefore maximize the chip area and power budget spent on floating-point calculation by optimizing for the execution throughput of a massive number of threads. While some threads wait for long-latency memory accesses, the hardware finds work in the others, which minimizes the control logic each thread needs. Small caches help control the bandwidth requirements, so that threads that access the same data do not all need to go to DRAM.
- **Memory bandwidth** also differs. Graphics chips have run at several times the bandwidth of the CPU chips of their time (336 GB/s for the GPU against 51.2 GB/s for the CPU above). A CPU has to satisfy requirements from legacy operating systems, applications and I/O devices, which makes its memory bandwidth harder to increase; with simpler memory models and fewer legacy constraints, GPU designers can raise bandwidth more easily.

{{< figure src="/images/computer-systems/gpu-computing/introduction/cpu_gpu_design_philosophies.svg" alt="CPU and GPU design philosophies" width="600px" class="fig" caption="CPUs and GPUs have different design philosophies (after Kirk &amp; Hwu, Fig. 1.2). On the GPU, each row of ALUs (small squares) shares a small control unit and cache (the two shaded cells at its left)." >}}

GPUs are designed as numeric computing engines and will not perform well on some tasks on which CPUs perform well, so most applications use both: the sequential parts run on the CPU and the numerically intensive parts on the GPU. This is why the **CUDA** (Compute Unified Device Architecture) programming model, introduced by NVIDIA in 2007, supports joint CPU–GPU execution of an application.

Performance is not the only factor in choosing a processor:

- **Installation base.** The cost of software development is justified only by a very large customer population. Traditional parallel computers had negligible market presence. GPUs are in almost every PC, so massively parallel computing became a mass-market product for the first time.
- **Form factor and accessibility.** Until 2006, parallel software ran on data-centre servers and clusters. A medical device such as an MRI scanner cannot ship with a rack of cluster nodes, but it can ship with a PC and a GPU.
- **IEEE floating-point support**, so that results are predictable across vendors. Early GPUs were weak here; GPU support for the IEEE standard is now comparable to that of CPUs (see [Floating-Point Considerations](#floating-point-considerations)). Double precision on GeForce Ampere GPUs like the RTX 3060 runs at 1/64 of the single-precision rate: each SM has only two FP64 units [[3]](#ref-3).
- **Programmability.** Until 2006, a GPU could only be programmed through a graphics API such as OpenGL or Direct3D, a technique called **GPGPU** (general-purpose programming using a GPU). With CUDA, NVIDIA added hardware to the chip for general-purpose parallel programming, and CUDA programs no longer go through the graphics interface; programmers use the familiar C/C++ tools.

### Architecture of a Modern GPU

A CUDA-capable GPU is organized as an array of highly threaded **streaming multiprocessors (SMs)**. Each SM has a number of execution lanes (originally called streaming processors, SPs; NVIDIA now calls them CUDA cores) that share control logic and an instruction cache. The number of SMs in a building block varies from one generation to the next: in the GA106 (below), two SMs form a texture processing cluster (TPC) and five TPCs form a graphics processing cluster (GPC).

The GPU comes with gigabytes of graphics double-data-rate (GDDR) DRAM, called **global memory**. GDDR DRAMs differ from the system DRAMs on the motherboard in that they are essentially the frame buffer memory used for graphics. For computing they serve as very-high-bandwidth off-chip memory, with somewhat longer latency than system memory; for massively parallel applications the higher bandwidth makes up for the longer latency. The RTX 3060 Laptop GPU's memory delivers 336 GB/s, but the GPU talks to the CPU over PCIe 3.0 ×8 at about 7.9 GB/s in each direction, more than 40 times slower. This communication bandwidth limits which data are worth moving to the GPU.

{{< figure src="/images/computer-systems/gpu-computing/introduction/architecture_ga106_gpu_rtx_3060_laptop.svg" alt="Architecture of the GA106 GPU of the RTX 3060 Laptop GPU" width="680px" class="fig" caption="Architecture of a CUDA-capable GPU, drawn for the GA106 chip of the RTX 3060 Laptop GPU (replaces Kirk &amp; Hwu, Fig. 1.3): 3 graphics processing clusters (GPCs) of 5 texture processing clusters (TPCs) with 2 SMs each, 30 SMs in all, a shared L2 cache and six 32-bit memory controllers (MC)." >}}

<figure class="fig">
<img src="/images/computer-systems/gpuz-rtx3060.png" alt="GPU-Z window for the NVIDIA GeForce RTX 3060 Laptop GPU showing the GA106 chip, 3840 shaders, 6 GB GDDR6 on a 192-bit bus and 336 GB/s bandwidth" width="582">
<figcaption>GPU-Z on my RTX 3060 Laptop GPU, the GA106 drawn above: 3840 FP32 lanes (30 SMs × 128), 6 GB of GDDR6 on a 192-bit bus at 336 GB/s, and a PCIe 4.0 ×16 interface running at PCIe 3.0 ×8.</figcaption>
</figure>

Each SM is massively threaded and can hold over a thousand threads (1536 on the RTX 3060), so a good application keeps tens of thousands of threads in flight on the chip; a CPU core with simultaneous multithreading holds 2.

### Why More Speed or Parallelism?

When an application is suitable for parallel execution, a good implementation on a GPU can be more than 100 times faster than sequential execution. If the application includes **data parallelism**, a 10× speedup often takes only a few hours of work.

The applications that keep demanding more speed are what used to be called supercomputing applications, or *superapplications*: molecular simulation, video processing, computer vision, physics simulation in games, and machine learning. All of them simulate a concurrent world with huge amounts of data, and much of the computation on different parts of the data can be done in parallel, with occasional reconciliation. The programming model must not hinder parallel implementation, and data delivery must be managed. CUDA provides such a model with hardware support.

How much speedup to expect depends on the portion of the application that can be parallelized. This is Amdahl's law from [Part III](/posts/computer-systems-3/#amdahls-law):

$$
S = \frac{1}{(1 - p) + p/s},
$$

where $p$ is the fraction of execution time that is parallelized and $s$ is the speedup of that part.

<div class="example">

If 30% of the execution time is spent in the part that can be parallelized, a 100× speedup of that part reduces the execution time by $0.3 - 0.003 = 29.7\%$, and the whole application is only $1/(0.7 + 0.003) = 1.42\times$ faster. Even an infinite speedup of that part gives at most $1/0.7 = 1.43\times$.

If 99% of the time is in the parallel portion, a 100× speedup reduces the execution time to $0.01 + 0.0099 = 1.99\%$ of the original, a speedup of $1/0.0199 = 50\times$.

</div>

An application therefore needs the vast majority of its execution time in the parallel portion for a massively parallel processor to speed it up. Speedups of more than 100× are reached only after the algorithms are enhanced so that more than 99.9% of the time is in parallel execution. In general, straightforward parallelization **saturates the memory (DRAM) bandwidth** and gives only about 10×. The trick is to get around the memory bandwidth limitation by using the GPU's specialized on-chip memories to drastically reduce the number of DRAM accesses, and then to work around the limited capacity of those on-chip memories. These optimizations are the main subject of the [CUDA Memories](#cuda-memories) and [Performance Considerations](#performance-considerations) chapters.

The speedup over the CPU also reflects how well the CPU suits the application. Most applications have portions that the CPU executes much better, so the CPU must be given a fair chance, and the code written so that the GPU *complements* the CPU. This heterogeneous CPU–GPU computing is what the CUDA model promotes.

## History of GPU Computing

A CUDA programmer does not need to know graphics algorithms or terminology. The graphics heritage of GPUs, however, explains their main design decisions: **massive multithreading**, **small caches** compared to CPUs, and a **bandwidth-centric** memory interface.

### Evolution of Graphics Pipelines

3D graphics hardware evolved from large, expensive systems in the early 1980s to small workstations and then PC accelerators in the late 1990s, while its price fell from \$50,000 to \$200 and its speed rose from 50 million to 1 billion pixels per second. The driver was the market demand for high-quality, real-time graphics: a game must render ever more complex scenes at ever higher resolutions at 60 frames per second. Over 30 years the architecture went from a simple pipeline for drawing wire-frame diagrams to several deep parallel pipelines, and its functions became more sophisticated and user-programmable.

#### The Era of Fixed-Function Graphics Pipelines

From the early 1980s to the late 1990s the leading graphics hardware was a **fixed-function pipeline**: configurable but not programmable. In the same era the graphics application programming interfaces (APIs) became popular. An API is a standardized layer of software (a collection of library functions) through which an application, such as a game, uses services such as sending commands to a GPU to draw objects. The two major ones are Microsoft's DirectX (its Direct3D component for 3D graphics) and the open standard OpenGL. The fixed-function era roughly corresponds to the first seven generations of DirectX.

{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/fixed_function_graphics_pipeline.svg" alt="A fixed-function graphics pipeline" width="470px" class="fig" caption="A fixed-function graphics pipeline (after Kirk &amp; Hwu, Fig. 2.1)." >}}

The stages of the pipeline in the figure are:

- **Host interface**: receives graphics commands and data from the CPU, which come from the application calling API functions. It contains direct memory access (DMA) hardware to transfer bulk data between host memory and the pipeline, and reports status and results back.
- **Vertex control**: a *vertex* is a corner of a polygon; the pipeline renders triangles, and the surface of an object is drawn as a collection of triangles (the finer the triangles, the better the picture). This stage receives parameterized triangle data from the CPU, converts it to the hardware's form, and places it in the vertex cache.
- **VS/T&L** (vertex shading, transform and lighting): transforms vertices and assigns per-vertex values (colours, normals, texture coordinates, tangents). A colour assigned to a vertex is applied to the pixels later.
- **Triangle setup**: creates the edge equations used to interpolate colours and other per-vertex data across the pixels touched by the triangle.
- **Raster**: determines which pixels are contained in each triangle and, for each, interpolates the per-vertex values needed to shade it.
- **Shader**: determines the final colour of each pixel, from interpolated vertex colours, texture mapping, per-pixel lighting, reflections and so on. In **texture mapping** (below), a world-map image is painted onto a sphere made of triangles. Each pixel needs only a few coordinate transforms to find its texture point, but the sheer number of pixels means a very large number of transforms per frame.
- **ROP** (raster operation): blends the colours of overlapping or adjacent objects for transparency and **antialiasing**, and discards pixels occluded by other objects from the given viewpoint. In antialiasing (below), a pixel that is partly inside several objects gets a blend of their colours, each weighted by how much of the pixel the object covers, instead of the colour of a single object, which makes edges look crooked.
- **FBI** (frame buffer interface): manages reads and writes of the frame buffer memory. High-resolution displays need very high bandwidth, obtained in two ways: special memory designs with higher bandwidth than system memory, and several memory channels connected to multiple banks managed at the same time. This high memory bandwidth has remained a distinguishing feature of GPUs.

{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/texture_mapping_world_map_onto_sphere.svg" alt="Texture mapping a world map onto a sphere" width="560px" class="fig" caption="Texture mapping: the shader looks up the texel (u, v) that falls on each pixel of the sphere and paints it there (after Kirk &amp; Hwu, Fig. 2.2)." >}}

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/antialiasing_panel_geom.svg" alt="Antialiasing panel geom" width="154px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/antialiasing_panel_alias.svg" alt="Antialiasing panel alias" width="154px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/antialiasing_panel_aa.svg" alt="Antialiasing panel aa" width="154px" style="margin:0" >}}
</div>
<figcaption>Antialiasing, computed for three adjacent triangles (after Kirk &amp; Hwu, Fig. 2.3). Aliased: each pixel takes the colour of the triangle under its centre (the dots). Antialiased: each pixel is the coverage-weighted blend, here from 4 × 4 samples per pixel.</figcaption>
</figure>

Each hardware generation added resources and configurability to these stages, but developers asked for more features than could be offered as fixed functions. The next step was to make some stages programmable processors.

#### Evolution of Programmable Real-Time Graphics

In 2001, GPUs exposed the instruction set of the floating-point vertex engine (the VS/T&L stage) to developers, with DirectX 8 and OpenGL vertex-shader extensions. GPUs of the DirectX 9 generation extended programmability and floating point to the pixel shader stage, first with 24-bit and then with 32-bit floating-point pixel processors. Vertex and pixel processing still had separate processor designs until a unified processor that ran both appeared in a game console in 2005.

Some pipeline stages do a great deal of floating-point arithmetic on **completely independent data**, such as transforming triangle vertices or generating pixel colours. This data independence is the key difference between the design assumptions of GPUs and CPUs: a single frame rendered in 1/60 s may have a million triangles and 6 million pixels.

Two programmable stages stand out, the vertex stage and the pixel stage:

- **Vertex shader** programs map the positions of triangle vertices onto the screen, changing their position, colour or orientation. A vertex shader thread typically reads a floating-point $(x, y, z, w)$ vertex position and computes a floating-point $(x, y, z)$ screen position. (Later, **geometry shader** programs, which operate on whole primitives and can generate new ones, were added to the vertex stage.)
- **Pixel (fragment) shader** programs calculate the floating-point red, green, blue, alpha (RGBA) colour contribution at a pixel sample $(x, y)$.

For all of these shader programs, instances can run in parallel, because each works on independent data, produces independent results, and has **no side effects**. This property led to the design of the programmable stages as massively parallel processors. Between them are dozens of fixed-function stages, such as the rasterizer, a complex state machine that determines which pixels lie inside each primitive, which do well-defined tasks far more efficiently than a programmable processor could.

{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/programmable_graphics_pipeline_vertex_fragment_processors.svg" alt="Programmable graphics pipeline with vertex and fragment processors" width="940px" class="fig" caption="A programmable graphics pipeline with a separate vertex processor and fragment processor (after Kirk &amp; Hwu, Fig. 2.4)." >}}

Rendering algorithms make a single pass over the input primitives and access memory in a highly coherent manner: they tend to access contiguous locations at the same time, such as all triangles or all pixels of a neighbourhood. They use memory bandwidth very efficiently and are largely insensitive to memory latency. Together with a pixel shader workload that is usually compute-limited, this led GPUs along a different path than CPUs: where the CPU die is dominated by cache memories, the GPU die is dominated by floating-point datapaths and fixed-function logic, and GPU memory interfaces emphasize **bandwidth over latency**, since latency can be hidden by massively parallel execution.

#### Unified Graphics and Computing Processors

In 2006 (the DirectX 10 generation), the separate programmable stages were mapped onto **one array of unified processors**. The logical graphics pipeline became physically a recirculating path that visits these processors three times, with fixed-function logic between the visits. Different rendering algorithms load the three programmable stages very differently, so a unified array can be dynamically partitioned among vertex shading, geometry processing and pixel processing for better load balance. By then vertex and pixel shaders were identical to the programmer, and the geometry shader had been added.

{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/unified_programmable_processor_array.svg" alt="Unified programmable processor array" width="700px" class="fig" caption="A unified programmable processor array: the vertex, geometry and pixel stages of the logical pipeline all issue threads to the same processors (after Kirk &amp; Hwu, Fig. 2.5). TF: texture filtering units; FB: frame-buffer DRAM partition." >}}

The designers also wanted a higher clock frequency than standard-cell methods allowed, to deliver the required shader throughput in less area. High-clock-speed design needs much more engineering effort, which favoured designing one processor array rather than two or three. The cost was the engineering problems of a unified processor: load balancing and recirculating the logical pipeline onto threads of the array. This design opened the way to using the processor array for general numeric computing.

#### GPGPU: An Intermediate Step

As DirectX 9 GPUs appeared, researchers noticed their raw performance growth and began to use them for compute-intensive science and engineering problems. These GPUs had been designed only for the graphics APIs, so a computation had to be cast as graphics operations launched through OpenGL or DirectX:

- To run many instances of a compute function, it was written as a **pixel shader**.
- The input data were stored in **texture images** and issued to the GPU by submitting triangles (clipped to a rectangle if needed).
- The output was a set of **pixels** generated by the raster operations.

{{< figure src="/images/computer-systems/gpu-computing/history_gpu_computing/restricted_input_output_shader_programming_model.svg" alt="Restricted input and output of a shader programming model" width="520px" class="fig" caption="Input and output of a fragment-shader thread: it can read textures and constants, but it can write only its own output registers, which go to a fixed frame-buffer location (after Kirk &amp; Hwu, Fig. 2.6)." >}}

The processor array and frame buffer interface were designed for graphics, which proved too restrictive for general numeric work. The output of a shader is a single pixel whose memory location is predetermined. Shaders read arbitrary memory only through textures, and they could not write to calculated addresses, called **scatter** operations: the only way to write a result was as a pixel colour, through the ROP stage, into a 2D frame buffer. To pass results from one pass of computation to the next, all results were written to a frame buffer, which was then used as a texture input for the next pass. There were no user-defined data types, and most data had to be stored in one-, two- or four-component vector arrays. This field was called **GPGPU**, general-purpose computing on GPUs.

### GPU Computing

While developing the unified (Tesla) architecture, NVIDIA chose a programming approach in which programmers explicitly declare the data-parallel parts of their workload, and made the GPU look like a processor:

- The shader processors became fully programmable, with large instruction memory, an instruction cache and instruction sequencing logic. The cost of this hardware was reduced by having several processors **share** the instruction cache and sequencing logic, which works because the same program is applied to a massive number of vertices or pixels.
- **Load and store instructions with random byte addressing** were added to support compiled C programs.
- The programming model got a **hierarchy of parallel threads, barrier synchronization and atomic operations**.
- The CUDA C/C++ compiler, libraries and runtime let programmers use the GPU without the graphics API.

## Introduction to CUDA

To a CUDA programmer, the computing system consists of a **host**, a traditional CPU, and one or more **devices**, massively parallel processors with a large number of arithmetic execution units. Program sections often have a rich amount of **data parallelism**, which lets many arithmetic operations be performed safely on the program's data structures at the same time. CUDA devices accelerate such applications by harvesting this data parallelism.

### Data Parallelism

Many applications that process a lot of data model the physical world. Different parts of an image capture simultaneous, independent physical events, and rigid-body physics or fluid dynamics evaluate natural forces independently within small time steps. Such independent evaluation is the basis of their data parallelism.

<div class="definition">

**Data parallelism** is the program property whereby many arithmetic operations can be safely performed on the data structures at the same time.

</div>

In matrix–matrix multiplication (matrix multiplication for short), each element of the product matrix P is the dot product of a row of input matrix M and a column of input matrix N. The dot products for different elements of P do not affect each other, so they can all be computed at the same time. A 1000 × 1000 matrix multiplication has 1,000,000 independent dot products, each of 1000 multiplications and 1000 additions.

{{< figure src="/images/computer-systems/gpu-computing/introduction_cuda/matrix_multiplication_dp.svg" alt="Matrix multiplication dp" width="450px" class="fig" caption="Data parallelism in matrix multiplication: each element of P is the dot product of a row of M and a column of N, and all of them can be computed at the same time (after Kirk &amp; Hwu, Fig. 3.1)." >}}

### CUDA Program Structure

A CUDA program consists of phases that run on either the host or a device. Phases with little or no data parallelism are implemented in **host code**, and phases with rich data parallelism in **device code**. Both can be in the same source file. The NVIDIA compiler, `nvcc`, separates them: the host code is ordinary C++, compiled with the host's compiler and run as an ordinary CPU process; the device code is C++ extended with keywords for labelling data-parallel functions, called **kernels**, and their data structures. `nvcc` compiles it to PTX, a virtual instruction set, and to machine code (SASS) for a target GPU.

<div class="definition">

The **compute capability** of a GPU, written *major.minor*, identifies its architecture generation and the features and limits it supports (threads per block, shared memory, available instructions). The RTX 3060 has compute capability 8.6, and code is compiled for it with `nvcc -arch=sm_86`.

</div>

The kernels typically generate a large number of threads to exploit data parallelism. A matrix multiplication kernel that uses one thread per element of P generates 1,000,000 threads for a 1000 × 1000 product. CUDA threads are much lighter than CPU threads: thanks to hardware support they take a few cycles to create and schedule, while CPU threads take thousands of cycles.

Execution starts on the host. When a kernel is invoked, or **launched**, execution moves to the device, where a large number of threads are generated. All the threads generated by one kernel launch are called a **grid**. A launch is **asynchronous**: the host continues right after the launch, and the grid runs on the device until all its threads complete. The host waits only when it needs the results, at the next `cudaMemcpy()` or an explicit `cudaDeviceSynchronize()`.

{{< figure src="/images/computer-systems/gpu-computing/introduction_cuda/execution_cuda_program.svg" alt="Execution of a CUDA program" width="600px" class="fig" caption="Execution of a CUDA program: serial host code alternates with grids of GPU threads launched by kernels (after Kirk &amp; Hwu, Fig. 3.2)." >}}

### A Matrix–Matrix Multiplication Example

The matrices are square, with dimension `Width`. The main program allocates M, N and P in host memory and reads M and N (Part 1), calls `MatrixMultiplication()` to compute the product on a device (Part 2), and writes P and frees the matrices (Part 3).

<figure class="fig">

```c
int main(void) {
    // 1. Allocate and initialize the matrices M, N, P
    //    I/O to read the input matrices M and N
    ...
    // 2. M * N on the device
    MatrixMultiplication(M, N, P, Width);
    // 3. I/O to write the output matrix P
    //    Free matrices M, N, P
    ...
    return 0;
}
```

<figcaption>A simple main function for the matrix multiplication example (after Kirk &amp; Hwu, Fig. 3.3).</figcaption>
</figure>

A CPU-only `MatrixMultiplication()` has three loop levels. The innermost loop over `k` steps through one row of M and one column of N and computes their dot product; the outer loops over `i` and `j` jointly iterate over all rows of M and all columns of N, generating every element of P.

<figure class="fig">

```c
void MatrixMultiplication(float* M, float* N, float* P, int Width)
{
    for (int i = 0; i < Width; ++i)
        for (int j = 0; j < Width; ++j) {
            float sum = 0;
            for (int k = 0; k < Width; ++k) {
                float a = M[i * Width + k];
                float b = N[k * Width + j];
                sum += a * b;
            }
            P[i * Width + j] = sum;
        }
}
```

<figcaption>A simple matrix multiplication function with only host code (after Kirk &amp; Hwu, Fig. 3.4).</figcaption>
</figure>

{{< figure src="/images/computer-systems/gpu-computing/introduction_cuda/matrix_multiplication_ijk.svg" alt="Matrix multiplication ijk" width="450px" class="fig" caption="The loop indices of the host-only matrix multiplication: <code>i</code> selects the row of M, <code>j</code> the column of N, and <code>k</code> steps along both (after Kirk &amp; Hwu, Fig. 3.4)." >}}

The index of M in the inner loop is `i*Width + k` because memory is accessed with a linear address. C places a 2D array in this linear memory in **row-major** order: all elements of a row go to consecutive locations, and the rows are placed one after another. The term `i*Width` skips over all elements of the rows before row `i`, and `k` selects the element within row `i`. (FORTRAN uses column-major order.)

{{< figure src="/images/computer-systems/gpu-computing/introduction_cuda/placement_4_4_matrix_linear_memory.svg" alt="Placement of a 4 by 4 matrix into linear memory in row-major order" width="620px" class="fig" caption="Row-major placement of a 4 × 4 matrix in the linear address space. As in the book, M<sub>x,y</sub> is the element in column x and row y, so element (row i, column k) is at offset <code>i*Width + k</code> (after Kirk &amp; Hwu, Fig. 3.5)." >}}

To port the function to CUDA, the bulk of the calculation is moved to a device. Part 1 of the revised function allocates device memory for copies of M, N and P and copies M and N to it; Part 2 launches the kernel; Part 3 copies P back to the host and frees the device memory. The revised function is an outsourcing agent: the main program need not know that the multiplication is done on a device.

<figure class="fig">

```c
void MatrixMultiplication(float* M, float* N, float* P, int Width)
{
    int size = Width * Width * sizeof(float);
    float *Md, *Nd, *Pd;
    // 1. Allocate device memory for M, N and P
    //    Copy M and N to the allocated device memory
    // 2. Kernel invocation code, to have the device perform
    //    the actual matrix multiplication
    // 3. Copy P from the device memory
    //    Free device matrices
}
```

<figcaption>Outline of a host function that moves the matrix multiplication to a device (after Kirk &amp; Hwu, Fig. 3.6).</figcaption>
</figure>

### Device Memories and Data Transfer

In CUDA the host and the devices have **separate memory spaces**, because a device is typically a card with its own DRAM. To execute a kernel, the programmer allocates memory on the device and transfers the data from host memory to it (Part 1); afterwards, the results are transferred back and the device memory freed (Part 3). The CUDA runtime provides API functions for this. "Transfer from host to device" is shorthand for transfer from host memory to device memory.

In the device memory model below, the host can transfer data to and from **global memory** and **constant memory**. Constant memory is read-only to device code ([CUDA Device Memory Types](#cuda-device-memory-types)).

{{< figure src="/images/computer-systems/gpu-computing/introduction_cuda/cuda_device_memory_model.svg" alt="CUDA device memory model" width="560px" class="fig" caption="The CUDA device memory model: device code reads and writes per-thread registers, per-block shared memory and per-grid global memory, and reads per-grid constant memory; host code transfers data to and from global and constant memory (after Kirk &amp; Hwu, Fig. 3.7). Local memory, per-thread memory that lives in global memory, is not drawn." >}}

`cudaMalloc()` allocates an object in device global memory and `cudaFree()` frees it. `cudaMalloc()` deliberately resembles the C `malloc()`, since CUDA is C with minimal extensions, but it takes two parameters:

<figure class="table">
<figcaption>CUDA API functions for device global memory management (after Kirk &amp; Hwu, Fig. 3.8).</figcaption>

| Function | Purpose | Parameters |
|:--|:--|:--|
| `cudaMalloc()` | Allocates an object in device global memory | address of a pointer to the allocated object; size of the object in bytes |
| `cudaFree()` | Frees an object from device global memory | pointer to the object |

</figure>

The first parameter is the **address of a pointer variable**, cast to `(void **)` because the function is generic; `cudaMalloc()` writes the address of the allocated object into that variable. The return value is then free to report errors, as for every CUDA API function. Device pointers end in `d` here:

```c
float *Md;
int size = Width * Width * sizeof(float);
cudaMalloc((void**)&Md, size);
...
cudaFree(Md);
```

`cudaMemcpy()` transfers data between memories:

<figure class="table">
<figcaption>CUDA API function for data transfer between memories (after Kirk &amp; Hwu, Fig. 3.9).</figcaption>

| Parameter | Meaning |
|:--|:--|
| 1 | pointer to the destination |
| 2 | pointer to the source |
| 3 | number of bytes copied |
| 4 | type of transfer: `cudaMemcpyHostToHost`, `cudaMemcpyHostToDevice`, `cudaMemcpyDeviceToHost`, `cudaMemcpyDeviceToDevice` (or `cudaMemcpyDefault`, which infers it from the pointers) |

</figure>

The same function transfers in both directions with the source and destination in the right order:

```c
cudaMemcpy(Md, M, size, cudaMemcpyHostToDevice);
cudaMemcpy(P, Pd, size, cudaMemcpyDeviceToHost);
```

`cudaMemcpy()` is synchronous with the host: it waits for previously launched kernels to finish, and when it returns, the source buffer can be reused (a device-to-host copy has fully arrived; a host-to-device copy from ordinary memory may still be in flight from a driver buffer). The asynchronous version is `cudaMemcpyAsync()` ([Overlapping Data Transfer and Computation](#overlapping-data-transfer-and-computation)). With unified virtual addressing, `cudaMemcpy()` also copies between GPUs, as does `cudaMemcpyPeer()`.

Since CUDA 6, **unified memory** offers an alternative to explicit copies: `cudaMallocManaged()` returns a pointer usable from both host and device, and the driver moves the data as needed. It simplifies code, but explicit transfers remain the way to control performance.

The host function that allocates device memory, transfers data and launches the kernel is called the **stub function** for the kernel:

<figure class="fig">

```c
void MatrixMultiplication(float* M, float* N, float* P, int Width)
{
    int size = Width * Width * sizeof(float);
    float *Md, *Nd, *Pd;

    // 1. Transfer M and N to device memory
    cudaMalloc((void**)&Md, size);
    cudaMemcpy(Md, M, size, cudaMemcpyHostToDevice);
    cudaMalloc((void**)&Nd, size);
    cudaMemcpy(Nd, N, size, cudaMemcpyHostToDevice);
    // Allocate P on the device
    cudaMalloc((void**)&Pd, size);

    // 2. Kernel invocation code (below)
    ...

    // 3. Transfer P from the device to the host
    cudaMemcpy(P, Pd, size, cudaMemcpyDeviceToHost);
    // Free device matrices
    cudaFree(Md); cudaFree(Nd); cudaFree(Pd);
}
```

<figcaption>The revised <code>MatrixMultiplication()</code> function (after Kirk &amp; Hwu, Fig. 3.10).</figcaption>
</figure>

### Kernel Functions and Threading

A kernel function specifies the code executed by all threads of a parallel phase. Since all threads execute the same code, CUDA is an instance of the **single-program, multiple-data (SPMD)** style.

<div class="definition">

In **SPMD**, the parallel processing units execute the same program on different parts of the data, but they need not execute the same instruction at the same time. In **SIMD** (single instruction, multiple data), all processing units execute the same instruction at every instant.

</div>

<figure class="fig">

```c
// Matrix multiplication kernel: thread specification
__global__ void MatrixMulKernel(float* Md, float* Nd, float* Pd, int Width)
{
    // 2D thread ID
    int tx = threadIdx.x;
    int ty = threadIdx.y;

    // Pvalue stores the Pd element computed by the thread
    float Pvalue = 0;
    for (int k = 0; k < Width; ++k) {
        float Mdelement = Md[ty * Width + k];
        float Ndelement = Nd[k * Width + tx];
        Pvalue += Mdelement * Ndelement;
    }
    // Write the matrix to device memory; each thread writes one element
    Pd[ty * Width + tx] = Pvalue;
}
```

<figcaption>The matrix multiplication kernel function (after Kirk &amp; Hwu, Fig. 3.11).</figcaption>
</figure>

The keyword `__global__` marks `MatrixMulKernel()` as a kernel, which the host calls to generate a grid of threads on the device. CUDA extends C function declarations with three qualifiers:

<figure class="table">
<figcaption>CUDA extensions to C function declarations (after Kirk &amp; Hwu, Fig. 3.12).</figcaption>

| Declaration | Executed on the | Only callable from the |
|:--|:-:|:-:|
| `__device__ float DeviceFunc()` | device | device |
| `__global__ void KernelFunc()` | device | host (and device, with dynamic parallelism) |
| `__host__ float HostFunc()` | host | host |

</figure>

- A `__global__` function is a kernel. It runs on the device, is called from the host, and must return `void`.
- A `__device__` function runs on the device and can be called only from a kernel or another device function. Device functions may be recursive and may be called through function pointers.
- A `__host__` function is a traditional C function. Functions without any CUDA keyword default to host functions, which spares the programmer from changing every declaration when porting a CPU program.
- `__host__ __device__` together makes the compiler generate two versions of the function, one for each side, which is common for small library functions.

`threadIdx.x` and `threadIdx.y` are predefined variables through which each thread reads hardware registers holding its own coordinates. All threads execute the same code, and these coordinates let them direct themselves to different parts of the data. Thread<sub>threadIdx.x, threadIdx.y</sub> is a thread with those indices.

Comparing the kernel with the host-only function shows where the loops went: the kernel has only the innermost loop over `k`. **The outer two loop levels are replaced by the grid of threads.** Each thread corresponds to one iteration of the original two-level loop, with `tx` (from `threadIdx.x`) taking the role of `j` (column) and `ty` (from `threadIdx.y`) the role of `i` (row). For example, Thread<sub>2,3</sub> computes the dot product of column 2 of Nd and row 3 of Md and writes it to element (2, 3) of Pd. As with thread coordinates, element subscripts are written (x, y) = (column, row) throughout these notes, the reverse of the (row, column) order of the loop indices `i`, `j`.

A grid typically has thousands to millions of lightweight threads. The threads of a grid are organized into a **two-level hierarchy**. A grid consists of one or more **thread blocks**, all of the same size and shape, each identified by `blockIdx.x`, `blockIdx.y` and `blockIdx.z`. Each block is a 3D array of threads identified by `threadIdx.x`, `threadIdx.y` and `threadIdx.z`. A block can have at most **1024 threads**, with at most 1024 in x and y and 64 in z.

{{< figure src="/images/computer-systems/gpu-computing/introduction_cuda/cuda_grid_organization.svg" alt="CUDA grid organization" width="520px" class="fig" caption="CUDA thread organization: a kernel launch creates a grid of blocks, and each block is a 3D array of threads. Here <code>dimGrid(2, 2, 1)</code> and <code>dimBlock(4, 2, 2)</code>: 4 blocks of 16 threads each (after Kirk &amp; Hwu, Figs. 3.13 and 4.2). Threads in a block can synchronize and share data through shared memory; threads in different blocks cannot cooperate this way." >}}

The kernel above uses no block index, so threads with the same `threadIdx` in different blocks would compute the same element: it can use only **one block**. With one thread per element of Pd and 1024 threads per block, it can multiply matrices of at most 32 × 32, far too few elements to keep a device busy. [Using blockIdx and threadIdx](#using-blockidx-and-threadidx) fixes this with multiple blocks.

The host sets the grid and block dimensions with **execution configuration parameters** between `<<<` and `>>>`. They are two `dim3` structs: the grid size in blocks and the block size in threads.

<figure class="fig">

```c
// Set up the execution configuration
dim3 dimBlock(Width, Width);
dim3 dimGrid(1, 1);

// Launch the device computation threads!
MatrixMulKernel<<<dimGrid, dimBlock>>>(Md, Nd, Pd, Width);
```

<figcaption>Host code that launches the kernel (after Kirk &amp; Hwu, Fig. 3.14).</figcaption>
</figure>

### Error Checking

Every runtime API function returns a `cudaError_t`, which should be checked; a common idiom wraps each call in a macro. A kernel launch returns nothing: launch errors (for example, too many threads per block) are read with `cudaGetLastError()` right after the launch, and errors during execution (for example, an out-of-bounds access) appear only at the next synchronizing call.

<figure class="fig">

```c
#define CUDA_CHECK(call) do {                               \
    cudaError_t err = (call);                               \
    if (err != cudaSuccess) {                               \
        fprintf(stderr, "%s:%d: %s\n", __FILE__, __LINE__,  \
                cudaGetErrorString(err));                   \
        exit(1);                                            \
    }                                                       \
} while (0)

CUDA_CHECK(cudaMalloc((void**)&Md, size));
MatrixMulKernel<<<dimGrid, dimBlock>>>(Md, Nd, Pd, Width);
CUDA_CHECK(cudaGetLastError());          // launch errors
CUDA_CHECK(cudaDeviceSynchronize());     // errors during execution
```

<figcaption>Checking CUDA errors. The <code>cudaDeviceSynchronize()</code> is for debugging; in production code the next synchronizing call reports execution errors.</figcaption>
</figure>


## CUDA Threads

Fine-grained, data-parallel threads are the fundamental means of parallel execution in CUDA. This chapter covers how the threads of a grid are organized, assigned to hardware and scheduled.

### CUDA Thread Organization

All threads of a grid execute the same kernel, so they rely on unique coordinates to tell themselves apart and find their data. These are `blockIdx` (block index) and `threadIdx` (thread index), built-in, preinitialized variables assigned by the CUDA runtime. `gridDim` and `blockDim` give the dimensions of the grid (in blocks) and of each block (in threads).

In the simple case below, the grid has N blocks with `blockIdx.x` from 0 to N − 1, and each block has M threads with `threadIdx.x` from 0 to M − 1, $N \times M$ threads in all. Each thread computes

```c
int threadID = blockIdx.x * blockDim.x + threadIdx.x;
```

and uses it to pick the element of `input[]` to read and of `output[]` to write.

{{< figure src="/images/computer-systems/gpu-computing/cuda_threads/dimensional_grid_dimensional_blocks.svg" alt="One-dimensional grid of one-dimensional blocks" width="720px" class="fig" caption="Overview of CUDA thread organization: N blocks of M threads, and each thread computes <code>threadID = blockIdx.x * blockDim.x + threadIdx.x</code> (after Kirk &amp; Hwu, Fig. 4.1)." >}}

<div class="example">

A grid has 128 blocks (N = 128) of 32 threads (M = 32), so `blockDim.x` returns 32 and the grid has $128 \times 32 = 4096$ threads. Thread 3 of block 0 has `threadID` $= 0 \times 32 + 3 = 3$; thread 3 of block 5 has $5 \times 32 + 3 = 163$; thread 15 of block 102 has $102 \times 32 + 15 = 3279$. Every thread gets a unique value from 0 to 4095, so with 4096-element arrays each thread reads one input element and produces one output element.

</div>

The execution configuration gives the grid dimensions in blocks and the block dimensions in threads, each a `dim3` (a struct of three unsigned integers `x`, `y`, `z`). The grid above is launched with

```c
dim3 dimGrid(128, 1, 1);
dim3 dimBlock(32, 1, 1);
KernelFunction<<<dimGrid, dimBlock>>>(...);
```

or, since both are 1D, with scalars: `KernelFunction<<<128, 32>>>(...);`. The dimensions can be computed from other variables at launch time, but cannot change once the kernel is launched. All threads of a block share the same `blockIdx`, and `blockIdx.x` ranges from 0 to `gridDim.x` − 1.

Grids can be 1D, 2D or 3D: `gridDim.x` can be up to $2^{31} - 1$, and `gridDim.y` and `gridDim.z` up to 65,535.

A block is a 3D array of threads with `threadIdx.x`, `threadIdx.y` and `threadIdx.z`. All blocks of a grid have the same dimensions, and the total number of threads in a block is limited to **1024**. For example, (1024, 1, 1), (8, 16, 2) and (32, 32, 1) are all allowed block shapes, while (32, 32, 2) is not, since it has 2048 threads. The grid organization figure in the previous chapter was launched with

```c
dim3 dimGrid(2, 2, 1);
dim3 dimBlock(4, 2, 2);
KernelFunction<<<dimGrid, dimBlock>>>(...);
```

Its four blocks form a 2 × 2 array; block (1, 0) has `blockIdx.x` = 1 and `blockIdx.y` = 0. Each block has $4 \times 2 \times 2 = 16$ threads, and thread (2, 1, 0) has `threadIdx.x` = 2, `threadIdx.y` = 1, `threadIdx.z` = 0. The grid has 64 threads; real grids have thousands to millions.

### Using blockIdx and threadIdx

The kernel of the previous chapter uses only one block, which limits it to 32 × 32 matrices. To handle larger matrices, we use multiple blocks: Pd is broken into square **tiles**, and each tile is computed by one block. Keeping the tiles small keeps each block within the thread limit.

Each thread still computes one Pd element, but it first uses its `blockIdx` to find the tile and then its `threadIdx` to find its element in the tile. With `tx`, `ty` for `threadIdx.x`, `threadIdx.y` and `bx`, `by` for `blockIdx.x`, `blockIdx.y`, and square tiles of `TILE_WIDTH` elements:

- the column (x) index of the Pd element is `bx*TILE_WIDTH + tx`, which is also the column of Nd it needs;
- the row (y) index is `by*TILE_WIDTH + ty`, which is also the row of Md it needs.

{{< figure src="/images/computer-systems/gpu-computing/cuda_threads/matrix_multiplication_tile.svg" alt="Matrix multiplication tile" width="500px" class="fig" caption="Matrix multiplication with multiple blocks by tiling Pd: block (bx, by) computes one TILE_WIDTH × TILE_WIDTH tile Pd<sub>sub</sub>, and thread (tx, ty) one element of it (after Kirk &amp; Hwu, Fig. 4.3)." >}}

<div class="example">

With `TILE_WIDTH` = 2, a 4 × 4 Pd is divided into 4 tiles, computed by 2 × 2 blocks of 2 × 2 threads (below). Thread (0, 0) of block (1, 0) computes element $(1 \times 2 + 0,\ 0 \times 2 + 0) = (2, 0)$, that is, Pd<sub>2,0</sub>. Block (0, 0) computes Pd<sub>0,0</sub>, Pd<sub>1,0</sub>, Pd<sub>0,1</sub> and Pd<sub>1,1</sub>: thread (0, 0) takes row 0 of Md and column 0 of Nd, thread (1, 0) row 0 of Md and column 1 of Nd, and so on.

</div>

{{< figure src="/images/computer-systems/gpu-computing/cuda_threads/multiple_blocks_compute_pd.svg" alt="Using multiple blocks to compute Pd" width="380px" class="fig" caption="A small example with <code>TILE_WIDTH</code> = 2: Pd (4 × 4) is computed by 2 × 2 blocks of 2 × 2 threads. Thread (0, 0) of block (1, 0) computes Pd<sub>2,0</sub> (after Kirk &amp; Hwu, Fig. 4.4)." >}}

{{< figure src="/images/computer-systems/gpu-computing/cuda_threads/matrix_multiplication_actions_thread_block.svg" alt="Matrix multiplication actions of one thread block" width="420px" class="fig" caption="Matrix multiplication actions of block (0, 0): its four threads compute Pd<sub>0,0</sub>, Pd<sub>1,0</sub>, Pd<sub>0,1</sub> and Pd<sub>1,1</sub> from rows 0–1 of Md and columns 0–1 of Nd (shaded) (after Kirk &amp; Hwu, Fig. 4.5)." >}}

<figure class="fig">

```c
__global__ void MatrixMulKernel(float* Md, float* Nd, float* Pd, int Width)
{
    // Calculate the row index of the Pd element and Md
    int Row = blockIdx.y * TILE_WIDTH + threadIdx.y;
    // Calculate the column index of Pd and Nd
    int Col = blockIdx.x * TILE_WIDTH + threadIdx.x;

    float Pvalue = 0;
    // each thread computes one element of the block sub-matrix
    for (int k = 0; k < Width; ++k)
        Pvalue += Md[Row * Width + k] * Nd[k * Width + Col];

    Pd[Row * Width + Col] = Pvalue;
}
```

<figcaption>Matrix multiplication kernel using multiple blocks (after Kirk &amp; Hwu, Fig. 4.6).</figcaption>
</figure>

The host now launches `Width/TILE_WIDTH` blocks in each dimension. Md, Nd and Pd are still treated as 1D row-major arrays, with the same index calculations as before.

<figure class="fig">

```c
// Setup the execution configuration
dim3 dimGrid(Width / TILE_WIDTH, Width / TILE_WIDTH);
dim3 dimBlock(TILE_WIDTH, TILE_WIDTH);

// Launch the device computation threads!
MatrixMulKernel<<<dimGrid, dimBlock>>>(Md, Nd, Pd, Width);
```

<figcaption>Revised host code for launching the revised kernel (after Kirk &amp; Hwu, Fig. 4.7).</figcaption>
</figure>

The code assumes `Width` is a multiple of `TILE_WIDTH`. For other sizes, the number of blocks is rounded up, and the threads of the partial tiles at the right and bottom edges check that their element exists:

```c
dim3 dimGrid((Width + TILE_WIDTH - 1) / TILE_WIDTH, (Width + TILE_WIDTH - 1) / TILE_WIDTH);
...
if (Row < Width && Col < Width) {      // in the kernel: skip elements outside Pd
    float Pvalue = 0;
    for (int k = 0; k < Width; ++k)
        Pvalue += Md[Row * Width + k] * Nd[k * Width + Col];
    Pd[Row * Width + Col] = Pvalue;
}
```

`(Width + TILE_WIDTH - 1) / TILE_WIDTH` is the integer form of $\lceil \text{Width}/\text{TILE\_WIDTH} \rceil$.

### Synchronization and Transparent Scalability

Threads of the same block coordinate with the barrier synchronization function `__syncthreads()`. A thread that calls it waits at that point until every thread of the block has reached it, so all threads of a block finish one phase of the kernel before any of them moves on to the next. (Four friends who shop in different stores of a mall must all return to the car before they leave; without the barrier someone could be left behind.)

`__syncthreads()` must be executed by **all** threads of a block. If it is inside an `if` statement, either all threads take the path with it or none do. If both branches of an `if–then–else` have a `__syncthreads()`, these are two different barriers: if some threads take the `then` path and others the `else` path, the program is incorrect: the threads wait at different barrier points and can end up waiting for each other forever.

Synchronization also constrains execution: threads of a block must run close together in time to avoid long waits. The CUDA runtime ensures this by assigning execution resources to **all threads of a block as a unit**.

This leads to a major trade-off. Threads in **different blocks cannot synchronize** with each other, so the runtime can run blocks in any order relative to each other, since none waits for another. A low-cost GPU can run a few blocks at a time and a high-end GPU many, with the same code (below). A laptop GPU can run an application slowly at low power, and a desktop GPU faster at higher power, without any change to the code.

<div class="definition">

**Transparent scalability** is the ability to execute the same application code on hardware with different numbers of execution resources.

</div>

{{< figure src="/images/computer-systems/gpu-computing/cuda_threads/transparent_scalability.svg" alt="Transparent scalability" width="680px" class="fig" caption="Transparent scalability: because blocks cannot synchronize with each other, a small GPU can run two blocks at a time and a large GPU four, with the same code (after Kirk &amp; Hwu, Fig. 4.8)." >}}

### Thread Assignment

When a kernel is launched, the runtime generates its grid, and the threads are assigned to execution resources **block by block**. The execution resources are organized into streaming multiprocessors. On the RTX 3060 Laptop GPU, each of the 30 SMs can hold:

- up to **16 blocks**,
- up to **1536 threads** (48 warps),
- as long as the blocks' registers (65,536 per SM) and shared memory (up to 100 KB per SM) fit.

If there are not enough resources for 16 blocks, the runtime reduces the number of blocks assigned to each SM until the usage fits. With 30 SMs, up to 480 blocks or 46,080 threads can be resident at once. Most grids have many more blocks: the runtime keeps a list of blocks to execute and assigns new blocks to SMs as earlier ones complete.

{{< figure src="/images/computer-systems/gpu-computing/cuda_threads/thread_block_assignment_sms.svg" alt="Thread block assignment to SMs" width="620px" class="fig" caption="Thread blocks are assigned to SMs whole; each SM of the RTX 3060 can hold up to 16 blocks or 1536 threads, as long as their registers and shared memory fit (after Kirk &amp; Hwu, Fig. 4.9, with the SM limits of compute capability 8.6)." >}}

<div class="example">

The 1536 threads of an SM can be 6 blocks of 256 threads, 12 blocks of 128, or 16 blocks of 96. With fewer than 96 threads per block, the 16-block limit is reached before the thread limit, and some thread slots stay empty (the example at the end of this chapter works this out for matrix multiplication). Different GPUs have different limits, and transparent scalability lets the same code run on all of them.

</div>

### Thread Scheduling and Latency Tolerance

Thread scheduling is an implementation concept, so it depends on the hardware. Once a block is assigned to an SM, it is divided into 32-thread units called **warps**. Warps are not part of the CUDA language, but knowing about them helps in understanding and optimizing performance. The warp size has been 32 on every NVIDIA GPU so far. **The warp is the unit of thread scheduling in an SM**: the SM fetches one instruction for a warp and executes it for all 32 threads at once, each on its own data. NVIDIA calls this execution style **SIMT** (single instruction, multiple threads); how it handles threads of a warp that take different branches is the subject of [More on Thread Execution](#more-on-thread-execution).

Each warp consists of 32 threads of consecutive `threadIdx` values: threads 0–31 form the first warp, 32–63 the second, and so on. In a 2D or 3D block, the threads are first ordered with `threadIdx.x` varying fastest, then `threadIdx.y`, then `threadIdx.z`, and this linear order is cut into warps. The number of warps in an SM follows from the block size and the number of blocks.

<div class="example">

With blocks of 256 threads, each block has $256/32 = 8$ warps. On the RTX 3060, 6 such blocks fill an SM with $6 \times 8 = 48$ warps, the maximum, since $1536/32 = 48$.

</div>

{{< figure src="/images/computer-systems/gpu-computing/cuda_threads/ga106_streaming_multiprocessor_warps_resident_blocks.svg" alt="A GA106 streaming multiprocessor and the warps of its resident blocks" width="700px" class="fig" caption=`Blocks resident in an SM are split into 32-thread warps, which the SM's four warp schedulers issue to the execution units (replaces Kirk &amp; Hwu, Fig. 4.10, with the GA106 SM from the Ampere whitepaper <a href="#ref-3">[3]</a>). Each processing block issues one warp instruction per clock.` >}}

An SM has many more threads than execution lanes: 48 warps of 32 threads for 128 FP32 lanes, and each of the SM's four processing blocks (in the figure above) issues only one warp instruction per clock. The extra warps are how GPUs execute **long-latency operations** such as global memory accesses, which take hundreds of cycles. When the next instruction of a warp must wait for the result of an earlier long-latency operation, the warp is not selected; another resident warp whose operands are ready is selected instead, by a priority mechanism if several are ready. This is called **latency hiding**. It also hides other latencies, such as pipelined floating-point arithmetic and branches. With enough warps, the hardware likely finds one ready to execute at any time.

Selecting a ready warp adds no idle cycles to the execution timeline, which is called **zero-overhead thread scheduling**: each warp's registers stay in the SM's register file, so switching warps needs no saving or restoring of state (unlike the context switch of an OS, [Part II](/posts/computer-systems-2/)). This is the fine-grained multithreading of [Part III](/posts/computer-systems-3/#hardware-multithreading), with dozens of threads per core instead of two. Being able to tolerate long latencies is the main reason GPUs do not spend nearly as much chip area on caches and branch prediction as CPUs, and spend it on floating-point execution units instead.

<div class="example">

Should a matrix multiplication on the RTX 3060 use 8 × 8, 16 × 16 or 32 × 32 thread blocks? (Registers and shared memory also matter; see [Memory as a Limiting Factor to Parallelism](#memory-as-a-limiting-factor-to-parallelism).)

- **8 × 8**: 64 threads per block. Filling the 1536 thread slots would need $1536/64 = 24$ blocks, but an SM holds at most 16, so it gets $16 \times 64 = 1024$ threads (32 warps, 2/3 of the maximum). There are fewer warps to schedule around long-latency operations.
- **16 × 16**: 256 threads per block, $1536/256 = 6$ blocks per SM, within the 16-block limit. This gives the full 1536 threads and 48 warps: a good configuration.
- **32 × 32**: 1024 threads per block. This is allowed, but only one block fits in an SM, since two would need 2048 threads, so the SM again has only 1024 threads.

</div>


## CUDA Memories

The kernels so far read their data from global memory, which is DRAM with long access latency (hundreds of clock cycles) and finite bandwidth. Many threads can in theory tolerate the latency, but traffic congestion in the global memory access paths can easily keep all but a few threads from making progress and leave SMs idle. CUDA provides other memories that can remove most of the requests to global memory.

### Importance of Memory Access Efficiency

The time of the matrix multiplication kernel ([Fig. 4.6 version](#using-blockidx-and-threadidx)) is spent in the dot-product loop. Each iteration does two global memory accesses (one Md and one Nd element) for one floating-point multiplication and one addition.

<div class="definition">

The **compute to global memory access (CGMA) ratio** is the number of floating-point calculations performed for each access to global memory within a region of a CUDA program.

</div>

The kernel's CGMA ratio is $2/2 = 1.0$, and this limits its speed: the floating-point rate cannot exceed the rate at which operands arrive from global memory.

<div class="example">

The RTX 3060 Laptop GPU has 336 GB/s of global memory bandwidth. With 4 bytes per single-precision value, it can load at most $336/4 = 84$ billion operands per second. With a CGMA ratio of 1.0, the kernel runs at no more than **84 GFLOPS**, which is less than 1% of the 10.9 TFLOPS peak. To reach the peak, the kernel would need a CGMA ratio of $10{,}944/84 \approx 130$. (The first CUDA GPU had 86.4 GB/s and 367 GFLOPS, so CGMA 1.0 gave 6% of its peak: compute has grown much faster than bandwidth.)

</div>

This is the roofline model of [Part III](/posts/computer-systems-3/#the-roofline-model): the CGMA ratio is the arithmetic intensity in FLOPs per operand (divide by 4 for FLOPs per byte), and the ridge point of the RTX 3060 is at $10{,}944/336 = 32.6$ FLOP/byte, or about 130 FLOPs per float.

### CUDA Device Memory Types

CUDA has several memories that help programmers reach high CGMA ratios. In the memory model of [the previous chapter](#device-memories-and-data-transfer):

- **Global memory** and **constant memory** can be written and read by the host through API functions. Constant memory gives short-latency, high-bandwidth, read-only access by the device **when all threads access the same location at the same time**.
- **Registers** and **shared memory** are on-chip. Variables in them are accessed at very high speed and in a highly parallel manner. Registers are allocated to individual threads, and each thread can access only its own. Shared memory is allocated to thread blocks: all threads of a block can access the shared variables of that block, which makes it an efficient way for threads to cooperate by sharing input data and intermediate results.

By declaring a variable in one of these memories, the programmer sets its visibility and access speed. Each declaration also gives the variable a **scope**, the set of threads that can access it (a single thread, all threads of a block, or all threads of all grids), and a **lifetime**, the part of the execution during which it exists (one kernel invocation, or the whole application).

<figure class="table">
<figcaption>CUDA variable type qualifiers (after Kirk &amp; Hwu, Table 5.1).</figcaption>

| Variable declaration | Memory | Scope | Lifetime |
|:--|:--|:--|:--|
| Automatic variables other than arrays | Register | Thread | Kernel |
| Automatic array variables | Local | Thread | Kernel |
| `__device__ __shared__ int SharedVar;` | Shared | Block | Kernel |
| `__device__ int GlobalVar;` | Global | Grid | Application |
| `__device__ __constant__ int ConstVar;` | Constant | Grid | Application |

</figure>

- A variable with **thread scope** gets a private version for every thread: a kernel launched with a million threads creates a million versions, each initialized and used by its own thread.
- A variable with **kernel lifetime** is declared inside the kernel body and used only by the kernel's code; its contents are not kept across invocations, so each invocation must initialize it. A variable with **application lifetime** is declared outside any function; its contents persist through the whole execution and are available to all kernels.

**Automatic scalar variables** declared in kernels and device functions go into registers, with thread scope. In the kernel, `tx`, `ty` and `Pvalue` are such variables. They are extremely fast to access, but the register file is limited ([Memory as a Limiting Factor to Parallelism](#memory-as-a-limiting-factor-to-parallelism)).

**Automatic array variables** are not stored in registers (unless all accesses use constant indices) but in **local memory**, which is per-thread space in global memory, with its long latency. Local memory also holds registers that the compiler *spills* when a thread needs more than are available. Local memory is cached in L1 and L2, which reduces but does not remove the cost. Automatic arrays are seldom needed in kernels.

**Shared variables** are declared with `__shared__` (optionally `__device__ __shared__`), typically inside a kernel or device function. All threads of a block see the same version, each block gets its own, and the contents end with the kernel. Shared memory is commonly used to hold the part of global memory data that is heavily used in a phase of the kernel; the algorithm may have to be changed to create such phases, as with matrix multiplication below. A shared array whose size is set at launch time is declared `extern __shared__ float SharedArray[];` and its size in bytes is the third execution configuration parameter.

**Constant variables** are declared with `__constant__` (optionally `__device__ __constant__`) outside any function body. All threads of all grids see the same version, for the whole application. They are typically used for input values to kernels. Constant variables are stored in global memory but **cached**; with appropriate access patterns, accessing them is extremely fast. The total size of constant variables is limited to 64 KB (65,536 bytes), so large inputs may have to be broken up ([Computing FHd](#computing-fhd)). The host writes a constant variable with `cudaMemcpyToSymbol()`:

```c
__constant__ float coeff[16];                     // polynomial coefficients
// host: cudaMemcpyToSymbol(coeff, h_coeff, 16 * sizeof(float));

__global__ void poly(const float* x, float* y, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) {
        float v = 0.0f;
        for (int k = 15; k >= 0; --k)
            v = v * x[i] + coeff[k];              // Horner's rule
        y[i] = v;
    }
}
```

In each iteration, all threads of a warp read the same `coeff[k]`, which the constant cache serves with one access broadcast to the warp; if the threads of a warp read different constant addresses, the accesses are serialized. [[13]](#ref-13)

A variable declared with only `__device__` is a **global variable** in global memory. Accesses are slow, but global variables are visible to all threads of all kernels and persist through the execution, so they can be used for threads in different blocks to collaborate. Coordinating blocks within a kernel needs atomic operations and memory fences ([Histogram and Atomic Operations](#parallel-patterns-histogram-and-atomic-operations)) or a cooperative launch, so global variables are mostly used to pass information from one kernel invocation to the next.

Pointers in kernels point to data in global memory. They arise in two ways: an object allocated by a host function with `cudaMalloc()` is passed to the kernel as a pointer parameter (`Md`, `Nd`, `Pd`), or the address of a global variable is assigned to a pointer, as in `float *ptr = &GlobalVar;`.

Global loads are also cached, in an on-chip L2 shared by all SMs and in each SM's L1 data cache, which shares the 128 KB array with shared memory. The programmer chooses the split per kernel, from 0 to 100 KB of shared memory. The caches catch some of the reuse automatically, but the explicit use of shared memory described next is still much more effective.

### A Strategy for Reducing Global Memory Traffic

There is an intrinsic trade-off: global memory is large but slow, and shared memory is small but fast. A common strategy is to partition the data into subsets called **tiles** so that each tile fits in shared memory, the way a large wall (the global memory data) is covered by tiles. The computations on the tiles must be independent of each other; not every data structure can be tiled for an arbitrary kernel.

Take matrix multiplication with four 2 × 2 blocks computing Pd ([the block-actions figure](#using-blockidx-and-threadidx)). The four threads of block (0, 0) compute Pd<sub>0,0</sub>, Pd<sub>1,0</sub>, Pd<sub>0,1</sub> and Pd<sub>1,1</sub>, and each reads four elements of Md and four of Nd. The global memory accesses of the block, in the order they are made, are:

<figure class="table">
<figcaption>Global memory accesses of the threads in block (0, 0); time increases downward (after Kirk &amp; Hwu, Fig. 5.4).</figcaption>

| Pd<sub>0,0</sub> Thread(0,0) | Pd<sub>1,0</sub> Thread(1,0) | Pd<sub>0,1</sub> Thread(0,1) | Pd<sub>1,1</sub> Thread(1,1) |
|:-:|:-:|:-:|:-:|
| Md<sub>0,0</sub> · Nd<sub>0,0</sub> | Md<sub>0,0</sub> · Nd<sub>1,0</sub> | Md<sub>0,1</sub> · Nd<sub>0,0</sub> | Md<sub>0,1</sub> · Nd<sub>1,0</sub> |
| Md<sub>1,0</sub> · Nd<sub>0,1</sub> | Md<sub>1,0</sub> · Nd<sub>1,1</sub> | Md<sub>1,1</sub> · Nd<sub>0,1</sub> | Md<sub>1,1</sub> · Nd<sub>1,1</sub> |
| Md<sub>2,0</sub> · Nd<sub>0,2</sub> | Md<sub>2,0</sub> · Nd<sub>1,2</sub> | Md<sub>2,1</sub> · Nd<sub>0,2</sub> | Md<sub>2,1</sub> · Nd<sub>1,2</sub> |
| Md<sub>3,0</sub> · Nd<sub>0,3</sub> | Md<sub>3,0</sub> · Nd<sub>1,3</sub> | Md<sub>3,1</sub> · Nd<sub>0,3</sub> | Md<sub>3,1</sub> · Nd<sub>1,3</sub> |

</figure>

The accesses overlap heavily. Thread (0, 0) and thread (1, 0) both read Md<sub>1,0</sub> and the rest of row 0 of Md; thread (1, 0) and thread (1, 1) both read Nd<sub>1,0</sub> and the rest of column 1 of Nd. Every Md and Nd element is read exactly **twice** by the block. If the threads collaborated so that each element were loaded from global memory only once, the traffic would be halved. In general, with $N \times N$ blocks the traffic can be reduced by a factor of $N$; with 16 × 16 blocks, to 1/16.

The algorithm has the threads of a block **collaboratively load** Md and Nd elements into shared memory before they use them individually in their dot products. Shared memory is small, so Md and Nd are divided into tiles that fit in it; in the simplest form, the tiles have the same dimensions as the block.

{{< figure src="/images/computer-systems/gpu-computing/cuda_memories/tiling_md_nd_2_2_tiles.svg" alt="Tiling Md and Nd into 2 by 2 tiles" width="420px" class="fig" caption="Tiling Md and Nd into 2 × 2 tiles (thick lines) so that each tile fits in shared memory; block (0, 0) uses the shaded row tiles of Md and column tiles of Nd, one pair per phase (after Kirk &amp; Hwu, Fig. 5.5)." >}}

The dot product of each thread is now divided into **phases**. In each phase, all threads of the block load one tile of Md and one tile of Nd into shared memory, **each thread loading one Md element and one Nd element**. The shared arrays are called Mds and Nds. In phase 1, thread (0, 0) loads Md<sub>0,0</sub> into Mds<sub>0,0</sub>, thread (1, 0) loads Md<sub>1,0</sub> into Mds<sub>1,0</sub>, and so on, and the Nd tile is loaded in the same way. Then each thread accumulates two products from shared memory into its `Pvalue`:

<figure class="table">
<figcaption>Execution phases of the tiled matrix multiplication; time increases to the right (after Kirk &amp; Hwu, Fig. 5.6).</figcaption>

| | Phase 1 loads | Phase 1 compute | Phase 2 loads | Phase 2 compute |
|:-:|:--|:--|:--|:--|
| T<sub>0,0</sub> | Md<sub>0,0</sub>→Mds<sub>0,0</sub>, Nd<sub>0,0</sub>→Nds<sub>0,0</sub> | PValue<sub>0,0</sub> += Mds<sub>0,0</sub>·Nds<sub>0,0</sub> + Mds<sub>1,0</sub>·Nds<sub>0,1</sub> | Md<sub>2,0</sub>→Mds<sub>0,0</sub>, Nd<sub>0,2</sub>→Nds<sub>0,0</sub> | PValue<sub>0,0</sub> += Mds<sub>0,0</sub>·Nds<sub>0,0</sub> + Mds<sub>1,0</sub>·Nds<sub>0,1</sub> |
| T<sub>1,0</sub> | Md<sub>1,0</sub>→Mds<sub>1,0</sub>, Nd<sub>1,0</sub>→Nds<sub>1,0</sub> | PValue<sub>1,0</sub> += Mds<sub>0,0</sub>·Nds<sub>1,0</sub> + Mds<sub>1,0</sub>·Nds<sub>1,1</sub> | Md<sub>3,0</sub>→Mds<sub>1,0</sub>, Nd<sub>1,2</sub>→Nds<sub>1,0</sub> | PValue<sub>1,0</sub> += Mds<sub>0,0</sub>·Nds<sub>1,0</sub> + Mds<sub>1,0</sub>·Nds<sub>1,1</sub> |
| T<sub>0,1</sub> | Md<sub>0,1</sub>→Mds<sub>0,1</sub>, Nd<sub>0,1</sub>→Nds<sub>0,1</sub> | PValue<sub>0,1</sub> += Mds<sub>0,1</sub>·Nds<sub>0,0</sub> + Mds<sub>1,1</sub>·Nds<sub>0,1</sub> | Md<sub>2,1</sub>→Mds<sub>0,1</sub>, Nd<sub>0,3</sub>→Nds<sub>0,1</sub> | PValue<sub>0,1</sub> += Mds<sub>0,1</sub>·Nds<sub>0,0</sub> + Mds<sub>1,1</sub>·Nds<sub>0,1</sub> |
| T<sub>1,1</sub> | Md<sub>1,1</sub>→Mds<sub>1,1</sub>, Nd<sub>1,1</sub>→Nds<sub>1,1</sub> | PValue<sub>1,1</sub> += Mds<sub>0,1</sub>·Nds<sub>1,0</sub> + Mds<sub>1,1</sub>·Nds<sub>1,1</sub> | Md<sub>3,1</sub>→Mds<sub>1,1</sub>, Nd<sub>1,3</sub>→Nds<sub>1,1</sub> | PValue<sub>1,1</sub> += Mds<sub>0,1</sub>·Nds<sub>1,0</sub> + Mds<sub>1,1</sub>·Nds<sub>1,1</sub> |

</figure>

Each value in shared memory is used twice: Md<sub>1,1</sub>, loaded by thread (1, 1) into Mds<sub>1,1</sub>, is used by thread (0, 1) and thread (1, 1). Loading each global value once and using it several times halves the number of global memory accesses here, and reduces it by a factor of $N$ with $N \times N$ tiles. In general, with matrices of dimension `Width` and tiles of `TILE_WIDTH`, the dot product takes `Width/TILE_WIDTH` phases. **Creating these phases is the key to the reduction**: each phase focuses on a small subset of the input values, which the threads load together and then use to satisfy their overlapping needs.

The same Mds and Nds are reused in every phase, so a small shared memory serves most of the accesses. Such focused access behaviour is called **locality**. When an algorithm has locality, small high-speed memories can serve most of the accesses and remove them from global memory; this is as important for multicore CPUs (whose caches exploit it) as for GPUs.

<figure class="fig">

```c
__global__ void MatrixMulKernel(float* Md, float* Nd, float* Pd, int Width)
{
 1:  __shared__ float Mds[TILE_WIDTH][TILE_WIDTH];
 2:  __shared__ float Nds[TILE_WIDTH][TILE_WIDTH];

 3:  int bx = blockIdx.x;  int by = blockIdx.y;
 4:  int tx = threadIdx.x; int ty = threadIdx.y;

     // Identify the row and column of the Pd element to work on
 5:  int Row = by * TILE_WIDTH + ty;
 6:  int Col = bx * TILE_WIDTH + tx;

 7:  float Pvalue = 0;
     // Loop over the Md and Nd tiles required to compute the Pd element
 8:  for (int m = 0; m < Width / TILE_WIDTH; ++m) {
         // Collaborative loading of Md and Nd tiles into shared memory
 9:      Mds[ty][tx] = Md[Row * Width + (m * TILE_WIDTH + tx)];
10:      Nds[ty][tx] = Nd[(m * TILE_WIDTH + ty) * Width + Col];
11:      __syncthreads();

12:      for (int k = 0; k < TILE_WIDTH; ++k)
13:          Pvalue += Mds[ty][k] * Nds[k][tx];
14:      __syncthreads();
     }
15:  Pd[Row * Width + Col] = Pvalue;
}
```

<figcaption>Tiled matrix multiplication kernel using shared memory (after Kirk &amp; Hwu, Fig. 5.7). The line numbers are not part of the code.</figcaption>
</figure>

- **Lines 1–2** declare Mds and Nds as shared variables. Their scope is a block, so all threads of a block see the values loaded by their peers.
- **Lines 3–4** copy `threadIdx` and `blockIdx` into automatic variables, which live in registers, one private copy per thread.
- **Lines 5–6** compute the row and column of the Pd element. A thread in block `bx` has `bx` blocks of `TILE_WIDTH` threads before it in x, covering `bx*TILE_WIDTH` columns, and is the `tx`-th thread of its own block, so its column is `bx*TILE_WIDTH + tx`; the row is `by*TILE_WIDTH + ty` likewise. For example, thread (1, 0) of block (0, 1) computes the element with x index $0 \times 2 + 1 = 1$ and y index $1 \times 2 + 0 = 2$, Pd<sub>1,2</sub>.
- **Line 8** loops over the phases; `m` is the number of phases already done, so `m*TILE_WIDTH` pairs of elements have been processed.
- **Lines 9–10** load one Md and one Nd element per thread. The row of Md and column of Nd are already known (`Row`, `Col`), so only the column of Md and the row of Nd are needed: the tile starts at `m*TILE_WIDTH`, and each thread loads the element at offset `tx` (for Md) or `ty` (for Nd) from there. Since `Row` depends on `ty` and `Col` on `tx`, the `TILE_WIDTH²` threads load `TILE_WIDTH²` distinct elements.
- **Line 11** is a barrier: all threads must finish loading the tiles before any thread uses them.
- **Lines 12–13** compute the phase's part of the dot product from shared memory.
- **Line 14** is a second barrier: all threads must finish using Mds and Nds before any thread loops back and overwrites them with the next tiles.

{{< figure src="/images/computer-systems/gpu-computing/cuda_memories/calculation_matrix_indices_tiled_multiplication.svg" alt="Calculation of the matrix indices in tiled multiplication" width="530px" class="fig" caption="Index calculation in the tiled kernel: block (bx, by) walks along row band <code>by</code> of Md and column band <code>bx</code> of Nd; in phase <code>m</code> it loads the darker tiles into Mds and Nds, and the loop over <code>k</code> runs across them (after Kirk &amp; Hwu, Fig. 5.8)." >}}

With $T \times T$ tiles, each thread does 2 global loads per phase and $2T$ floating-point operations, so the CGMA ratio rises from 1 to $T$: **the global memory accesses are reduced by a factor of `TILE_WIDTH`**.

<div class="example">

On the RTX 3060, 16 × 16 tiles let the 84 G operands/s of bandwidth support $84 \times 16 = 1344$ GFLOPS, and 32 × 32 tiles $84 \times 32 = 2688$ GFLOPS, 12% and 25% of the peak. On the first CUDA GPU, 16 × 16 tiles brought the bound close to its peak; on the RTX 3060, with 30 times the compute but only 4 times the bandwidth, tiling in shared memory is not enough by itself; fast matrix multiplication also tiles in registers, so that each thread computes several elements ([Thread Granularity](#thread-granularity)), and uses the tensor cores.

</div>

### Texture and Read-Only Memory

GPUs keep the **texture units** of their graphics pipeline ([texture mapping](#the-era-of-fixed-function-graphics-pipelines)), several per SM, and CUDA can use them. **Texture memory** is not a separate memory: it is global memory read through the texture units and their cache, which add four features:

- **A cache for 2D locality.** Texels are stored in a layout (a *CUDA array*, block-linear rather than row-major) in which points close in 2D are close in memory, so a warp reading a small 2D neighbourhood hits the cache even when the addresses would be far apart in a row-major array.
- **Addressing in hardware.** Coordinates may be normalized to $[0, 1)$, independent of the image size, and out-of-range coordinates are handled by an **addressing mode**: wrap (repeat), clamp (repeat the edge texel), mirror, or border (return a constant). No bounds tests are needed in the kernel.
- **Filtering in hardware.** With *point* filtering a fetch returns the nearest texel; with **linear** filtering the unit fetches the 2 (1D), 4 (2D) or 8 (3D) nearest texels and interpolates them, at no extra instruction cost. The weights are computed with 9-bit fixed point (8 fractional bits), which is enough for images but not for accurate numerics.
- **Format conversion.** 8- and 16-bit integer texels can be returned as floats normalized to $[0, 1]$ (or $[-1, 1]$ for signed types), so an 8-bit RGBA image is read as `float4` colours.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/cuda_memories/wrap.svg" alt="Wrap" width="300px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/cuda_memories/clamp.svg" alt="Clamp" width="300px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/cuda_memories/mirror.svg" alt="Mirror" width="300px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/cuda_memories/border.svg" alt="Border" width="300px" style="margin:0" >}}
</div>
<figcaption>Texture addressing modes for a 4-texel row (1 2 3 4, thick cells) read outside its range: wrap repeats it, clamp repeats the edge texel, mirror reflects it, and border returns a border value (0 here).</figcaption>
</figure>

**Bilinear filtering.** Texel $(i, j)$ is centred at $(i + 0.5, j + 0.5)$. For a sample at $(u, v)$ in texel units, the unit computes $x_B = u - 0.5$, $y_B = v - 0.5$, the integer parts $i = \lfloor x_B \rfloor$, $j = \lfloor y_B \rfloor$, and the fractions $\alpha = x_B - i$, $\beta = y_B - j$, and returns

$$
(1 - \alpha)(1 - \beta)\, T_{i,j} + \alpha (1 - \beta)\, T_{i+1,j} + (1 - \alpha)\beta\, T_{i,j+1} + \alpha\beta\, T_{i+1,j+1}.
$$

{{< figure src="/images/computer-systems/gpu-computing/cuda_memories/bilinear_filtering_between_four_texels.svg" alt="Bilinear filtering between four texels" width="520px" class="fig" caption="Bilinear filtering: the texture unit fetches the four texels around the sample point and blends them with weights from the fractional position (α, β). Texel centres are at half-integer coordinates, hence the − 0.5." >}}

<div class="example">

A 1D texture holds 10, 20, 30, 40. A linear-filtered fetch at $u = 2.25$ gives $x_B = 1.75$, $i = 1$, $\alpha = 0.75$: $(1 - 0.75) \times 20 + 0.75 \times 30 = 27.5$. A fetch at $u = 2.5$, the centre of texel 2, returns exactly 30. With clamp addressing, a fetch at $u = -3$ returns 10; with wrap and normalized coordinates, $u = 1.25$ reads the same place as $u = 0.25$.

</div>

A texture is described by a **texture object**, created on the host from a resource (the memory) and a texture descriptor (addressing, filtering, read mode), and passed to the kernel as an ordinary argument. The kernel reads it with `tex1D`, `tex2D` or `tex3D`:

<figure class="fig">

```c
// Host: put an RGBA8 image into a CUDA array and create a texture object
cudaChannelFormatDesc ch = cudaCreateChannelDesc<uchar4>();
cudaArray_t arr;
cudaMallocArray(&arr, &ch, w, h);
cudaMemcpy2DToArray(arr, 0, 0, img, w * sizeof(uchar4), w * sizeof(uchar4), h,
                    cudaMemcpyHostToDevice);

cudaResourceDesc res = {};
res.resType = cudaResourceTypeArray;
res.res.array.array = arr;
cudaTextureDesc td = {};
td.addressMode[0] = td.addressMode[1] = cudaAddressModeClamp;
td.filterMode = cudaFilterModeLinear;            // bilinear filtering in hardware
td.readMode = cudaReadModeNormalizedFloat;       // uchar4 -> float4 in [0, 1]
td.normalizedCoords = 1;                         // coordinates in [0, 1)
cudaTextureObject_t tex;
cudaCreateTextureObject(&tex, &res, &td, NULL);

// Device: resize the image to W x H; every output pixel is one filtered fetch
__global__ void resize(cudaTextureObject_t tex, float4* out, int W, int H) {
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x < W && y < H) {
        float u = (x + 0.5f) / W, v = (y + 0.5f) / H;   // centre of output pixel
        out[y * W + x] = tex2D<float4>(tex, u, v);
    }
}
```

<figcaption>Resizing an image with a texture object: addressing, bilinear filtering and conversion to float are done by the texture unit.</figcaption>
</figure>

Texture data are **read-only** during a kernel: the texture cache is not kept coherent with writes, so a kernel must not write the memory it reads through a texture. Writing a CUDA array is done through a **surface** object (`surf2Dwrite`).

For ordinary arrays that are only read by a kernel, the same cache can be used without creating a texture: the **read-only data path**. A load through `__ldg(&a[i])`, or through a pointer declared `const float* __restrict__ a`, tells the compiler that the data do not change and are not aliased by other pointers during the kernel, so it can use the non-coherent read-only path and reorder the loads more freely. On the RTX 3060 the texture cache and the L1 data cache are the same array, so the gain is smaller than on older GPUs, but `__restrict__` still helps the compiler. Read-only data accessed by all threads of a warp at the same address belong in constant memory instead (one broadcast); read-only data accessed at different addresses with 2D locality belong in a texture.

### Memory as a Limiting Factor to Parallelism

Registers, shared memory and constant memory are effective at reducing global memory accesses, but their capacity is limited, and exceeding it limits the number of threads that can reside in an SM. In general, **the more memory each thread needs, the fewer threads can reside in each SM**.

**Registers.** Each SM of the RTX 3060 has 65,536 registers, about 2 million for the chip. To fill the 1536 thread slots, each thread can use only $65{,}536/1536 = 42.7$ registers, and since registers are allocated in units of 256 per warp (8 per thread), the limit is 40. If each thread needs more, fewer threads can reside, and the reduction happens one **block** at a time.

<div class="example">

A kernel with 256-thread blocks uses 40 registers per thread: a block needs $256 \times 40 = 10{,}240$ registers, and $65{,}536/10{,}240 = 6.4$, so 6 blocks (1536 threads) fit. If a code change raises the use to 48 registers per thread, a block needs 12,288 registers and only $\lfloor 65{,}536/12{,}288 \rfloor = 5$ blocks fit: 1280 threads, one sixth fewer warps to hide latency. A slight increase in resource use that causes such a large drop in parallelism is called a **performance cliff**.

</div>

**Shared memory.** Shared memory is used per block. The RTX 3060 can give up to 100 KB of each SM's 128 KB to shared memory, and the system reserves 1 KB per block. To have the maximum of 16 blocks in an SM, each block can use at most $100/16 - 1 = 5.25$ KB. If blocks use more, fewer fit: with 24 KB per block, $\lfloor 100/25 \rfloor = 4$ blocks. A block can statically declare up to 48 KB; more (up to 99 KB) must be dynamic shared memory requested with `cudaFuncSetAttribute()`.

<div class="example">

In the tiled matrix multiplication with 16 × 16 tiles, each block needs $16 \times 16 \times 4 = 1$ KB for Mds and 1 KB for Nds, 2 KB in all (3 KB with the reserved space). Shared memory would allow $\lfloor 100/3 \rfloor = 33$ blocks, more than the 16-block limit, so it is not the limiting factor. The real limit is the 1536 threads per SM, which allows 6 blocks of 256 threads, using only $6 \times 2 = 12$ KB of shared memory. With 32 × 32 tiles, a block needs 8 KB, but only one 1024-thread block fits.

</div>

<div class="definition">

The **occupancy** of a kernel is the number of warps resident in an SM divided by the maximum number of warps the SM can hold.

</div>

In the register example above, the occupancy drops from $48/48 = 100\%$ to $40/48 = 83\%$. The limits differ between GPU generations, but a program can query them at run time with `cudaGetDeviceProperties()`, and `cudaOccupancyMaxActiveBlocksPerMultiprocessor()` (or the occupancy view of Nsight Compute) computes how many blocks of a kernel fit in an SM; [Calculating Occupancy](#calculating-occupancy) gives the general formula. The limits of all compute capabilities are tabulated in the CUDA Programming Guide [[2]](#ref-2).


## Performance Considerations

A CUDA kernel runs correctly on any CUDA device, but its speed varies greatly with the resource constraints of each device. Different constraints dominate in different applications, and performance can often be improved, sometimes dramatically, by **trading one resource for another**. This works only if the constraint relieved was the one limiting performance and the one made worse does not hurt parallel execution; without understanding these constraints, performance tuning is guesswork.

The measurements in this chapter were made on my RTX 3060 Laptop GPU with CUDA 12.6 (`nvcc -O3 -arch=sm_86`). For reference, a kernel of independent FMAs reached **9.9 TFLOPS**, a device-to-device copy **311 GB/s** (93% of the 336 GB/s peak), and cuBLAS `sgemm` on 2048 × 2048 matrices **6.6 TFLOPS**.

### More on Thread Execution

Conceptually, threads in a block can execute in any order with respect to each other, and barrier synchronization must be used whenever all threads must finish a phase before any begins the next. The correctness of a kernel should not depend on some threads executing in synchrony. However, for hardware cost reasons, CUDA devices do **bundle threads for execution** into warps, and this makes certain code constructs slow. It pays to rewrite them in equivalent forms that perform better.

Blocks are partitioned into warps by thread index. For a 1D block, warp $n$ consists of threads $32n$ to $32(n + 1) - 1$. A block whose size is not a multiple of 32 has its last warp padded with inactive threads: a 48-thread block forms 2 warps, the second with 16 padding threads.

For a multidimensional block, the threads are first projected into a **linear order**: rows with larger y (and z) coordinates are placed after those with smaller ones, that is, all threads with `threadIdx.y` = 0 in increasing `threadIdx.x`, then those with `threadIdx.y` = 1, and so on. The linear index is

$$
\text{threadIdx.x} + \text{threadIdx.y} \cdot \text{blockDim.x} + \text{threadIdx.z} \cdot \text{blockDim.x} \cdot \text{blockDim.y}.
$$

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/placing_threads_2d_block_linear_order.svg" alt="Placing the threads of a 2D block into linear order" width="640px" class="fig" caption="Placing the threads of a 2D block into linear order before partitioning into warps: rows with larger <code>threadIdx.y</code> follow those with smaller ones (after Kirk &amp; Hwu, Fig. 6.1)." >}}

<div class="example">

A 4 × 4 block has 16 threads, half a warp, padded with 16 inactive threads. An 8 × 8 block forms 2 warps: T(0,0) to T(7,3) in the first and T(0,4) to T(7,7) in the second. A 4 × 8 × 2 block (4 in x, 8 in y, 2 in z) forms 2 warps: T(0,0,0)–T(3,7,0) and T(0,0,1)–T(3,7,1).

</div>

The hardware executes an instruction for all threads of a warp before moving to the next instruction. This style, called **single-instruction, multiple-thread (SIMT)**, amortizes the cost of fetching and decoding an instruction over many threads. It works well when all threads of a warp follow the same control flow path, for example when an `if–then–else` sends all of them to the `then` part or all to the `else` part.

SIMT differs from SIMD instruction set extensions such as the SSE and AVX2 of [Part III](/posts/computer-systems-3/#simd-instruction-set-extensions). In SIMD, the data elements must first be packed into one wide register, often with alignment requirements and extra instructions. In SIMT, each thread works on data in its own registers, and control flow divergence is allowed, so the programmer writes scalar code.

<div class="definition">

Threads of the same warp **diverge** when they follow different control flow paths. The warp then executes the paths one after another, each pass with only the threads on that path enabled, and the passes add to the execution time.

</div>

- In an `if–then–else` where some threads of a warp take `then` and others `else`, one pass executes the `then` threads and another the `else` threads.
- In a loop that iterates 6, 7 or 8 times for different threads of a warp, all threads execute the first 6 iterations together; the 7th and 8th iterations each need passes with only some threads enabled.
- A condition based on `threadIdx` is a common cause: `if (threadIdx.x > 2) {}` puts threads 0–2 of the first warp on one path and threads 3–31 on the other.

How does the hardware run the passes of a divergent branch? Each warp has an **active mask**, one bit per thread. At a divergent branch, the warp executes one path with the mask set to the threads that took it, then the other path with the complementary mask, and the threads **reconverge** at the point where the paths join again (the *immediate post-dominator* of the branch, the first instruction that every path must reach). GPUs before Volta kept a small hardware stack per warp of (reconvergence PC, mask) entries for nested branches, the *SIMT stack*.

Since Volta (2017), each thread has its own program counter (*independent thread scheduling*), and a convergence optimizer regroups threads that are at the same PC. Divergent paths are still executed one at a time with the other threads masked off, but they may interleave, which lets threads of a warp wait for each other (for example on a lock) without deadlock. Code must therefore not assume that the threads of a warp run in lockstep; `__syncwarp()` synchronizes them. For short branches, the compiler avoids the branch entirely with **predication**: both paths are executed by all threads, and each instruction carries a predicate that disables it in the threads where the condition is false, which costs the instructions of both paths but no branch overhead.

<div class="example">

In `if (threadIdx.x % 4 == 0) a = f(x); else a = g(x);`, every warp has 8 threads on the `then` path and 24 on the `else` path. If `f` and `g` each take 100 cycles, every warp needs about 200 cycles instead of 100: the SIMD efficiency is $\frac{8 \times 100 + 24 \times 100}{32 \times 200} = 50\%$. With `if (threadIdx.x / 32 % 4 == 0)`, the condition is the same for all threads of a warp: whole warps take one path, and no warp diverges.

</div>

#### Reduction

Divergence arises naturally in important parallel algorithms such as reduction. A **reduction** extracts a single value from an array: the sum, maximum, minimum and so on. Sequentially, it visits every element and updates a running value: for a sum it adds the current value to the running sum, for a maximum it keeps the larger of the current value and the running maximum.

A parallel reduction is organized like a knockout tournament. The teams are divided into pairs, all pairs play in the first round in parallel, the winners go to the second round, and so on. With 16 teams, the rounds produce 8, 4, 2 and 1 winners; even with 1024 teams it takes only 10 rounds, and with 60,000 teams 16 rounds, provided there are enough fields for the 30,000 games of the first round. In general, $n$ elements need $\lceil \log_2 n \rceil$ rounds.

In the kernel below, each block reduces a section of an array in global memory. It loads the section into shared memory (the load is omitted) and reduces it **in place**, replacing elements by partial sums. Each loop iteration is one round; the `__syncthreads()` makes sure all partial sums of the previous round exist before any thread uses them. After round 1, the even elements hold pairwise sums; after round 2, the elements at multiples of 4 hold sums of 4; at the end, element 0 holds the sum of the section. With 512 elements per section, this takes 9 rounds, and the kernel must be launched with 512 threads per block, since it uses `blockDim.x` as the loop bound (half of them never add; launching half as many threads, each adding two elements while loading the section, removes this waste).

<figure class="fig">

```c
1.  __shared__ float partialSum[];
    ...
2.  unsigned int t = threadIdx.x;
3.  for (unsigned int stride = 1;
4.       stride < blockDim.x; stride *= 2)
5.  {
6.      __syncthreads();
7.      if (t % (2 * stride) == 0)
8.          partialSum[t] += partialSum[t + stride];
9.  }
```

<figcaption>A simple sum reduction kernel (after Kirk &amp; Hwu, Fig. 6.2). The line numbers are not part of the code.</figcaption>
</figure>

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/reduction_redint.svg" alt="Reduction redint" width="710px" class="fig" caption="Execution of the sum reduction kernel with interleaved pairs: after iteration <i>r</i>, the elements at multiples of 2<sup><i>r</i></sup> hold partial sums; shaded cells are written by an active thread (after Kirk &amp; Hwu, Fig. 6.3, drawn for 16 elements)." >}}

This kernel diverges. In the first iteration, only threads with even `threadIdx.x` execute line 8, so every warp needs one pass for those threads and another for the rest. In each later iteration fewer threads execute line 8, but every warp that has any active thread still needs two passes. In the first five iterations (strides 1 to 16) every one of the 16 warps has active threads, so all of them execute both paths while doing less and less work; only from stride 32 on do whole warps drop out.

A small change of algorithm reduces the divergence. Instead of adding neighbours, the revised kernel adds elements **half a section apart**: the stride starts at half the section size and is halved in each iteration (with a shift, which is cheaper than a division).

<figure class="fig">

```c
1.  __shared__ float partialSum[];
    ...
2.  unsigned int t = threadIdx.x;
3.  for (unsigned int stride = blockDim.x >> 1;
4.       stride > 0; stride >>= 1)
5.  {
6.      __syncthreads();
7.      if (t < stride)
8.          partialSum[t] += partialSum[t + stride];
9.  }
```

<figcaption>A kernel with less thread divergence (after Kirk &amp; Hwu, Fig. 6.4).</figcaption>
</figure>

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/reduction_redcont.svg" alt="Reduction redcont" width="710px" class="fig" caption="Execution of the revised reduction: in each iteration the first half of the remaining elements adds the second half, so the active threads are contiguous (after Kirk &amp; Hwu, Fig. 6.5, drawn for 16 elements; with 512 elements, threads 0–255 are active in iteration 1)." >}}

The `if` statement is still there and the same number of threads execute line 8 in each iteration, so why is it faster? The difference is in **which** threads execute it. In the first iteration with 512 elements, threads 0–255 add and threads 256–511 do not; since a warp is 32 consecutive threads, warps 0–7 all add and warps 8–15 all skip. **All threads of each warp take the same path, so there is no divergence**, and the idle warps finish at once. Divergence remains only in the last 5 iterations, when 16, 8, 4, 2 and 1 threads add.

<div class="example">

Measured on the RTX 3060 with $2^{24}$ elements in sections of 512: the interleaved kernel takes 0.95 ms and the contiguous one 0.61 ms, **1.6 times faster**. (The interleaved kernel also pays for the `%` operation and for shared memory bank conflicts.)

</div>

#### Warp-Level Primitives

The last five iterations of the reduction, with 16 threads or fewer, use only warp 0, yet they still go through shared memory and `__syncthreads()`. Threads of the same warp can exchange data more directly with **warp shuffle** instructions, which let a thread read a register of another thread in its warp. No shared memory is used, and no barrier is needed beyond the warp itself.

<div class="definition">

`__shfl_sync(mask, v, srcLane)` returns the value of `v` held by lane `srcLane`; `__shfl_up_sync(mask, v, d)` returns `v` from lane $i - d$; `__shfl_down_sync(mask, v, d)` from lane $i + d$; and `__shfl_xor_sync(mask, v, m)` from lane $i \oplus m$. The **lane** of a thread is its index within its warp (`threadIdx.x % 32` for a 1D block). `mask` names the threads that take part (`0xffffffff` for the whole warp); all of them must execute the call. For `__shfl_up_sync` and `__shfl_down_sync`, if the source lane is outside the warp (or the optional `width` segment), the thread gets its own value back; for `__shfl_sync`, the source lane is taken modulo `width`.

</div>

A warp sums 32 values in 5 steps by halving the distance each time:

<figure class="fig">

```c
__device__ float warpReduceSum(float v) {
    for (int offset = 16; offset > 0; offset >>= 1)
        v += __shfl_down_sync(0xffffffff, v, offset);
    return v;                         // lane 0 holds the sum of the warp
}

__global__ void blockReduceSum(const float* in, float* out, int n) {
    __shared__ float warpSums[32];    // one partial sum per warp (up to 1024 threads)
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    int lane = threadIdx.x % 32, warp = threadIdx.x / 32;
    float v = (i < n) ? in[i] : 0.0f;
    v = warpReduceSum(v);             // 1. each warp reduces its 32 values
    if (lane == 0) warpSums[warp] = v;
    __syncthreads();
    if (warp == 0) {                  // 2. the first warp reduces the warp sums
        v = (lane < blockDim.x / 32) ? warpSums[lane] : 0.0f;
        v = warpReduceSum(v);
        if (lane == 0) out[blockIdx.x] = v;
    }
}
```

<figcaption>Reduction with warp shuffles: one barrier per block instead of one per iteration.</figcaption>
</figure>

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/tree_reduction_across_warp_shuffle_down.svg" alt="Tree reduction across a warp with shuffle-down" width="560px" class="fig" caption="Warp reduction with <code>__shfl_down_sync</code>, drawn for 8 lanes (a warp has 32, so 5 steps with offsets 16, 8, 4, 2, 1): in each step lane <i>i</i> adds the value of lane <i>i</i> + offset, read directly from that lane's register." >}}

With `__shfl_xor_sync` instead of `__shfl_down_sync`, the same loop leaves the total in **every** lane (a *butterfly* reduction), which is useful when all threads need the result. `__shfl_up_sync` gives a warp-wide inclusive scan in the same 5 steps ([Prefix Sum](#parallel-patterns-prefix-sum)).

**Vote** functions combine a predicate across the warp: `__all_sync(mask, p)` is true if `p` is true in all participating threads, `__any_sync(mask, p)` if it is true in any, and `__ballot_sync(mask, p)` returns a 32-bit word whose bit $k$ is the predicate of lane $k$. With `__popc()` (population count) and `__ffs()` (find first set bit), a ballot lets a warp count or find the threads that satisfy a condition without memory. `__activemask()` returns the mask of the threads currently active, and `__match_any_sync(mask, v)` returns, for each thread, the mask of the threads holding the same value `v`.

<div class="example">

To append the elements of an array that pass a test to an output list, each thread could do `atomicAdd(&count, 1)` (an indivisible read-modify-write of `count` that returns its old value; see [Atomic Operations](#atomic-operations)) to get a slot, one atomic per element. With a ballot, a warp does one atomic for all its elements:

```c
bool keep = test(x);
unsigned m = __ballot_sync(0xffffffff, keep);     // which lanes keep their element
int lane = threadIdx.x % 32;
int base;
if (lane == 0) base = atomicAdd(&count, __popc(m));   // reserve all slots at once
base = __shfl_sync(0xffffffff, base, 0);              // broadcast the base slot
if (keep) out[base + __popc(m & ((1u << lane) - 1))] = x;   // rank among kept lanes
```

`__popc(m & ((1u << lane) - 1))` counts the kept lanes below this one, which is this thread's offset in the warp's block of slots. This *warp-aggregated atomic* cuts the atomic traffic by up to 32 times.

</div>

### Global Memory Bandwidth

CUDA applications process a massive amount of data from global memory in a short time, so accessing global memory efficiently is one of the most important factors in kernel performance. Tiling reduces the **amount** of data a block fetches; **memory coalescing** moves that data from global memory into shared memory and registers efficiently. The two are often used together.

Global memory is DRAM. A DRAM cell is a very weak capacitor, and reading it means sharing its tiny charge with a sense amplifier, a slow process ([Part III](/posts/computer-systems-3/#dynamic-ram)). To increase the data rate, each access reads many **consecutive locations** in parallel, with many sensors working at once, and once they are sensed, all these locations can be transferred to the processor at very high speed. (A GDDR6 channel delivers 32 bytes per access.) An application that uses data from consecutive locations before moving on gets data much faster than one that accesses random locations. **To get close to the peak bandwidth, a kernel must arrange its accesses so that each DRAM request is for many consecutive locations.**

GPUs let the programmer do this by organizing the accesses of threads into favourable patterns. Since all threads of a warp execute the same load instruction at the same time, the hardware checks which locations they access. The most favourable pattern is when **the threads of a warp access consecutive global memory locations**: if thread 0 accesses location $N$, thread 1 location $N + 1$, thread 2 location $N + 2$ and so on, the hardware **coalesces** all these accesses into one request for consecutive locations, and the DRAMs deliver data close to the peak bandwidth.

<div class="definition">

On current GPUs (including the RTX 3060), the global memory accesses of a warp are served in aligned **32-byte sectors** (and 128-byte L1 cache lines). An access is fully coalesced when the warp's addresses fall in as few sectors as possible: 32 consecutive, aligned 4-byte words occupy exactly 4 sectors (128 bytes). The **efficiency** of an access is the number of bytes requested divided by the number of bytes moved.

</div>

The first CUDA GPUs had stricter rules (consecutive threads on consecutive, aligned words); current GPUs only count the sectors touched, and `cudaMalloc()` returns addresses aligned to at least 256 bytes.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/not_coalesced_thread_reads_row.svg" alt="Not coalesced: each thread reads a row" width="230px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/coalesced_thread_reads_column.svg" alt="Coalesced: each thread reads a column" width="230px" style="margin:0" >}}
</div>
<figcaption>Memory access patterns for coalescing: if the threads of a warp read adjacent rows (A), each load instruction touches 32 locations a row apart; if they read adjacent columns (B), each load touches 32 consecutive locations (after Kirk &amp; Hwu, Fig. 6.6).</figcaption>
</figure>

In pattern A, each thread reads a row of Md, and the threads of a warp read adjacent rows: in iteration 0 they read element 0 of rows 0–31, in iteration 1 element 1 of rows 0–31. None of these accesses are coalesced. In pattern B, each thread reads a column of Nd: in iteration 0, warp 0 reads element 0 of columns 0–31, and the accesses are coalesced. The reason is the placement of matrix elements in memory.

All of global memory forms a single linear address space, and every variable of a CUDA program has an address in it. Matrices are placed in **row-major** order ([the row-major figure](#a-matrixmatrix-multiplication-example)), so M<sub>0,0</sub> and M<sub>0,1</sub>, which look adjacent in the 2D matrix, are `Width` locations apart in memory.

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/access_pattern_coalyes.svg" alt="Access pattern coalyes" width="680px" class="fig" caption="A coalesced access pattern: in each load iteration, threads T(0)–T(3) read element 0, 1, … of adjacent columns, which are consecutive in memory (after Kirk &amp; Hwu, Fig. 6.8)." >}}

In the favourable pattern, the loop makes the threads of a warp read the 0th elements of the columns in the first iteration, and these elements are consecutive in memory. The hardware sees that T(0) to T(3) access consecutive locations and coalesces their accesses.

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/access_pattern_coalno.svg" alt="Access pattern coalno" width="680px" class="fig" caption="An uncoalesced access pattern: in each load iteration, threads T(0)–T(3) read the same element of adjacent rows, which are <code>Width</code> elements apart in memory (after Kirk &amp; Hwu, Fig. 6.9)." >}}

In the unfavourable pattern, each thread steps through the elements of a row, so in the first iteration T(0)–T(3) read M<sub>0,0</sub>, M<sub>0,1</sub>, M<sub>0,2</sub>, M<sub>0,3</sub>, which are `Width` (here 4) locations apart, and the hardware cannot coalesce them. With 4-byte floats and a large `Width`, every thread of the warp touches a different 32-byte sector, so a warp moves $32 \times 32 = 1024$ bytes to use 128: 12.5% efficiency.

<div class="example">

Measured on the RTX 3060 with a 4096 × 4096 matrix: 4096 threads each summing a column (pattern B) read at **318 GB/s**, and each summing a row (pattern A) at **126 GB/s**. Without caches, pattern A would deliver about 12.5% of the bandwidth; the L1 and L2 caches recover part of it, since each sector fetched for one iteration also holds the elements of the next seven.

</div>

If an algorithm must iterate along rows, shared memory can make the accesses coalesced, as in tiled matrix multiplication. Each thread reads a row of Md, which cannot be coalesced, but the threads of a block first load the tiles cooperatively into shared memory, and the load can be arranged to be coalesced. Once the data are in shared memory, they can be read along rows or columns without penalty, because shared memory is on-chip and does not need coalescing.

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/shared_memory_enable_coalescing.svg" alt="Using shared memory to enable coalescing" width="640px" class="fig" caption="Using shared memory to enable coalescing: the threads of a block load the tiles of Md and Nd row by row (coalesced), and then read them in any direction from shared memory, which needs no coalescing (after Kirk &amp; Hwu, Fig. 6.10)." >}}

In the tiled kernel ([Fig. 5.7 version](#a-strategy-for-reducing-global-memory-traffic)), each thread loads one Md and one Nd element per phase:

- **Line 9**, `Md[Row*Width + m*TILE_WIDTH + tx]`: each row of the tile is loaded by `TILE_WIDTH` threads whose `threadIdx.x` values are consecutive, so they are in the same warp. All terms of the index are the same for these threads except `tx`, so adjacent threads read adjacent elements of a row: coalesced.
- **Line 10**, `Nd[(m*TILE_WIDTH + ty)*Width + Col]`: all terms are the same for the threads of a warp except the `tx` inside `Col`, so again adjacent threads read adjacent elements of a row: coalesced.

Lines 5, 6, 9 and 10 form a common pattern for loading matrix tiles into shared memory. In the dot-product loop (lines 12–13), the threads of a warp do not read consecutive locations of Mds, which does not matter because Mds is in shared memory. (Shared memory has its own rule, the bank rule of [Shared Memory Bandwidth](#shared-memory-bandwidth).)

### Shared Memory Bandwidth

Shared memory needs no coalescing, but it has its own access rule. To serve 32 threads in one cycle, it is divided into **32 banks**, each 4 bytes wide, that work independently: successive 32-bit words go to successive banks,

$$
\text{bank} = \left\lfloor \frac{\text{byte address}}{4} \right\rfloor \bmod 32 .
$$

Each bank can deliver one word per cycle. A warp's access completes in one cycle if its 32 threads hit 32 different banks, or if threads that hit the same bank read the **same word** (it is *broadcast* to all of them; for writes, one of them wins). If $n$ threads access **different words in the same bank**, the access is split into $n$ serialized accesses: an **$n$-way bank conflict**.

<div class="example">

For `float s[...]` and a warp reading `s[stride * lane]`:

- stride 1: lane $k$ reads bank $k$, no conflict;
- stride 2: lanes $k$ and $k + 16$ read banks $2k \bmod 32$, which coincide, so a 2-way conflict;
- in general, stride $s$ gives a $\gcd(s, 32)$-way conflict: stride 3 (odd) none, stride 8 an 8-way conflict, stride 32 a 32-way conflict (all lanes in bank 0);
- `s[0]` read by every lane: a broadcast, no conflict.

</div>

The most common conflict is reading a **column** of a 2D shared array. In `float tile[32][32]`, element `[r][c]` is at word $32r + c$, in bank $c$, so all 32 elements of a column are in the same bank. Declaring the array one column wider, `float tile[32][33]`, puts `[r][c]` at word $33r + c$, in bank $(r + c) \bmod 32$: the elements of a column are now in 32 different banks. The extra column is never used; it only shifts each row by one bank.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/float_tile_32_32.svg" alt="float tile[32][32]" width="360px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/float_tile_32_33.svg" alt="float tile[32][33]" width="360px" style="margin:0" >}}
</div>
<figcaption>Shared memory banks for a column read: in a 32-word-wide array, every element of a column falls in the same bank, so a warp reading a column is serialized 32 ways; one word of padding per row shifts each row by one bank and spreads the column over all 32 banks. (The dark cells are column 0; the light column is the unused padding.)</figcaption>
</figure>

**Matrix transpose** shows coalescing and bank conflicts together. The naive kernel `out[x * n + y] = in[y * n + x]` reads rows (coalesced) but writes columns (each thread of a warp writes a different row: uncoalesced). The tiled version reads a 32 × 32 tile of the input with coalesced row reads into shared memory, synchronizes, and writes the transposed tile with coalesced row writes, reading **columns** of the shared tile:

<figure class="fig">

```c
#define TILE 32
__global__ void transpose(const float* in, float* out, int n) {
    __shared__ float tile[TILE][TILE + 1];          // +1 removes the bank conflicts
    int x = blockIdx.x * TILE + threadIdx.x;
    int y = blockIdx.y * TILE + threadIdx.y;
    tile[threadIdx.y][threadIdx.x] = in[y * n + x]; // coalesced read of a row
    __syncthreads();
    x = blockIdx.y * TILE + threadIdx.x;            // transposed block position
    y = blockIdx.x * TILE + threadIdx.y;
    out[y * n + x] = tile[threadIdx.x][threadIdx.y];// column of the tile, coalesced write
}
```

<figcaption>Tiled matrix transpose (launched with 32 × 32 blocks; <code>n</code> is assumed to be a multiple of 32). Without the <code>+ 1</code>, the read <code>tile[threadIdx.x][threadIdx.y]</code> is a 32-way bank conflict.</figcaption>
</figure>

In the tiled matrix multiplication there are no conflicts: `Mds[ty][k]` is the same word for all threads of a row (broadcast), and `Nds[k][tx]` reads 16 consecutive words of row `k` (with 16 × 16 tiles a warp is two rows of threads, and both halves read the same 16 words, a broadcast), so there are no conflicts either. 64-bit accesses (`double`, `float2`) are handled so that a warp reading consecutive 8-byte elements is also conflict-free.

### Dynamic Partitioning of SM Resources

The execution resources of an SM, including registers, block slots and thread slots, are **dynamically partitioned** among the threads assigned to it. Each SM of the RTX 3060 has 1536 thread slots, assigned to blocks at run time: with 256-thread blocks they go to 6 blocks, with 128-thread blocks to 12. This makes the SM versatile: it can run many blocks of few threads or few blocks of many threads. A fixed partition would give each block the same share whatever its needs, wasting slots for small blocks and failing to support large ones.

Dynamic partitioning can, however, cause subtle interactions between limits that leave resources unused:

- **Block slots and thread slots.** With 64-thread blocks, the 1536 thread slots could hold 24 blocks, but an SM has only 16 block slots, so only 1024 thread slots are used. To use all slots, a block needs at least $1536/16 = 96$ threads.
- **Registers.** The register file (65,536 per SM) is also partitioned dynamically. Some kernels use many automatic variables and others few, so the SM can hold more blocks of a kernel that needs few registers and fewer of one that needs many.

The register example of [Memory as a Limiting Factor to Parallelism](#memory-as-a-limiting-factor-to-parallelism) shows such an interaction, and the figure below draws it.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/resource_interaction.svg" alt="Resource interaction" width="330px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/resource_interaction_2.svg" alt="Resource interaction" width="330px" style="margin:0" >}}
</div>
<figcaption>Interaction of resource limitations on the RTX 3060 with 256-thread blocks: at 40 registers per thread, 6 blocks fill both the register file (61,440 registers) and the 1536 thread slots; at 48, a block needs 12,288 registers and a sixth block does not fit, so 256 thread slots go unused (replaces Kirk &amp; Hwu, Fig. 6.12).</figcaption>
</figure>

#### Calculating Occupancy

Occupancy ([defined in the previous chapter](#memory-as-a-limiting-factor-to-parallelism)) follows from the SM limits.

Each limited resource gives a maximum number of resident blocks, and the actual number is the smallest:

$$
B = \min\left( B_{\max},\ \left\lfloor \frac{T_{\max}}{T} \right\rfloor,\ \left\lfloor \frac{R_{\text{SM}}}{R_{\text{block}}} \right\rfloor,\ \left\lfloor \frac{S_{\text{SM}}}{S_{\text{block}}} \right\rfloor \right), \qquad \text{occupancy} = \frac{B \cdot \lceil T/32 \rceil}{W_{\max}},
$$

where $T$ is the number of threads per block, $B_{\max}$, $T_{\max}$ and $W_{\max}$ are the SM's limits on blocks, threads and warps, $R_{\text{block}}$ is the registers per block (registers are allocated per warp in units of 256, so $R_{\text{block}} = \lceil T/32 \rceil \times \lceil 32 r / 256 \rceil \times 256$ for $r$ registers per thread), and $S_{\text{block}}$ is the shared memory per block including the 1 KB the system reserves.

<div class="example">

A kernel uses 128-thread blocks, 64 registers per thread and 12 KB of shared memory per block, on an SM with 16 blocks, 1536 threads, 48 warps, 65,536 registers and 100 KB of shared memory.

- blocks: 16;
- threads: $\lfloor 1536/128 \rfloor = 12$;
- registers: $R_{\text{block}} = 4 \times 2048 = 8192$, so $\lfloor 65{,}536/8192 \rfloor = 8$;
- shared memory: $\lfloor 100/13 \rfloor = 7$.

$B = 7$ blocks, 28 warps, occupancy $28/48 = 58\%$, limited by shared memory. Reducing it to 11 KB per block would allow 8 blocks, where the registers would become the limit.

</div>

The compiler decides the number of registers; `nvcc -Xptxas -v` prints it for each kernel, with any **spills**. When a thread needs more registers than allowed, the compiler spills some values to local memory (cached in L1, but much slower than registers). The programmer can bound the registers with `__launch_bounds__(maxThreadsPerBlock, minBlocksPerSM)` on a kernel, which tells the compiler to use few enough registers for that many blocks to fit, or globally with `-maxrregcount`. Forcing fewer registers raises occupancy but may cause spills, so the effect must be measured.

### Data Prefetching

Global memory has limited bandwidth and long latency. Tiling addresses the bandwidth; the threading model tolerates the latency by letting some warps progress while others wait. This may not be enough when all threads have very few independent instructions between their memory accesses and the use of the data, so that all of them wait at the same time.

A complementary solution is to **prefetch** the next data while using the current data, which increases the number of independent instructions between a load and its use. Prefetching is often combined with tiling, to address bandwidth and latency together.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/without_prefetching.svg" alt="A. Without prefetching" width="360px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/b_prefetching.svg" alt="B. With prefetching" width="360px" style="margin:0" >}}
</div>
<figcaption>Data prefetching in the tiled matrix multiplication: the loads of the next tile are issued before the computation on the current tile, so the dot-product loop hides their latency (after Kirk &amp; Hwu, Fig. 6.13).</figcaption>
</figure>

In the tiled kernel without prefetching (A), line 9 has two parts: it loads an Md element from global memory into a register and then stores the register into shared memory, with no independent instructions between them. A warp that loads its part of the tile waits a long time before it can compute, so many warps are needed to keep the floating-point units busy.

In the prefetching version (B), the first tile is loaded into registers before the loop. In the loop, each thread deposits the registers into shared memory (waiting for the data if needed), synchronizes, and then **loads the next tile into registers** before computing on the current tile from shared memory. The next tile is not used immediately, so the whole dot-product loop runs between the load and its use. When the loop iterates, the "next tile" becomes the "current tile". The cost is two more registers per thread, which can reduce the number of blocks per SM, but the technique can still win if it greatly reduces the waiting. (Ampere also has hardware for this: `cp.async` copies global memory into shared memory asynchronously, without passing through registers.)

### Instruction-Level Parallelism

Little's law states the general rule: to keep a pipeline busy, the number of operations in flight must equal **latency × throughput**. The operations in flight can come from different warps (**thread-level parallelism**, TLP) or from independent instructions within one thread (**instruction-level parallelism**, ILP), and the GPU uses both: a warp scheduler issues instructions in order, but it can issue the next instruction of a warp before the previous one completes if they are independent ([Part III](/posts/computer-systems-3/#instruction-level-parallelism)).

An extra register can also make each thread faster, by letting it start a long memory access earlier ([Data Prefetching](#data-prefetching)), and this can outweigh the lost parallelism. The number of warps needed to hide a latency follows from Little's law: while one warp waits for its load, the other warps must supply enough instructions to keep the scheduler busy.

<div class="example">

Each warp scheduler of the RTX 3060 issues one instruction per cycle, and a global memory load takes several hundred cycles; take 400. If a kernel has 4 independent instructions between a load and its first use, each warp gives the scheduler 4 cycles of work, so it needs $400/4 = 100$ warps to cover the latency. A scheduler has at most $48/4 = 12$ warps, so this kernel stalls. If an extra register lets the compiler move the load earlier and put 32 independent instructions between the load and its use, it needs $400/32 = 12.5$ warps, which nearly fits. Even with fewer blocks per SM, the kernel may run faster.

</div>

High occupancy is therefore not a goal in itself: a kernel with lower occupancy but more independent work per thread (more registers, more outputs per thread, as in [Thread Granularity](#thread-granularity)) can be faster, which is how the fastest matrix multiplication kernels work. Occupancy matters when ILP is low and latency must be hidden by switching warps.

### Overlapping Data Transfer and Computation

Prefetching hides global memory latency inside a kernel; the same idea at the level of the whole system hides the **host–device transfers**. The PCIe link is far slower than global memory (on my laptop at most 7.9 GB/s over PCIe 3.0 ×8, against 336 GB/s), so for many applications the copies take as long as the kernels. GPUs have **copy engines**, DMA engines that move data over PCIe while the SMs execute kernels ([Part III](/posts/computer-systems-3/#direct-memory-access)), and CUDA exposes this concurrency through pinned memory, asynchronous copies and streams.

#### Pinned Memory

A DMA engine transfers data by physical address and must not have the pages moved or swapped out by the operating system during the transfer ([Part II](/posts/computer-systems-2/)). Ordinary `malloc()` memory is **pageable**, so `cudaMemcpy()` from it first copies the data into a pinned staging buffer in the driver and then DMAs from there, two copies and no overlap with the host. **Pinned** (page-locked) memory, allocated with `cudaMallocHost()` (or `cudaHostAlloc()`, or locked in place with `cudaHostRegister()`), is guaranteed to stay at its physical address, so the copy engine reads it directly. Pinned memory is required for asynchronous copies. It should be used with care: it reduces the memory the OS can page, and allocating it is slow, so it is allocated once and reused.

#### Streams and Asynchronous Copies

<div class="definition">

A **stream** is a sequence of operations (copies, kernel launches, event records) that execute on the device **in the order they were issued**. Operations in different streams have no ordering between them and may run concurrently.

</div>

`cudaMemcpyAsync(dst, src, bytes, kind, stream)` enqueues a copy in a stream and returns immediately, and a kernel is put in a stream with the fourth execution configuration parameter, `kernel<<<grid, block, sharedBytes, stream>>>`. The host continues while the device works through the queue. To overlap copies with computation, the data are split into chunks, and each chunk's copy-in, kernel and copy-out go to a stream of their own:

<figure class="fig">

```c
const int NS = 3;
cudaStream_t st[NS];
for (int i = 0; i < NS; ++i) cudaStreamCreate(&st[i]);
float *h_in, *h_out;                                  // must be pinned
cudaMallocHost((void**)&h_in, N * sizeof(float));
cudaMallocHost((void**)&h_out, N * sizeof(float));
int chunk = N / NS;
for (int i = 0; i < NS; ++i) {
    int off = i * chunk;
    cudaMemcpyAsync(d_in + off, h_in + off, chunk * sizeof(float),
                    cudaMemcpyHostToDevice, st[i]);
    kernel<<<chunk / 256, 256, 0, st[i]>>>(d_in + off, d_out + off, chunk);
    cudaMemcpyAsync(h_out + off, d_out + off, chunk * sizeof(float),
                    cudaMemcpyDeviceToHost, st[i]);
}
cudaDeviceSynchronize();                              // wait for all streams
for (int i = 0; i < NS; ++i) cudaStreamDestroy(st[i]);
```

<figcaption>Overlapping transfers and kernels with streams.</figcaption>
</figure>

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/sequential_versus_pipelined_transfers_kernels.svg" alt="Sequential versus pipelined transfers and kernels" width="680px" class="fig" caption="Overlapping transfers and computation: with the data split into chunks and each chunk's copy-in, kernel and copy-out issued to its own stream, the copy of one chunk overlaps the kernel of another. With <i>n</i> chunks and stages of one time unit, the time falls from 3<i>n</i> to <i>n</i> + 2 units." >}}

<div class="example">

Assume a GPU with two copy engines, so that a host-to-device and a device-to-host copy can run at the same time. If copying a chunk in, processing it and copying it out each take 1 ms, 3 chunks take 9 ms in one stream. In three streams, after the first copy-in, the kernel of chunk 0 runs while chunk 1 is copied in, and so on: $3 + 2 = 5$ ms. With $n$ chunks the time is $n + 2$ instead of $3n$, approaching a third. In general, with stages of times $t_1, t_2, t_3$, the pipeline time tends to $n \max(t_1, t_2, t_3)$: the slowest stage dominates. With a single copy engine, the copy-out of one chunk and the copy-in of another take turns, and the copies become the bottleneck.

</div>

Kernels launched without a stream go to the **default stream**. In its legacy behaviour, the default stream synchronizes with all other streams of the device: an operation in it waits for all earlier work in every stream, and later work in other streams waits for it. Code that wants concurrency must therefore use explicit streams (or compile with `--default-stream per-thread`, which gives each host thread its own ordinary default stream). Plain `cudaMemcpy()` is synchronous with the host and goes to the default stream, which is why it serializes everything.

#### Events and Synchronization

An **event** is a marker recorded in a stream with `cudaEventRecord(ev, stream)`; it completes when all work issued to the stream before it has completed. Events are used to:

- **time** device work: record one event before and one after, then `cudaEventElapsedTime(&ms, start, stop)` gives the time between them in milliseconds (this is how the measurements of this chapter were made);
- **order streams**: `cudaStreamWaitEvent(stream2, ev)` makes later work in `stream2` wait until `ev` completes, without blocking the host;
- **wait on the host**: `cudaEventSynchronize(ev)` blocks the host until `ev` completes.

The other synchronization calls are `cudaStreamSynchronize(stream)`, which waits for all work in one stream, and `cudaDeviceSynchronize()`, which waits for all work on the device. `cudaLaunchHostFunc(stream, fn, data)` enqueues a host function that runs when the stream reaches it.

<figure class="fig">

```c
cudaEvent_t start, stop;
cudaEventCreate(&start);  cudaEventCreate(&stop);
cudaEventRecord(start);
kernel<<<grid, block>>>(args);
cudaEventRecord(stop);
cudaEventSynchronize(stop);               // wait until the kernel is done
float ms;
cudaEventElapsedTime(&ms, start, stop);
```

<figcaption>Timing a kernel with events. Timing with a host clock would measure only the launch, since launches are asynchronous.</figcaption>
</figure>

Two other ways to move data avoid explicit copies. **Mapped (zero-copy)** pinned memory, allocated with `cudaHostAlloc(..., cudaHostAllocMapped)`, can be read by kernels directly over PCIe, which suits data read once. **Unified memory** (`cudaMallocManaged()`) migrates pages between host and device on demand; `cudaMemPrefetchAsync()` moves them ahead of time in a stream, which turns on-demand page faults back into bulk transfers. On Windows, as on my laptop, unified memory does not page on demand: managed data are migrated to the GPU in bulk at each kernel launch.

### Instruction Mix

Each SM has limited instruction processing bandwidth, and every instruction uses it, whether it is a floating-point calculation, a load or a branch.

<figure class="fig">

```c
// (a) The loop incurs overhead instructions
for (int k = 0; k < TILE_WIDTH; ++k)
    Pvalue += Mds[ty][k] * Nds[k][tx];

// (b) Loop unrolling improves the instruction mix
Pvalue += Mds[ty][0] * Nds[0][tx] + Mds[ty][1] * Nds[1][tx] + ...
        + Mds[ty][15] * Nds[15][tx];
```

<figcaption>Instruction mix considerations (after Kirk &amp; Hwu, Fig. 6.14).</figcaption>
</figure>

The loop in (a) needs, per iteration, the floating-point multiply-add, two address calculations from `k`, an increment of `k`, a compare and a branch, besides the two shared memory loads. Only a small fraction of the instructions are floating-point calculations, and with limited instruction bandwidth, this mix limits the kernel to that fraction of the peak. (With a separate multiply and add, as on the first CUDA GPUs, 2 of 6 instructions were floating point, a limit of 1/3; the fused multiply-add makes the overhead share even larger.)

**Loop unrolling** (b) expresses the whole dot product of a tile as one long multiply-add expression. This removes the branch and the counter update, and since the indices are now constants, the compiler can use the offset field of the load instructions instead of address arithmetic. Compilers now unroll loops with constant trip counts automatically, and `#pragma unroll` asks for it explicitly.

<div class="example">

Measured on the RTX 3060 with 16 × 16 tiles: the tiled kernel with the loop kept (`#pragma unroll 1`) runs at 777 GFLOPS, and fully unrolled at **1170 GFLOPS**, 51% faster.

</div>

### Thread Granularity

An important algorithmic decision is the **granularity** of threads. It often pays to put more work into each thread and use fewer threads, when there is redundant work between threads.

In the tiled matrix multiplication, each thread computes one Pd element. Blocks that compute horizontally adjacent Pd tiles use the **same Md row band**, so each Md tile is loaded redundantly by both. Merging the two blocks into one, so that each thread computes two Pd elements with the same Mds row and two Nds columns, removes this redundancy and reduces the global memory accesses by 1/4: per pair of output tiles, the block loads 1 Md tile and 2 Nd tiles per phase instead of 2 and 2. It also gives each thread two dot products between the loads of the prefetched tiles and their use, which means more independent instructions.

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/increased_thread_granularity_rectangular_tiles.svg" alt="Increased thread granularity with rectangular tiles" width="530px" class="fig" caption="Increased thread granularity: merging the two blocks that compute horizontally adjacent Pd tiles lets the Md tiles be loaded once for both; each thread now computes two Pd elements (after Kirk &amp; Hwu, Fig. 6.15)." >}}

The downside is that the new kernel uses more registers and shared memory, so fewer blocks may fit in an SM, and it halves the number of blocks, which may leave too little parallelism for small matrices. For 2048 × 2048 matrices, combining four horizontally adjacent tiles was the best of the variants measured below (as it was on the first CUDA GPUs).

### Measured Performance

The figure below shows the combined effect of tiling, loop unrolling, data prefetching and thread granularity on a 2048 × 2048 matrix multiplication on the RTX 3060.

{{< figure src="/images/computer-systems/gpu-computing/performance_considerations/measured_performance_matrix_multiplication_variants_rtx.svg" alt="Measured performance of matrix multiplication variants on the RTX 3060" width="700px" class="fig" caption="Measured performance of the tiled matrix multiplication of two 2048 × 2048 matrices on my RTX 3060 Laptop GPU, for tile sizes, granularity (1 × <i>G</i>: each thread computes <i>G</i> Pd elements in <i>G</i> horizontally adjacent tiles), loop unrolling and prefetching (replaces Kirk &amp; Hwu, Fig. 6.16, which was measured on the first CUDA GPU). CUDA 12.6, <code>nvcc -O3 -arch=sm_86</code>; each value is the mean of 10 runs." >}}

Five observations:

1. **The caches do much of the work for small tiles.** The untiled kernel already reaches 868 GFLOPS, ten times the 84 GFLOPS that DRAM bandwidth would allow at CGMA 1.0, because the L1 and L2 caches serve most of the repeated loads. (On the first CUDA GPUs, which had no such caches, it ran at a few percent of peak.) Tiling alone, with unrolling, raises it to 1170 GFLOPS (1.35×).
2. **Unrolling matters for all tile sizes**, by 20–50%, because the RTX 3060 has so much more arithmetic per unit of instruction issue and memory bandwidth.
3. **Granularity helps steadily**: 1 × 2 and 1 × 4 raise the 16 × 16 kernel from 1170 to 1352 and about 1500 GFLOPS. Coarser threads need more registers, but with 64K registers per SM even 1 × 4 with prefetching fits.
4. **Prefetching helps only where few warps are resident.** With 16 × 16 tiles, 48 warps per SM hide the latency anyway, and prefetching changes nothing. With 32 × 32 tiles only one block fits in an SM, so all warps of the SM wait at the same barriers, and prefetching gains 23% (1060 to 1303 GFLOPS).
5. **The best combination is still far from the peak**: 1.5 TFLOPS, 15% of the measured 9.9 TFLOPS. cuBLAS reaches 6.6 TFLOPS by carrying these same techniques much further: each thread computes a block of 8 × 8 or more outputs held in registers, loads are vectorized, and tiles are double-buffered in shared memory.

As techniques are combined, they interact by using up resources the others need, and the right combination makes a large difference: here the tiled kernel went from 646 GFLOPS (8 × 8 tiles, no other optimization) to about 1.5 TFLOPS. The programmer usually has to try the combinations and pick the fastest, which is labour-intensive; this search can be automated (Ryoo et al. [[4]](#ref-4)), and it is why libraries such as cuBLAS exist.


## Floating-Point Considerations

Floating-point arithmetic was once found only in mainframes and supercomputers, and the first microprocessor floating-point coprocessors were about three orders of magnitude slower. Fast floating point is now standard in CPUs and GPUs, so application programmers must understand it, in particular the **accuracy** of floating-point arithmetic, the **precision** of the representation, and how parallel computation affects them. The IEEE 754 format itself is covered in [Part I](/posts/computer-systems-1/#floating-point-ieee-754); the examples here use a small format that makes rounding easy to see.

It is a hypothetical 5-bit format: a sign bit, 2 exponent bits in excess-1 and 2 mantissa bits with the leading "1." omitted. When the exponent field is 00, the number is denormalized, $0.M \times 2^0$. GPUs do not support signaling NaNs, because accurate signaling is difficult during massively parallel execution; a quiet NaN in the output is how data corruption is detected.

### Arithmetic Accuracy and Rounding

**Precision** is set by the number of mantissa bits of the format; **accuracy** is set by the operations performed on the numbers.

<div class="definition">

The **accuracy** of a floating-point operation is the maximal error it introduces. The smaller the error, the higher the accuracy.

</div>

The most common source of error is **rounding**, when the result needs more mantissa bits than the format has. It is typically caused by preshifting: when the operands of an addition or subtraction have different exponents, the mantissa of the one with the smaller exponent is shifted right until the exponents are equal, and the result can have more bits than the format can hold.

<div class="example">

In the 5-bit format, add $1.00_B \times 2^{-2}$ (0 00 01 in the denormalized format) to $1.00_B \times 2^1$ (0 10 00). The operand with the smaller exponent is shifted to the larger exponent: $1.00_B \times 2^1 + 0.001_B \times 2^1$. The exact result $1.001_B \times 2^1$ needs 3 mantissa bits, so it is rounded to a representable number, $1.00_B \times 2^1$ or $1.01_B \times 2^1$ (the exact value is a tie). Either way the error is $0.001_B \times 2^1$, half the place value of the last mantissa bit.

</div>

<div class="definition">

A **ULP** (unit in the last place) is the place value of the least significant mantissa bit. An operation that computes and rounds perfectly (round to nearest) has an error of at most **0.5 ULP**.

</div>

Addition, subtraction, multiplication and FMA on CUDA GPUs are IEEE-compliant, with at most 0.5 ULP error. More complex operations, such as division and transcendental functions, are typically computed by iterative approximation, and if the hardware does too few iterations, the error exceeds 0.5 ULP. The first CUDA GPUs computed the reciprocal with up to 2 ULP error. On current GPUs, `x / y` and `sqrtf()` are correctly rounded by default; the fast intrinsics executed by the special function units (`__sinf()`, `__expf()`, `__fdividef()`, and everything with `-use_fast_math`) trade accuracy for speed, and their error bounds are listed in the CUDA Programming Guide.

### Algorithm Considerations

Numerical algorithms often sum many values, as in the dot products of matrix multiplication. Addition is associative in exact arithmetic, but **with finite precision, the order of the additions affects the result**.

<div class="example">

Sum four numbers in the 5-bit format, $1.00_B \times 2^0 + 1.00_B \times 2^0 + 1.00_B \times 2^{-2} + 1.00_B \times 2^{-2}$. Sequentially:

$$
\begin{aligned}
&= 1.00_B \times 2^1 + 1.00_B \times 2^{-2} + 1.00_B \times 2^{-2} \\
&= 1.00_B \times 2^1 + 1.00_B \times 2^{-2} \\
&= 1.00_B \times 2^1
\end{aligned}
$$

In the second and third steps the small operand disappears, since it is too small compared with the large one (with round-to-nearest-even). A parallel algorithm that adds the two pairs at the same time and then adds the pairwise sums gives

$$
(1.00_B \times 2^1) + (1.00_B \times 2^{-1}) = 1.01_B \times 2^1,
$$

because the sum of the two small values is now large enough to affect the result. The parallel result ($2.5$) is the exact one; the sequential result ($2$) is not.

</div>

This difference between sequential and parallel results often surprises developers. Here the parallel algorithm was more accurate, but other inputs make it less accurate than the sequential one. Experienced developers either make sure the variation is tolerable, or sort or group the data so that the parallel algorithm gives the most accurate result.

A common technique is to **presort the data** before a reduction. Sorted in ascending order, the example becomes $1.00_B \times 2^{-2} + 1.00_B \times 2^{-2} + 1.00_B \times 2^0 + 1.00_B \times 2^0$. When the numbers are divided into groups for a parallel algorithm, numbers close to each other in value end up in the same group, so the additions within each group are accurate; and since the additions within each group are sequential, ascending order lets the small numbers accumulate before they meet the large ones. This is one reason sorting is so common in massively parallel numerical algorithms.

**Compensated (Kahan) summation** reduces the error of a long sum without sorting. A second variable `c` carries the low-order bits lost in each addition and feeds them back into the next one:

```c
float sum = 0.0f, c = 0.0f;
for (int i = 0; i < n; ++i) {
    float y = x[i] - c;        // add back what was lost last time
    float t = sum + y;         // low bits of y are lost here...
    c = (t - sum) - y;         // ...and recovered here (algebraically 0)
    sum = t;
}
```

The error bound becomes independent of $n$ (about 2 ULP instead of growing with the number of terms), at four times the arithmetic. The compiler must not simplify `(t - sum) - y` to 0, which it is not allowed to do under IEEE rules but may do with fast-math options.

**Catastrophic cancellation** is the opposite danger: subtracting two nearly equal numbers leaves only their few differing bits. In single precision, $1.0000001 - 1.0000000$ should be $10^{-7}$, but $1.0000001$ is stored as $1 + 2^{-23} = 1.00000012$, so the result is $1.19 \times 10^{-7}$, a 19% error, although each input had an error under $10^{-7}$. Formulas are rearranged to avoid such subtractions, for example computing $x^2 - y^2$ as $(x - y)(x + y)$.

GPU and CPU results for the same code often differ in the last bits even when both follow IEEE, for two reasons. The GPU compiler **contracts** `a * b + c` into a fused multiply-add, which rounds once instead of twice (more accurate, but different; `-fmad=false` disables it). And with `-use_fast_math` (or `-ftz=true`), denormal results are **flushed to zero**.

### Reduced-Precision Formats and Tensor Cores

The same reasoning about range and precision applies to the smaller formats that GPUs now support, mainly for machine learning and graphics. Fewer bits mean less memory traffic and more operations per cycle, at the cost of range (exponent bits) or precision (mantissa bits).

{{< figure src="/images/computer-systems/gpu-computing/floating_point_considerations/floating_point_formats_used_gpus.svg" alt="Floating-point formats used on GPUs" width="640px" class="fig" caption="Floating-point formats used on GPUs, drawn to scale (one cell per bit). TF32 is stored as 32 bits but the tensor cores use only 19 of them." >}}

<figure class="table">
<figcaption>Binary floating-point formats on GPUs. ε is the spacing of representable numbers just above 1 (2<sup>−mantissa bits</sup>).</figcaption>

| Format | Exponent bits | Mantissa bits | Largest value | ε |
|:--|:-:|:-:|:-:|:-:|
| FP64 (double) | 11 | 52 | $\approx 1.8 \times 10^{308}$ | $2^{-52} \approx 2.2 \times 10^{-16}$ |
| FP32 (single) | 8 | 23 | $\approx 3.4 \times 10^{38}$ | $2^{-23} \approx 1.2 \times 10^{-7}$ |
| TF32 | 8 | 10 | $\approx 3.4 \times 10^{38}$ | $2^{-10} \approx 9.8 \times 10^{-4}$ |
| FP16 (half) | 5 | 10 | 65,504 | $2^{-10} \approx 9.8 \times 10^{-4}$ |
| BF16 (bfloat16) | 8 | 7 | $\approx 3.4 \times 10^{38}$ | $2^{-7} \approx 7.8 \times 10^{-3}$ |
| FP8 E4M3 | 4 | 3 | 448 | $2^{-3} = 0.125$ |
| FP8 E5M2 | 5 | 2 | 57,344 | $2^{-2} = 0.25$ |

</figure>

- **FP16** (IEEE half precision) has the same precision as TF32 but only 5 exponent bits, so values above 65,504 overflow to infinity and values below about $6 \times 10^{-5}$ become denormal; gradients in neural-network training can underflow, which is handled by *loss scaling* (multiplying the loss by a large factor and dividing the gradients back).
- **BF16** keeps the 8-bit exponent of FP32, so it has the same range and converts from FP32 by rounding away the low 16 bits, but only 8 bits of precision.
- **TF32** is FP32's exponent with FP16's mantissa: the tensor cores read FP32 data, round the mantissa to 10 bits, and accumulate in FP32.
- **FP8**, in the E4M3 form (more precision, used for weights and activations) and the E5M2 form (more range, used for gradients), is supported by the tensor cores of Ada and Hopper GPUs and later, not by Ampere.

<div class="example">

In FP16, $1/3$ is stored as $1.0101010101_B \times 2^{-2} = 0.333251953\ldots$, a relative error of $2.4 \times 10^{-4}$. Adding $1$ to $2048$ in FP16 gives $2048$: the spacing between FP16 numbers in $[2048, 4096)$ is $2^{11} \times 2^{-10} = 2$, so $2049$ is not representable and rounds to even ($2048$). This is why sums of many FP16 values are accumulated in FP32.

</div>

**Tensor cores** are units dedicated to small matrix multiply-accumulate operations, $D = A \times B + C$, on tiles of a matrix. Each processing block of an Ampere SM has one ([the SM figure](#thread-scheduling-and-latency-tolerance)). The inputs $A$ and $B$ are in a low-precision format (FP16, BF16, TF32, INT8 or INT4) and the accumulator $C$, $D$ in FP32 (or FP16, or INT32), a **mixed-precision** scheme: the products are formed exactly and summed in full precision, so the error comes mainly from rounding the inputs. One warp-level tensor-core instruction (for example a 16 × 8 × 16 tile) performs 2048 multiply-adds, and each tensor core does on the order of a hundred FP16 multiply-adds per clock where an FP32 lane does one, so dense matrix multiplication in FP16 on tensor cores runs several times faster than FP32 on the CUDA cores (on GeForce Ampere about 2× with FP32 accumulation; data-centre parts more). Ampere's tensor cores can also skip zeros in matrices with a fixed 2:4 sparsity pattern for twice the throughput.

{{< figure src="/images/computer-systems/gpu-computing/floating_point_considerations/tensor_core_matrix_multiply_accumulate.svg" alt="A tensor core matrix multiply-accumulate" width="560px" class="fig" caption="A tensor core computes D = A × B + C on small matrix tiles in one operation, with low-precision inputs and a full-precision accumulator (drawn as 4 × 4 tiles)." >}}

Tensor cores are programmed per **warp**: the 32 threads of a warp cooperatively hold the tiles in their registers and issue one matrix instruction. CUDA exposes them through the `wmma` (warp matrix multiply-accumulate) API, with *fragments* whose layout across the threads is opaque:

<figure class="fig">

```c
#include <mma.h>
using namespace nvcuda;
// One warp computes a 16x16 tile of C = A x B (A row-major, B column-major, K a multiple of 16)
__global__ void wmmaTile(const half* A, const half* B, float* C, int M, int N, int K) {
    int tileRow = blockIdx.y, tileCol = blockIdx.x;          // one warp per block here
    wmma::fragment<wmma::matrix_a, 16, 16, 16, half, wmma::row_major> a;
    wmma::fragment<wmma::matrix_b, 16, 16, 16, half, wmma::col_major> b;
    wmma::fragment<wmma::accumulator, 16, 16, 16, float> acc;
    wmma::fill_fragment(acc, 0.0f);
    for (int k = 0; k < K; k += 16) {
        wmma::load_matrix_sync(a, A + tileRow * 16 * K + k, K);   // 16x16 tile of A
        wmma::load_matrix_sync(b, B + tileCol * 16 * K + k, K);   // 16x16 tile of B
        wmma::mma_sync(acc, a, b, acc);                           // acc += a * b
    }
    wmma::store_matrix_sync(C + tileRow * 16 * N + tileCol * 16, acc, N, wmma::mem_row_major);
}
```

<figcaption>Using the tensor cores through the <code>wmma</code> API (launched with 32 threads per block and an (N/16) × (M/16) grid).</figcaption>
</figure>

The structure is the tiled matrix multiplication of [CUDA Memories](#a-strategy-for-reducing-global-memory-traffic) with the inner product of a tile replaced by one `mma_sync`; fast kernels add shared-memory tiling and several tiles per warp, as libraries such as cuBLAS and CUTLASS do.


## Parallel Patterns: Convolution and Stencil

The next chapters cover **parallel patterns**, computations that appear in many applications and have well-studied parallel algorithms. Reduction ([More on Thread Execution](#reduction)) was the first. Convolution comes next because it introduces an important complication of tiling: the input tile that a block needs is **larger** than the output tile it produces. [[5]](#ref-5)

### Background

<div class="definition">

**Convolution** computes each output element as a weighted sum of the corresponding input element and a fixed number of its neighbours. The weights form the **mask** (also called the *kernel* or *filter*, not to be confused with a CUDA kernel). For a 1D input $N$ and a mask $M$ of $2r + 1$ elements ($r$ is the mask radius),

$$
P[i] = \sum_{j=-r}^{r} M[j + r] \, N[i + j].
$$

</div>

Convolution is used in signal processing (filtering audio), image processing (blurring, sharpening, edge detection), computer vision and convolutional neural networks. In 2D, a $(2r + 1) \times (2r + 1)$ mask is applied to each pixel:

$$
P[y][x] = \sum_{j=-r}^{r} \sum_{k=-r}^{r} M[j + r][k + r] \, N[y + j][x + k].
$$

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_convolution_stencil/dimensional_convolution.svg" alt="One-dimensional convolution" width="600px" class="fig" caption="One-dimensional convolution with a 5-element mask: each output element is the weighted sum of the input element at the same position and its two neighbours on each side." >}}

Elements near the boundary need neighbours that do not exist, **ghost cells**, whose values are set by the application: usually 0, sometimes the nearest edge value (like the clamp addressing of textures).

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_convolution_stencil/ghost_cells_boundary.svg" alt="Ghost cells at the boundary" width="560px" class="fig" caption="Computing P[0] with a mask of radius 2 needs N[−2] and N[−1], which do not exist; these ghost cells are treated as 0 (or another boundary value)." >}}

Like matrix multiplication, convolution has abundant data parallelism: every output element can be computed independently. Unlike matrix multiplication, each input element is used by only $2r + 1$ outputs (in 1D), so the reuse that tiling can exploit is limited by the mask size.

### A Basic Convolution Kernel

The natural decomposition is one thread per output element:

<figure class="fig">

```c
__global__ void convolution_1D_basic(const float* N, const float* M, float* P,
                                     int Mask_Width, int Width) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    float Pvalue = 0;
    int start = i - Mask_Width / 2;
    for (int j = 0; j < Mask_Width; j++)
        if (start + j >= 0 && start + j < Width)       // ghost cells count as 0
            Pvalue += N[start + j] * M[j];
    if (i < Width) P[i] = Pvalue;
}
```

<figcaption>A basic 1D convolution kernel.</figcaption>
</figure>

Two problems are visible. The boundary test causes **control divergence** in the warps that contain boundary elements, which matters little for large inputs since only a few warps are affected. More important is the **memory bandwidth**: each iteration does one multiply-add (2 operations) for two global loads (`N` and `M`), a ratio of 0.25 operations per byte.

### Constant Memory for the Mask

The mask has three properties that make it ideal for **constant memory** ([CUDA Device Memory Types](#cuda-device-memory-types)): it is small (rarely more than a few dozen elements), it does not change during the kernel, and all threads of a warp read the **same mask element** at the same time (`M[j]` does not depend on the thread). Each mask element is then fetched once into the constant cache and broadcast to the whole warp.

<figure class="fig">

```c
#define MAX_MASK_WIDTH 10
__constant__ float M[MAX_MASK_WIDTH];
// host: cudaMemcpyToSymbol(M, h_M, Mask_Width * sizeof(float));

__global__ void convolution_1D_const(const float* N, float* P, int Mask_Width, int Width) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    float Pvalue = 0;
    int start = i - Mask_Width / 2;
    for (int j = 0; j < Mask_Width; j++)
        if (start + j >= 0 && start + j < Width)
            Pvalue += N[start + j] * M[j];
    if (i < Width) P[i] = Pvalue;
}
```

<figcaption>1D convolution with the mask in constant memory; <code>M</code> is a global <code>__constant__</code> array, no longer a parameter.</figcaption>
</figure>

The mask loads now come from the constant cache, so the ratio rises to 2 operations per 4-byte `N` load, 0.5 operations per byte. The remaining traffic is the input `N`.

### Tiled Convolution with Halo Cells

Neighbouring threads read overlapping parts of `N`: thread $i$ and thread $i + 1$ share $2r$ of their $2r + 1$ inputs. As with matrix multiplication, the threads of a block can load the inputs into shared memory once and then read them from there. The difference is the **halo**: the output tile of a block depends on an input tile that extends $r$ elements beyond it on each side.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_convolution_stencil/input_tile_halo_1d_tiled_convolution.svg" alt="Input tile with halo for 1D tiled convolution" width="620px" class="fig" caption="Tiled 1D convolution: to compute its 4 output elements, a block needs the 4 input elements at the same positions plus r = 2 halo elements on each side, which belong to the neighbouring tiles." >}}

<div class="definition">

For an output tile of `OUT_TILE_DIM` elements and a mask radius $r$, the **input tile** has `IN_TILE_DIM` = `OUT_TILE_DIM` + 2r elements. The $r$ elements on each side, which belong to the neighbouring output tiles, are the **halo cells**; the others are the internal cells.

</div>

Since the input tile is larger than the output tile, the block size cannot match both. There are two common designs:

1. **Block size = input tile.** Each thread loads one input element; after the barrier, only the `OUT_TILE_DIM` threads in the middle compute outputs, and the $2r$ threads at the edges are idle during computation.
2. **Block size = output tile.** Each thread computes one output; the loading is done in several steps, so that some threads load the halo elements in addition to their own.

<figure class="fig">

```c
#define MASK_RADIUS 2
#define IN_TILE_DIM 32
#define OUT_TILE_DIM (IN_TILE_DIM - 2 * MASK_RADIUS)
__constant__ float M[2 * MASK_RADIUS + 1];

__global__ void convolution_1D_tiled(const float* N, float* P, int Width) {
    __shared__ float N_s[IN_TILE_DIM];
    // block size = IN_TILE_DIM; consecutive blocks' input tiles overlap by 2r
    int i = blockIdx.x * OUT_TILE_DIM + threadIdx.x - MASK_RADIUS;   // input index
    N_s[threadIdx.x] = (i >= 0 && i < Width) ? N[i] : 0.0f;          // ghost cells = 0
    __syncthreads();
    int tOut = threadIdx.x - MASK_RADIUS;                            // output index in tile
    if (tOut >= 0 && tOut < OUT_TILE_DIM && i < Width) {
        float Pvalue = 0;
        for (int j = 0; j < 2 * MASK_RADIUS + 1; j++)
            Pvalue += M[j] * N_s[tOut + j];
        P[i] = Pvalue;
    }
}
```

<figcaption>Tiled 1D convolution, design 1: one thread per input-tile element (launched with <code>IN_TILE_DIM</code> threads per block and ⌈Width / OUT_TILE_DIM⌉ blocks).</figcaption>
</figure>

The index arithmetic is the important part. Block $b$ produces outputs $b \cdot$`OUT_TILE_DIM` to $(b + 1) \cdot$`OUT_TILE_DIM` − 1, so its input tile starts $r$ elements earlier: thread $t$ loads $N[b \cdot \text{OUT\_TILE\_DIM} + t - r]$, and thread $t$ (for $r \le t < r + $`OUT_TILE_DIM`) computes the output at the same position from `N_s[t - r]` to `N_s[t + r]`. The ghost cells at the two ends of the array are loaded as 0, so the inner loop needs no boundary test.

**How much does tiling save?** Without tiling, each output loads $2r + 1$ input elements from global memory (through the caches). With tiling, a block loads `IN_TILE_DIM` = `OUT_TILE_DIM` + 2r elements for `OUT_TILE_DIM` outputs. The reduction in global loads is

$$
\frac{\text{OUT\_TILE\_DIM} \cdot (2r + 1)}{\text{OUT\_TILE\_DIM} + 2r}.
$$

<div class="example">

In 1D with `IN_TILE_DIM` = 32 and $r = 2$ (a 5-element mask), `OUT_TILE_DIM` = 28 and the reduction is $28 \times 5 / 32 = 4.4$, close to the upper limit $2r + 1 = 5$. In 2D, an output tile of $O \times O$ needs an input tile of $(O + 2r)^2$, and the reduction is $O^2 (2r + 1)^2 / (O + 2r)^2$. With 32 × 32 input tiles and $r = 2$: $28^2 \times 25 / 32^2 = 19.1$, against a limit of 25. With $r = 4$ (9 × 9 mask): $24^2 \times 81 / 32^2 = 45.6$, against 81. Small tiles waste much of the benefit on halos: an 8 × 8 input tile with $r = 2$ gives only $4^2 \times 25 / 64 = 6.25$.

</div>

The halo is also why large tiles matter more for convolution than for matrix multiplication: the fraction of loaded data that are halo cells, $1 - O^2/(O + 2r)^2$, falls only as the tile grows.

### Tiled 2D Convolution

The 2D version is the same with two indices. With design 1, a block of `IN_TILE_DIM` × `IN_TILE_DIM` threads loads the input tile, and the threads of the inner `OUT_TILE_DIM` × `OUT_TILE_DIM` square compute:

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_convolution_stencil/input_tile_halo_2d_tiled_convolution.svg" alt="Input tile with halo for 2D tiled convolution" width="460px" class="fig" caption="Tiled 2D convolution with a 5 × 5 mask: a 6 × 6 output tile needs a 10 × 10 input tile, the output tile plus a halo of width r = 2 on every side." >}}

<figure class="fig">

```c
#define IN_TILE_DIM 32
#define OUT_TILE_DIM (IN_TILE_DIM - 2 * MASK_RADIUS)
__constant__ float M[2 * MASK_RADIUS + 1][2 * MASK_RADIUS + 1];

__global__ void convolution_2D_tiled(const float* N, float* P, int width, int height) {
    int col = blockIdx.x * OUT_TILE_DIM + threadIdx.x - MASK_RADIUS;
    int row = blockIdx.y * OUT_TILE_DIM + threadIdx.y - MASK_RADIUS;
    __shared__ float N_s[IN_TILE_DIM][IN_TILE_DIM];
    if (row >= 0 && row < height && col >= 0 && col < width)
        N_s[threadIdx.y][threadIdx.x] = N[row * width + col];
    else
        N_s[threadIdx.y][threadIdx.x] = 0.0f;                     // ghost cell
    __syncthreads();
    int tileCol = threadIdx.x - MASK_RADIUS;
    int tileRow = threadIdx.y - MASK_RADIUS;
    if (row >= 0 && row < height && col >= 0 && col < width &&
        tileCol >= 0 && tileCol < OUT_TILE_DIM && tileRow >= 0 && tileRow < OUT_TILE_DIM) {
        float Pvalue = 0.0f;
        for (int mRow = 0; mRow < 2 * MASK_RADIUS + 1; mRow++)
            for (int mCol = 0; mCol < 2 * MASK_RADIUS + 1; mCol++)
                Pvalue += M[mRow][mCol] * N_s[tileRow + mRow][tileCol + mCol];
        P[row * width + col] = Pvalue;
    }
}
```

<figcaption>Tiled 2D convolution with an input-tile-sized block (32 × 32 threads).</figcaption>
</figure>

The ratio of operations to global memory traffic for this kernel is

$$
\frac{\text{OUT\_TILE\_DIM}^2 \cdot (2r + 1)^2 \cdot 2}{\text{IN\_TILE\_DIM}^2 \cdot 4} \ \text{FLOP/byte},
$$

which is $28^2 \times 25 \times 2 / (32^2 \times 4) = 9.6$ FLOP/byte for a 5 × 5 filter, against $0.5$ for the untiled kernel with the filter in constant memory.

A simpler alternative relies on the **caches** for the halo: the block (the size of the output tile) loads only its internal cells into shared memory, and threads that need a halo cell read it directly from global memory, where it is likely in the L1 or L2 cache because the neighbouring block has loaded it. This keeps the block and tile sizes equal and the code simple, at the cost of a branch in the inner loop (shared or global).

### Stencils

<div class="definition">

A **stencil** updates each point of a regular grid from a fixed pattern of neighbouring points with fixed coefficients. It is the computational core of solving partial differential equations by finite differences (fluid dynamics, heat conduction, electromagnetics, seismic imaging).

</div>

For example, the heat equation discretized on a 3D grid gives the 7-point stencil

$$
\begin{aligned}
\text{out}[i][j][k] = c_0\, \text{in}[i][j][k] + c_1 \big(&\text{in}[i][j][k-1] + \text{in}[i][j][k+1] + \text{in}[i][j-1][k] \\
{}+{} &\text{in}[i][j+1][k] + \text{in}[i-1][j][k] + \text{in}[i+1][j][k]\big),
\end{aligned}
$$

applied repeatedly, one sweep per time step. A stencil looks like a convolution, but differs in ways that change the optimization:

- Stencils are usually **3D** (or higher), so a tile with its halo grows with the cube of its side, and a cube of threads must be small to fit in a block.
- The pattern is **sparse**: a 7-point stencil uses 7 of the 27 points of a 3 × 3 × 3 cube, so each input is reused fewer times than in a dense convolution, and the arithmetic intensity is low.
- The coefficients are few and usually in registers or constants.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_convolution_stencil/5_point_2d_stencil.svg" alt="5-point 2D stencil" width="200px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_convolution_stencil/7_point_3d_stencil.svg" alt="7-point 3D stencil" width="240px" style="margin:0" >}}
</div>
<figcaption>Stencils: the new value of a grid point is a fixed weighted combination of itself and its nearest neighbours, here along each axis (order-1 stencils).</figcaption>
</figure>

The basic stencil kernel gives each thread one grid point:

```c
__global__ void stencil_3D(const float* in, float* out, unsigned int N) {
    unsigned int i = blockIdx.z * blockDim.z + threadIdx.z;
    unsigned int j = blockIdx.y * blockDim.y + threadIdx.y;
    unsigned int k = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= 1 && i < N - 1 && j >= 1 && j < N - 1 && k >= 1 && k < N - 1)
        out[i*N*N + j*N + k] = c0 * in[i*N*N + j*N + k]
            + c1 * (in[i*N*N + j*N + (k - 1)] + in[i*N*N + j*N + (k + 1)]
                  + in[i*N*N + (j - 1)*N + k] + in[i*N*N + (j + 1)*N + k]
                  + in[(i - 1)*N*N + j*N + k] + in[(i + 1)*N*N + j*N + k]);
}
```

It does 13 floating-point operations for 7 loads, about 0.46 operations per byte. A tiled version loads a $T^3$ input tile (the output tile plus a one-point halo) into shared memory, synchronizes, and lets the inner $(T-2)^3$ threads compute, exactly like the 2D convolution. Its halo is a large fraction of the tile. A cube of threads has at most 1024 threads, so $T \le 10$, and $T = 8$ is the convenient power of two; with $T = 8$ and order 1, only $6^3 = 216$ of the 512 loaded points are computed: 58% of the loaded data are halo, and the operation-to-load ratio of a 7-point stencil (13 operations per point) is only $216 \times 13 / 512 = 5.5$ operations per load, well below the ideal 13.

**Thread coarsening** (giving each thread the work of several threads, so that data loaded once serve all of it) solves this along z. The block is a 2D tile of $T \times T$ threads, and each thread computes a whole column of outputs along z, iterating over the planes. [[6]](#ref-6) At each step, only the current plane (which needs its x and y neighbours from other threads) is in shared memory; the planes below and above are needed only by the same thread, so they are kept in **registers** (*register tiling*). [[7]](#ref-7) After each step, the planes rotate: the current plane becomes the lower, the upper becomes the current, and the next plane is loaded.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_convolution_stencil/thread_coarsening_along_z_3d_stencil.svg" alt="Thread coarsening along z for a 3D stencil" width="520px" class="fig" caption="Thread coarsening for a 3D stencil: a block of 2D threads computes one x–y tile for every z in turn. Only the current plane, which needs its x and y neighbours, is kept in shared memory; each thread holds its own z − 1 and z + 1 values in registers." >}}

<figure class="fig">

```c
#define IN_TILE_DIM 32
#define OUT_TILE_DIM (IN_TILE_DIM - 2)
__global__ void stencil_3D_coarsened(const float* in, float* out, unsigned int N) {
    int iStart = blockIdx.z * OUT_TILE_DIM;                      // z range of this block
    int j = blockIdx.y * OUT_TILE_DIM + threadIdx.y - 1;
    int k = blockIdx.x * OUT_TILE_DIM + threadIdx.x - 1;
    __shared__ float inCurr_s[IN_TILE_DIM][IN_TILE_DIM];
    float inPrev, inCurr, inNext;                                // z-1, z, z+1 in registers
    if (iStart - 1 >= 0 && iStart - 1 < N && j >= 0 && j < N && k >= 0 && k < N)
        inPrev = in[(iStart - 1) * N * N + j * N + k];
    if (iStart >= 0 && iStart < N && j >= 0 && j < N && k >= 0 && k < N) {
        inCurr = in[iStart * N * N + j * N + k];
        inCurr_s[threadIdx.y][threadIdx.x] = inCurr;
    }
    for (int i = iStart; i < iStart + OUT_TILE_DIM; ++i) {
        if (i + 1 >= 0 && i + 1 < N && j >= 0 && j < N && k >= 0 && k < N)
            inNext = in[(i + 1) * N * N + j * N + k];
        __syncthreads();
        if (i >= 1 && i < N - 1 && j >= 1 && j < N - 1 && k >= 1 && k < N - 1 &&
            threadIdx.y >= 1 && threadIdx.y < IN_TILE_DIM - 1 &&
            threadIdx.x >= 1 && threadIdx.x < IN_TILE_DIM - 1) {
            out[i * N * N + j * N + k] = c0 * inCurr
                + c1 * inCurr_s[threadIdx.y][threadIdx.x - 1] + c2 * inCurr_s[threadIdx.y][threadIdx.x + 1]
                + c3 * inCurr_s[threadIdx.y - 1][threadIdx.x] + c4 * inCurr_s[threadIdx.y + 1][threadIdx.x]
                + c5 * inPrev + c6 * inNext;
        }
        __syncthreads();
        inPrev = inCurr;                                         // rotate the planes
        inCurr = inNext;
        inCurr_s[threadIdx.y][threadIdx.x] = inNext;
    }
}
```

<figcaption>3D 7-point stencil with thread coarsening in z and register tiling (32 × 32 threads per block). The coefficients <code>c0</code>–<code>c6</code> are constants; for the heat equation above, <code>c1</code> to <code>c6</code> are all equal.</figcaption>
</figure>

With 32 × 32 threads, the block now loads 32 × 32 points per plane and computes 30 × 30 of them, and over a column of 30 output planes it loads 32 input planes: $30 \times 900 / (32 \times 1024) = 82\%$ of the loaded data are used, against 42% for the 8 × 8 × 8 cube. Keeping the planes below and above in registers means shared memory holds only one plane (4 KB) instead of three, so more blocks fit in an SM. Each input point is loaded once per block for the whole column.


## Parallel Patterns: Histogram and Atomic Operations

In the patterns so far, each output element is written by exactly one thread (the **owner-computes** rule), which the grid-centric, *gather* decomposition guarantees ([Problem Decomposition](#problem-decomposition)). In a histogram, the output location of each input is known only after the input is read, so threads must update shared outputs: a **scatter** with conflicts. This chapter introduces atomic operations, the races they prevent, and the techniques that keep them from becoming a bottleneck. [[5]](#ref-5) [[8]](#ref-8)

### Background

<div class="definition">

A **histogram** counts the number of input elements that fall into each of a set of value ranges, the **bins**.

</div>

Histograms are used in image processing (equalization, thresholding), computer vision (feature descriptors), speech recognition, data analysis and, through the related operation of counting keys, radix sort. For text, a histogram of letters in bins of four letters (a–d, e–h, …) shows the character frequencies:

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_histogram_atomic/histogram_phrase.svg" alt="Histogram of a phrase" width="460px" class="fig" caption="Histogram of the letters of “programming massively parallel processors” in bins of four letters (a–d: 5, e–h: 5, i–l: 6, m–p: 10, q–t: 10, u–x: 1, y–z: 1)." >}}

<figure class="fig">

```c
void histogram_sequential(const char* data, unsigned int length, unsigned int* histo) {
    for (unsigned int i = 0; i < length; ++i) {
        int pos = data[i] - 'a';
        if (pos >= 0 && pos < 26) histo[pos / 4]++;
    }
}
```

<figcaption>Sequential text histogram with 7 bins of 4 letters.</figcaption>
</figure>

The sequential code is $O(n)$, reads the input once with excellent locality, and the histogram fits in the L1 cache. The parallel version is harder because the bins are shared.

### Race Conditions

The natural decomposition gives each thread one input element:

```c
__global__ void histo_kernel_wrong(const char* data, unsigned int length, unsigned int* histo) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < length) {
        int pos = data[i] - 'a';
        if (pos >= 0 && pos < 26) histo[pos / 4]++;   // wrong: not atomic
    }
}
```

`histo[pos/4]++` is three operations, a **read-modify-write**: load the bin into a register, add 1, store it back. When two threads update the same bin at the same time, their three operations can interleave:

<figure class="table">
<figcaption>Two interleavings of two threads incrementing a bin that holds 0.</figcaption>

| Time | Thread 1 | Thread 2 | | Time | Thread 1 | Thread 2 |
|:-:|:--|:--|:-:|:-:|:--|:--|
| 1 | old ← bin (0) | | | 1 | old ← bin (0) | |
| 2 | new ← old + 1 | | | 2 | | old ← bin (0) |
| 3 | bin ← new (1) | | | 3 | new ← old + 1 | |
| 4 | | old ← bin (1) | | 4 | | new ← old + 1 |
| 5 | | new ← old + 1 | | 5 | bin ← new (1) | |
| 6 | | bin ← new (2) | | 6 | | bin ← new (1) |

</figure>

On the left the result is 2, as intended; on the right it is 1, because thread 2 read the bin before thread 1 wrote it, and one increment is lost. The outcome depends on the relative timing of the threads.

<div class="definition">

A **race condition** occurs when the result of a computation depends on the relative timing of accesses by different threads to the same location, at least one of which is a write. (This is the data race of [Part III](/posts/computer-systems-3/#hazards-across-cores) and the critical-section problem of [Part II](/posts/computer-systems-2/).)

</div>

### Atomic Operations

<div class="definition">

An **atomic operation** performs a read-modify-write on a memory location as one indivisible step: no other access to the location can happen between its read and its write. Atomic operations on the same location are **serialized**, in an unspecified order.

</div>

CUDA provides atomics as intrinsic functions on global and shared memory, each returning the **old** value of the location:

- `atomicAdd(addr, v)`: add `v` (for `int`, `unsigned`, `unsigned long long`, `float`, `double`, and `half2`/`__nv_bfloat162`); `atomicSub` (for `int` and `unsigned`);
- `atomicMin`, `atomicMax`: replace with the minimum or maximum;
- `atomicExch(addr, v)`: store `v`, return the old value;
- `atomicInc(addr, m)`, `atomicDec`: wrap-around increment and decrement;
- `atomicAnd`, `atomicOr`, `atomicXor`: bitwise operations;
- `atomicCAS(addr, compare, v)`: **compare-and-swap**: if the location equals `compare`, store `v`; return the old value in either case.

Compare-and-swap can build any other atomic: read the value, compute the new one, and try to swap; if another thread changed the location in between, the CAS fails (returns a different old value) and the thread retries.

<figure class="fig">

```c
// Atomic maximum for floats, built from atomicCAS on the bit pattern
__device__ float atomicMaxFloat(float* addr, float v) {
    int* a = (int*)addr;
    int old = *a, assumed;
    do {
        assumed = old;
        if (__int_as_float(assumed) >= v) break;          // already larger: nothing to do
        old = atomicCAS(a, assumed, __float_as_int(v));
    } while (old != assumed);                             // someone else changed it: retry
    return __int_as_float(old);
}
```

<figcaption>Building an atomic operation from compare-and-swap.</figcaption>
</figure>

With `atomicAdd`, the histogram kernel is correct:

<figure class="fig">

```c
__global__ void histo_kernel(const char* data, unsigned int length, unsigned int* histo) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < length) {
        int pos = data[i] - 'a';
        if (pos >= 0 && pos < 26) atomicAdd(&histo[pos / 4], 1);
    }
}
```

<figcaption>A basic parallel histogram kernel with global atomic operations.</figcaption>
</figure>

### Latency and Throughput of Atomic Operations

Atomics on the same location are serialized, so they do not benefit from the massive parallelism. A global atomic is performed near the memory, in the **L2 cache** on current GPUs (on the first CUDA GPUs it went all the way to DRAM, with a read and a write each taking hundreds of cycles). If a location receives a stream of atomics, the throughput on it is **one atomic per atomic latency**, however many threads are waiting.

<div class="example">

If an atomic on one location takes $t$ ns from the L2's point of view, a histogram whose inputs all fall in one bin runs at $1/t$ updates per second. With $t = 1$ ns that is $10^9$ updates per second; at one byte per input, 1 GB/s of input, far below the hundreds of GB/s the memory could deliver. Text has a few frequent bins, so the contention on them sets the speed. Spreading the atomics over more locations, or making each atomic cheaper, is what the following techniques do.

</div>

### Privatization

**Privatization** replicates the output so that different groups of threads update different copies, and merges the copies at the end. For a histogram, each block keeps a **private histogram in shared memory**. Shared-memory atomics are performed in the SM with much lower latency than global ones, and only the threads of one block contend for each copy. At the end, the block adds its private bins to the global histogram, one global atomic per bin per block instead of one per input element.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_histogram_atomic/privatized_histogram.svg" alt="Privatized histogram" width="600px" class="fig" caption="Privatization: each block accumulates a private histogram in shared memory, where atomics are fast and only the block's threads contend, and then adds it to the global histogram with one atomic per bin." >}}

<figure class="fig">

```c
#define NUM_BINS 7
__global__ void histo_private_kernel(const char* data, unsigned int length, unsigned int* histo) {
    __shared__ unsigned int histo_s[NUM_BINS];
    for (unsigned int b = threadIdx.x; b < NUM_BINS; b += blockDim.x)
        histo_s[b] = 0u;                                   // initialize the private copy
    __syncthreads();
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < length) {
        int pos = data[i] - 'a';
        if (pos >= 0 && pos < 26) atomicAdd(&histo_s[pos / 4], 1);   // shared-memory atomic
    }
    __syncthreads();
    for (unsigned int b = threadIdx.x; b < NUM_BINS; b += blockDim.x) {
        unsigned int v = histo_s[b];
        if (v > 0) atomicAdd(&histo[b], v);                // merge: one global atomic per bin
    }
}
```

<figcaption>Histogram with private copies in shared memory.</figcaption>
</figure>

The private copies cost their initialization and merging, which pays off when each block processes many inputs. Privatization requires that the histogram fit in shared memory; for very many bins, the private copies can be kept in global memory per group of blocks, or only the frequent bins privatized.

### Coarsening

With one input per thread, every block merges its private histogram after handling only `blockDim.x` inputs, so the merge overhead is large. With **thread coarsening**, the grid has only as many blocks as can run at once (a few per SM), and each thread processes many inputs, so each private histogram is merged once after a large part of the input. There are two ways to assign inputs to threads:

- **Contiguous partitioning**: thread $t$ processes elements $t \cdot c$ to $t \cdot c + c - 1$. This gives good locality on a CPU, but on a GPU, consecutive threads of a warp read addresses $c$ elements apart at the same time: uncoalesced.
- **Interleaved partitioning**: in each iteration, the threads of the grid process consecutive elements, then all jump by the total number of threads. Each warp reads consecutive addresses, which is coalesced. This *grid-stride loop* is the standard pattern.

<figure class="fig">

```c
__global__ void histo_coarsened_kernel(const char* data, unsigned int length, unsigned int* histo) {
    __shared__ unsigned int histo_s[NUM_BINS];
    for (unsigned int b = threadIdx.x; b < NUM_BINS; b += blockDim.x) histo_s[b] = 0u;
    __syncthreads();
    for (unsigned int i = blockIdx.x * blockDim.x + threadIdx.x; i < length;
         i += blockDim.x * gridDim.x) {                    // interleaved (grid-stride) loop
        int pos = data[i] - 'a';
        if (pos >= 0 && pos < 26) atomicAdd(&histo_s[pos / 4], 1);
    }
    __syncthreads();
    for (unsigned int b = threadIdx.x; b < NUM_BINS; b += blockDim.x)
        if (histo_s[b] > 0) atomicAdd(&histo[b], histo_s[b]);
}
```

<figcaption>Coarsened histogram kernel with interleaved partitioning (launched with a few blocks per SM).</figcaption>
</figure>

### Aggregation

Some inputs have long runs of identical values, such as the sky in an image, so many updates go to the same bin and contend heavily. **Aggregation** lets each thread combine consecutive updates to the same bin before issuing an atomic. It works best with contiguous partitioning, where a thread's consecutive elements are neighbours in the input and so fall in the same run; with the interleaved loop below, a thread's consecutive elements are `stride` apart, and aggregation helps only when a few values dominate the whole input: the thread keeps the previous bin and an accumulator in registers, and when the bin changes, it issues one `atomicAdd` with the accumulated count.

```c
unsigned int acc = 0; int prevBin = -1;
for (unsigned int i = tid; i < length; i += stride) {
    int pos = data[i] - 'a';
    if (pos >= 0 && pos < 26) {
        int bin = pos / 4;
        if (bin == prevBin) ++acc;
        else {
            if (acc > 0) atomicAdd(&histo_s[prevBin], acc);
            acc = 1; prevBin = bin;
        }
    }
}
if (acc > 0) atomicAdd(&histo_s[prevBin], acc);
```

Aggregation adds instructions and branches, so it pays off only when the data have high contention. A warp can also aggregate across its threads with `__match_any_sync`, which groups the lanes that target the same bin so that one lane per group issues the atomic (the [warp-aggregated atomic](#warp-level-primitives) idea).

### Memory Consistency and Fences

Atomics make individual read-modify-writes indivisible, but they do not order a thread's **other** memory accesses. GPUs have a **weak memory model**: writes by one thread may become visible to threads in other blocks in a different order than they were made, and the compiler may keep values in registers or reorder accesses ([Part III](/posts/computer-systems-3/#hazards-across-cores)). Within a block, `__syncthreads()` orders all shared- and global-memory accesses of the block's threads. Between blocks, ordering requires fences [[2]](#ref-2):

- `__threadfence()` makes all writes to global memory by the calling thread **before** the fence visible to all threads of the device before any of its writes **after** the fence;
- `__threadfence_block()` does the same for threads of the same block, and `__threadfence_system()` also for the host and other GPUs;
- `volatile` on a variable forces every access to go to memory instead of a register;
- newer code uses `cuda::atomic_ref` with explicit memory orders (`memory_order_release`, `memory_order_acquire`) and scopes (block, device, system), the C++ memory model applied to the GPU.

<div class="example">

A single-kernel sum: each block computes a partial sum, and the **last block to finish** adds up the partial sums. Each block writes its partial sum to `partial[blockIdx.x]`, then thread 0 increments a global counter with `atomicInc`; the block that gets the ticket `gridDim.x - 1` is the last, and it sums `partial[]`. `atomicInc(addr, m)` wraps to 0 when the old value is at least `m`, so with `m = gridDim.x - 1` the last block resets the counter for the next launch.

```c
__device__ unsigned int count = 0;
...
__shared__ bool isLast;
if (threadIdx.x == 0) {
    partial[blockIdx.x] = blockSum;
    __threadfence();                          // partial sum visible before the counter moves
    unsigned int ticket = atomicInc(&count, gridDim.x - 1);
    isLast = (ticket == gridDim.x - 1);
}
__syncthreads();
if (isLast) { /* sum partial[0 .. gridDim.x-1], read through a volatile pointer */ }
```

Without the fence, the counter increment could become visible to the last block **before** another block's partial sum, so the last block could read a stale value. The fence orders the two writes of each writing block; on the reading side, the last block reads `partial[]` through a `volatile` pointer (or with acquire semantics) so that the values are not taken from a stale cache or register.

</div>


## Parallel Patterns: Prefix Sum

Prefix sum (scan) is the pattern that turns seemingly sequential computations into parallel ones. It is used in stream compaction (selecting elements), radix sort, allocating output space when each thread produces a variable number of results, building sparse-matrix structures, solving recurrences, and lexical analysis. It also shows the central trade-off of parallel algorithm design: an algorithm that finishes in the fewest steps may do much more work than the sequential one. [[5]](#ref-5)

### Background

<div class="definition">

An **inclusive scan** takes a binary associative operator $\oplus$ and an array $[x_0, x_1, \ldots, x_{n-1}]$ and returns $[x_0,\ x_0 \oplus x_1,\ \ldots,\ x_0 \oplus x_1 \oplus \cdots \oplus x_{n-1}]$. An **exclusive scan** returns $[I,\ x_0,\ x_0 \oplus x_1,\ \ldots,\ x_0 \oplus \cdots \oplus x_{n-2}]$, where $I$ is the identity of $\oplus$ (0 for addition). With $\oplus = +$, scan is the **prefix sum**.

</div>

<div class="example">

For $x = [3, 1, 7, 0, 4, 1, 6, 3]$, the inclusive prefix sum is $[3, 4, 11, 11, 15, 16, 22, 25]$ and the exclusive one $[0, 3, 4, 11, 11, 15, 16, 22]$. The exclusive scan gives each element its **starting position**: if element $i$ needs $x_i$ slots in an output array, it writes them starting at the $i$-th exclusive prefix sum. If the slices of a sausage of lengths $x_i$ are cut for 8 people, the inclusive scan gives the cut points.

</div>

Sequentially, scan is one loop, `y[0] = x[0]; for (i = 1; i < n; ++i) y[i] = y[i-1] + x[i];`, with $n - 1$ additions. Each element depends on the previous one, which looks inherently sequential. Associativity is what allows a parallel algorithm: the additions can be grouped in any way. (Floating-point addition is only approximately associative, so a parallel scan can differ in the last bits; see [Algorithm Considerations](#algorithm-considerations).)

<div class="definition">

A parallel algorithm is **work-efficient** if it does asymptotically the same amount of work as the best sequential algorithm, here $O(n)$ operations.

</div>

### Kogge–Stone Scan

The Kogge–Stone algorithm (originally a design for adder circuits) works **in place** in $\log_2 n$ steps. In step $k$ (stride $2^k$), every element $i \ge 2^k$ adds the element $2^k$ positions to its left:

$$
x_i \leftarrow x_i + x_{i - 2^k}.
$$

After step $k$, element $i$ holds the sum of the $2^{k+1}$ elements ending at $i$ (or of all elements from 0 to $i$ if fewer), so after $\lceil \log_2 n \rceil$ steps every element holds its inclusive prefix sum.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_prefix_sum/kogge_stone_scan.svg" alt="Kogge-Stone scan" width="616px" class="fig" caption="Kogge–Stone inclusive scan of 8 elements: in step <i>k</i>, every element <i>i</i> ≥ 2<sup><i>k</i></sup> adds the element 2<sup><i>k</i></sup> to its left. After log<sub>2</sub> 8 = 3 steps each element holds the sum of all elements up to it. Shaded cells are written in that step." >}}

<figure class="fig">

```c
#define SECTION_SIZE 1024
__global__ void Kogge_Stone_scan(const float* X, float* Y, unsigned int N) {
    __shared__ float XY[SECTION_SIZE];
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    XY[threadIdx.x] = (i < N) ? X[i] : 0.0f;
    for (unsigned int stride = 1; stride < blockDim.x; stride *= 2) {
        __syncthreads();
        float temp;
        if (threadIdx.x >= stride)
            temp = XY[threadIdx.x] + XY[threadIdx.x - stride];
        __syncthreads();                    // all reads of this step before any write
        if (threadIdx.x >= stride)
            XY[threadIdx.x] = temp;
    }
    if (i < N) Y[i] = XY[threadIdx.x];
}
```

<figcaption>Kogge–Stone scan of one section of <code>SECTION_SIZE</code> elements, one thread per element.</figcaption>
</figure>

The **second barrier** matters: within a step, thread $i$ reads `XY[i - stride]`, which thread $i - \text{stride}$ is writing in the same step. Without the barrier between the read and the write, a thread could read a value already updated in this step (a *write-after-read* race). Instead of two barriers, the kernel can use two shared arrays and alternate between them (**double buffering**): each step reads one array and writes the other.

**Work.** Step $k$ does $n - 2^k$ additions, so the total is

$$
\sum_{k=0}^{\log_2 n - 1} (n - 2^k) = n \log_2 n - (n - 1),
$$

against $n - 1$ for the sequential loop. For $n = 1024$: $10{,}240 - 1023 = 9217$ additions, 9 times the sequential count. Kogge–Stone is **not work-efficient**. [[9]](#ref-9) It is still fast when there are enough execution resources for all the threads to work at once, since it takes only $\log_2 n$ steps, and its control flow is simple (whole warps become inactive in order, which causes divergence only in the first 5 steps). With fewer resources than threads, the extra work turns directly into time. (On a warp, the same algorithm is the 5-step `__shfl_up_sync` scan, with each lane adding the value of lane $i - 2^k$ if $i \ge 2^k$.)

To get an **exclusive** scan from the same kernel, load `XY[threadIdx.x]` from `X[i - 1]` (and 0 for thread 0): each element then receives the sum of the elements before it.

### Brent–Kung Scan

The Brent–Kung algorithm is work-efficient. It has two phases:

1. A **reduction tree** (up-sweep): in step $k$, the elements at positions $i$ with $(i + 1) \bmod 2^{k+1} = 0$ add the element $2^k$ to their left. This is the reduction of [Reduction](#reduction): after $\log_2 n$ steps, the last element holds the total, and the elements at positions $2^{k+1} - 1, 2(2^{k+1}) - 1, \ldots$ hold the sums of aligned blocks of $2^{k+1}$ elements.
2. A **distribution tree** (down-sweep): the partial sums are pushed to the positions that still lack them. With strides $n/4, n/8, \ldots, 1$, the element at position $i \ge 2^{k+1}$ with $(i + 1) \bmod 2^{k+1} = 2^k$ (that is, $2^k$ positions after the end of an aligned block of $2^{k+1}$) adds the element $2^k$ to its left.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_prefix_sum/brent_kung_scan.svg" alt="Brent-Kung scan" width="616px" class="fig" caption="Brent–Kung inclusive scan of 8 elements: a reduction tree (up-sweep) leaves partial sums at positions 1, 3 and 7, and a distribution tree (down-sweep) pushes them to the positions in between. Only the shaded cells are written: 11 additions instead of Kogge–Stone's 17." >}}

<figure class="fig">

```c
__global__ void Brent_Kung_scan(const float* X, float* Y, unsigned int N) {
    __shared__ float XY[SECTION_SIZE];
    unsigned int i = 2 * blockIdx.x * blockDim.x + threadIdx.x;
    // each thread loads two elements: a block of SECTION_SIZE/2 threads covers a section
    XY[threadIdx.x] = (i < N) ? X[i] : 0.0f;
    XY[threadIdx.x + blockDim.x] = (i + blockDim.x < N) ? X[i + blockDim.x] : 0.0f;
    for (unsigned int stride = 1; stride <= blockDim.x; stride *= 2) {   // reduction tree
        __syncthreads();
        unsigned int index = (threadIdx.x + 1) * 2 * stride - 1;
        if (index < SECTION_SIZE) XY[index] += XY[index - stride];
    }
    for (int stride = SECTION_SIZE / 4; stride > 0; stride /= 2) {       // distribution tree
        __syncthreads();
        unsigned int index = (threadIdx.x + 1) * stride * 2 - 1;
        if (index + stride < SECTION_SIZE) XY[index + stride] += XY[index];
    }
    __syncthreads();
    if (i < N) Y[i] = XY[threadIdx.x];
    if (i + blockDim.x < N) Y[i + blockDim.x] = XY[threadIdx.x + blockDim.x];
}
```

<figcaption>Brent–Kung scan: <code>SECTION_SIZE / 2</code> threads per block, two elements per thread.</figcaption>
</figure>

The index calculation `(threadIdx.x + 1) * 2 * stride - 1` maps the active elements of each step to **consecutive threads**: in the first step threads 0, 1, 2, … handle elements 1, 3, 5, …, so the active threads stay contiguous and whole warps drop out, the same trick as the [reduction with less divergence](#reduction). The distribution tree, with `index + stride`, does the same in reverse.

**Work.** The reduction tree does $n/2 + n/4 + \cdots + 1 = n - 1$ additions, and the distribution tree $(2 - 1) + (4 - 1) + \cdots + (n/2 - 1) = n - 1 - \log_2 n$. The total, $2n - 2 - \log_2 n$, is less than twice the sequential count: **work-efficient**. For $n = 1024$: $2046 - 10 = 2036$ additions against 9217 for Kogge–Stone. The price is $2 \log_2 n - 1$ steps instead of $\log_2 n$, and more complex indexing.

<figure class="table">
<figcaption>Comparison of the scan algorithms for n elements.</figcaption>

| | Steps | Additions | n = 1024 |
|:--|:-:|:-:|:-:|
| Sequential | $n - 1$ | $n - 1$ | 1023 |
| Kogge–Stone | $\log_2 n$ | $n \log_2 n - (n - 1)$ | 9217 |
| Brent–Kung | $2 \log_2 n - 1$ | $2n - 2 - \log_2 n$ | 2036 |

</figure>

On a GPU, which matters depends on the resources: within a warp, all 32 lanes execute every step anyway, so Kogge–Stone's extra work costs nothing and its fewer steps win; across a large section, the number of active threads exceeds the execution units and the work-efficient algorithm wins.

### Coarsening for Even More Work Efficiency

Both algorithms use one or two elements per thread, so most of the threads are needed only for the first steps. A **coarsened** scan gives each thread a subsection and works in three phases [[5]](#ref-5):

1. **Sequential scan within subsections.** The block loads its section into shared memory with coalesced accesses (consecutive threads load consecutive elements), then each thread scans its own subsection of, say, 8 consecutive elements sequentially.
2. **Scan of the subsection totals.** The last element of each subsection (its total) is scanned across threads with Kogge–Stone or Brent–Kung.
3. **Add.** Each thread adds the scanned total of the preceding subsections to all but the last element of its subsection.

With a section of $n$ elements and $t$ threads ($n/t$ elements each), phase 1 does $t(n/t - 1) = n - t$ additions, phase 2 a scan of $t$ elements, and phase 3 about $n - t$: close to $2n$ in total, with the parallel scan applied only to $t$ elements. The sequential phases are fast because they work on contiguous data in shared memory, and the section can be much larger than the block size.

### Hierarchical Scan for Arbitrary-Length Inputs

A single block can scan only one section (limited by shared memory and the 1024-thread block size), and threads in different blocks cannot synchronize. Arbitrary-length inputs use a **hierarchical scan** [[5]](#ref-5), [[14]](#ref-14):

1. Each block scans its section (with any of the kernels above) and writes the section's total, the last element of its scanned section, to an auxiliary array `S` at position `blockIdx.x`.
2. A second kernel scans `S`. If `S` itself does not fit in one block, the hierarchy is applied recursively.
3. A third kernel adds `S[blockIdx.x - 1]`, the total of all earlier sections, to every element of section `blockIdx.x` (for `blockIdx.x` > 0).

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_prefix_sum/hierarchical_scan_arbitrary_length_inputs.svg" alt="Hierarchical scan for arbitrary-length inputs" width="640px" class="fig" caption="Hierarchical scan: (1) each block scans its section and writes the section's total to an array S; (2) S is scanned; (3) the scanned total of all earlier sections is added to every element of each section." >}}

<div class="example">

With 1024-element sections, an input of $2^{20}$ (about a million) elements has 1024 sections, so `S` has 1024 elements and fits in one block: three kernel launches. An input of $2^{30}$ elements needs a two-level hierarchy for `S`.

</div>

The three kernels read and write the whole array twice (once in phase 1, once in phase 3). A **single-pass** scan avoids this with communication between adjacent blocks: block $b$ waits for block $b - 1$ to publish the scanned total of all sections up to $b - 1$ in global memory (with a flag set after a memory fence, as in [Memory Consistency and Fences](#memory-consistency-and-fences)), adds its own total, and publishes the result for block $b + 1$. Since blocks are not scheduled in order, each block gets its position from a global counter incremented with `atomicAdd` when it starts, rather than from `blockIdx.x`, so that a block never waits for a block that has not started. The libraries CUB and Thrust implement such single-pass scans (with "decoupled look-back", in which a block can combine several predecessors' partial results instead of waiting for them strictly in turn). [[10]](#ref-10)

### An Application: Stream Compaction

Scan turns the problem of writing a variable number of outputs per thread into a parallel one. To keep only the elements of `in` that satisfy a predicate:

1. Compute a flag array, `flag[i] = pred(in[i]) ? 1 : 0`.
2. Exclusive-scan the flags: `pos[i]` is the number of kept elements before `i`.
3. Every kept element writes `out[pos[i]] = in[i]`; the output size is `pos[n-1] + flag[n-1]`.

<div class="example">

For `in` = [3, 8, 1, 6, 9, 2] and the predicate "even": flags [0, 1, 0, 1, 0, 1], exclusive scan [0, 0, 1, 1, 2, 2], so 8, 6 and 2 go to positions 0, 1 and 2; the output has $2 + 1 = 3$ elements. Each step is fully parallel. The same structure builds the bins of the [cutoff algorithm](#cutoff-binning) and the row pointers of sparse matrices ([Sparse Matrix Computation](#parallel-patterns-sparse-matrix-computation)), and it is the core of [radix sort](#radix-sort).

</div>


## Parallel Patterns: Sparse Matrix Computation

The data of the earlier patterns were dense and regular. Many real problems produce **sparse** matrices, in which most elements are zero: the discretized PDEs behind stencils, graphs (a social network's adjacency matrix), circuit simulation, recommendation systems and machine-learning models. Storing and multiplying the zeros wastes memory, bandwidth and work, so sparse matrices are stored in **compressed formats**. The choice of format trades storage efficiency, flexibility and the regularity that GPUs need (coalescing and low divergence), which is the theme of this chapter. [[5]](#ref-5) [[11]](#ref-11)

### Background

The central operation is **sparse matrix–vector multiplication** (SpMV), $y = Ax$ (or $y \leftarrow Ax + y$). It dominates iterative solvers such as the conjugate gradient method: each iteration multiplies the matrix by a vector, and the matrix is too large to factor or invert.

SpMV is **memory-bound**: each nonzero is used for one multiply-add (2 operations) after loading its value and column index (8 bytes) and an element of $x$ (4 bytes), so the arithmetic intensity is only $2/12$, about 0.17 FLOP/byte, far below the ridge point of any GPU. Performance therefore depends on how efficiently the format lets the matrix be read: coalesced accesses, little padding, and balanced work among threads.

The example matrix below has 7 nonzeros among 16 elements, and row 1 is empty.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_sparse_matrix/sparse_matrix_coo_csr_formats.svg" alt="A sparse matrix in COO and CSR formats" width="640px" class="fig" caption="A 4 × 4 sparse matrix with 7 nonzeros in the coordinate (COO) format, which stores the row and column of every nonzero, and the compressed sparse row (CSR) format, which replaces the row indices by the start of each row." >}}

### The Coordinate (COO) Format

<div class="definition">

The **COO** format stores, for each nonzero, its value, its column index and its row index, in three arrays `value`, `colIdx` and `rowIdx` of length nnz (the number of nonzeros).

</div>

COO is the most **flexible** format: the nonzeros can be stored in any order, and adding one means appending to the three arrays. A parallel SpMV assigns one thread to each nonzero, but different nonzeros of a row add into the same $y$ element, so the additions must be **atomic** ([Atomic Operations](#atomic-operations)):

<figure class="fig">

```c
struct COOMatrix { unsigned int numRows, numCols, numNonzeros;
                   unsigned int *rowIdx, *colIdx; float *value; };

__global__ void spmv_coo_kernel(COOMatrix A, const float* x, float* y) {
    unsigned int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < A.numNonzeros) {
        unsigned int row = A.rowIdx[i], col = A.colIdx[i];
        atomicAdd(&y[row], A.value[i] * x[col]);
    }
}
```

<figcaption>SpMV with the COO format: one thread per nonzero.</figcaption>
</figure>

The accesses to `rowIdx`, `colIdx` and `value` are coalesced and every thread does the same work, but COO stores an extra index per nonzero and pays for an atomic per nonzero. The accesses to `x[col]` are irregular in every format; they benefit from the caches (and the read-only path) when nearby rows use nearby columns.

### The Compressed Sparse Row (CSR) Format

<div class="definition">

The **CSR** format stores the nonzeros sorted by row, in arrays `value` and `colIdx` of length nnz, and an array `rowPtrs` of length (number of rows + 1), in which `rowPtrs[r]` is the position of the first nonzero of row $r$ and `rowPtrs[numRows]` = nnz. Row $r$ occupies positions `rowPtrs[r]` to `rowPtrs[r+1] − 1`.

</div>

CSR replaces the nnz row indices of COO by numRows + 1 pointers, so it is more compact when rows have more than one nonzero on average, and it is the most widely used format. With one thread per row, each thread computes one dot product without atomics:

<figure class="fig">

```c
struct CSRMatrix { unsigned int numRows, numCols, numNonzeros;
                   unsigned int *rowPtrs, *colIdx; float *value; };

__global__ void spmv_csr_kernel(CSRMatrix A, const float* x, float* y) {
    unsigned int row = blockIdx.x * blockDim.x + threadIdx.x;
    if (row < A.numRows) {
        float sum = 0.0f;
        for (unsigned int i = A.rowPtrs[row]; i < A.rowPtrs[row + 1]; ++i)
            sum += A.value[i] * x[A.colIdx[i]];
        y[row] += sum;
    }
}
```

<figcaption>SpMV with the CSR format: one thread per row.</figcaption>
</figure>

This kernel has two problems:

1. **Uncoalesced accesses.** In iteration $i$, consecutive threads read the $i$-th nonzero of consecutive rows, which are as far apart as the rows are long. The accesses of a warp are spread over many sectors.
2. **Control divergence and load imbalance.** Each thread loops over the nonzeros of its row, so a warp takes as long as its longest row, and threads with short rows sit idle. Real matrices often have a few very long rows (a celebrity in a social network graph).

A common improvement assigns a **warp per row** (the *vector* CSR kernel) [[11]](#ref-11): the 32 lanes read consecutive nonzeros of the row (coalesced) and combine their partial sums with a [warp shuffle reduction](#warp-level-primitives). This works well for rows of at least several dozen nonzeros, and libraries choose between such variants by row length.

### The ELL Format

<div class="definition">

The **ELL** format (from the ELLPACK package) pads every row with dummy entries to the length of the longest row, and stores the padded `value` and `colIdx` arrays **column-major**: first the first entry of every row, then the second entry of every row, and so on.

</div>

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_sparse_matrix/ell_format.svg" alt="ELL format" width="634px" class="fig" caption="The ELL format pads every row to the length of the longest row and stores the padded matrix column-major, so that in each iteration consecutive threads (rows) read consecutive elements. Padding entries (·) are wasted storage and work." >}}

In the column-major layout, iteration $k$ of the thread for row $r$ reads element $k \cdot \text{numRows} + r$, so the threads of a warp read consecutive elements: **coalesced**. Every thread also executes the same number of iterations, so there is no divergence (the padding entries have value 0 and contribute nothing).

<figure class="fig">

```c
struct ELLMatrix { unsigned int numRows, numCols, maxNnzPerRow;
                   unsigned int *nnzPerRow, *colIdx; float *value; };

__global__ void spmv_ell_kernel(ELLMatrix A, const float* x, float* y) {
    unsigned int row = blockIdx.x * blockDim.x + threadIdx.x;
    if (row < A.numRows) {
        float sum = 0.0f;
        for (unsigned int t = 0; t < A.nnzPerRow[row]; ++t) {
            unsigned int i = t * A.numRows + row;           // column-major index
            sum += A.value[i] * x[A.colIdx[i]];
        }
        y[row] += sum;
    }
}
```

<figcaption>SpMV with the ELL format. Looping to <code>nnzPerRow[row]</code> instead of <code>maxNnzPerRow</code> skips the padding at the cost of some divergence.</figcaption>
</figure>

The cost is the **padding**. If one row is much longer than the others, every row is padded to its length.

<div class="example">

A 1000 × 1000 matrix has 999 rows with 3 nonzeros and one row with 200. In CSR it stores $2997 + 200 = 3197$ values. In ELL every row is padded to 200: $1000 \times 200 = 200{,}000$ values, 98% of them padding, and every thread loops 200 times (or diverges, if it stops at its own length).

</div>

### Hybrid ELL–COO

A **hybrid** format avoids the worst case: the rows are padded only to a moderate length $K$ (for example the typical row length), stored in ELL, and the nonzeros beyond $K$ in the long rows go into a COO part. The ELL part is processed with the coalesced, divergence-free kernel; the few COO nonzeros with the atomic kernel (or on the host). In the example, with $K = 3$, ELL stores $3000$ values with no padding at all and COO the remaining 197 nonzeros of the long row. The COO part also makes the format easier to update: new nonzeros can be appended to it.

### The JDS Format

The **jagged diagonal storage (JDS)** format reduces padding and divergence another way: the rows are **sorted by decreasing length** (keeping the permutation to put the results back), and the $k$-th nonzeros of all rows that have one are stored together, as a "jagged diagonal", one diagonal after another. An array `iterPtr` gives the start of each diagonal.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_sparse_matrix/jds_format.svg" alt="JDS format" width="614px" class="fig" caption="The jagged diagonal storage (JDS) format sorts the rows by their number of nonzeros and stores the k-th nonzero of every row together, without padding; adjacent threads handle rows of similar length, which reduces divergence." >}}

Thread $r$ (in sorted order) reads its $k$-th nonzero at `iterPtr[k] + r`, so consecutive threads read consecutive elements (coalesced, like ELL), with no padding (like CSR). Because the rows are sorted, the threads of a warp handle rows of similar lengths, which minimizes divergence. The cost is the sorting, which makes JDS expensive to build and update. [[5]](#ref-5)

<figure class="table">
<figcaption>Comparison of sparse matrix formats for SpMV on a GPU.</figcaption>

| Format | Storage | Coalesced | Divergence / imbalance | Atomics | Easy to modify |
|:--|:--|:-:|:-:|:-:|:-:|
| COO | 3 arrays of nnz | yes | none | yes | yes |
| CSR | 2 × nnz + rows + 1 | no (thread per row) | high for varied rows | no | no |
| ELL | 2 × rows × max length | yes | low (padding work) | no | no |
| ELL–COO | ELL to length K + COO rest | mostly | low | for the COO part | partly |
| JDS | 2 × nnz + rows + diagonals | yes | low (rows sorted) | no | no |

</figure>

Converting between formats uses the earlier patterns: building CSR from COO is a **histogram** of the row indices (the number of nonzeros per row) followed by an **exclusive scan** of the counts, which gives `rowPtrs` ([Prefix Sum](#parallel-patterns-prefix-sum)), followed by a scatter of the nonzeros to their positions.


## Parallel Patterns: Merge and Sort

Merging two sorted lists and sorting are basic operations of databases, graphics (sorting primitives by depth or by screen tile), sparse-matrix construction and many other algorithms. They are harder to parallelize than the previous patterns because the input range a thread needs depends on the **data**: which elements of the inputs end up in a given part of the output is not known until the data are examined. The solution, finding the input ranges by binary search, is a technique used well beyond merging. [[5]](#ref-5)

### Ordered Merge

<div class="definition">

An **ordered merge** takes two sorted arrays $A$ (of $m$ elements) and $B$ (of $n$ elements) and produces a sorted array $C$ of $m + n$ elements containing all of them. It is **stable** if equal elements keep their order, with elements of $A$ placed before equal elements of $B$.

</div>

<figure class="fig">

```c
__host__ __device__ void merge_sequential(const int* A, int m, const int* B, int n, int* C) {
    int i = 0, j = 0, k = 0;
    while (i < m && j < n)
        C[k++] = (A[i] <= B[j]) ? A[i++] : B[j++];    // <= keeps A's element first: stable
    while (i < m) C[k++] = A[i++];
    while (j < n) C[k++] = B[j++];
}
```

<figcaption>Sequential ordered merge: $O(m + n)$ time.</figcaption>
</figure>

### Parallel Merge and the Co-Rank Function

A parallel merge divides the **output** among threads: each thread produces a contiguous section of $C$. The question is which parts of $A$ and $B$ a thread needs for its section.

<div class="definition">

For an output position $k$, the **co-rank** is the pair $(i, j)$ with $i + j = k$ such that $C[0..k-1]$ is the merge of $A[0..i-1]$ and $B[0..j-1]$. The thread producing $C[k..k'-1]$ merges $A[i..i'-1]$ and $B[j..j'-1]$, where $(i, j)$ and $(i', j')$ are the co-ranks of $k$ and $k'$.

</div>

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_merge_sort/co_rank_parallel_merge.svg" alt="Co-rank in parallel merge" width="520px" class="fig" caption="Co-rank: for output position k = 4, the prefix C[0..3] is the merge of the first i = 3 elements of A and the first j = 1 element of B, with i + j = k. A thread that computes C[k..] can find (i, j) by binary search and merge from there independently of other threads." >}}

The co-rank can be found by **binary search** on $i$ (then $j = k - i$). The correct $i$ satisfies two conditions, the last elements taken must not be larger than the first elements not taken:

$$
A[i - 1] \le B[j] \quad \text{and} \quad B[j - 1] < A[i].
$$

If $A[i - 1] > B[j]$, too many elements of $A$ were taken and $i$ must decrease; if $B[j - 1] \ge A[i]$, too few and $i$ must increase. (The strict and non-strict comparisons keep the merge stable.)

<figure class="fig">

```c
__device__ int co_rank(int k, const int* A, int m, const int* B, int n) {
    int i = min(k, m), j = k - i;                 // start with as many A elements as possible
    int i_low = max(0, k - n), j_low = max(0, k - m);
    while (true) {
        if (i > 0 && j < n && A[i - 1] > B[j]) {          // i too large
            int delta = (i - i_low + 1) >> 1;
            j_low = j; j += delta; i -= delta;
        } else if (j > 0 && i < m && B[j - 1] >= A[i]) {  // j too large
            int delta = (j - j_low + 1) >> 1;
            i_low = i; i += delta; j -= delta;
        } else
            return i;                                     // co-rank found
    }
}

__global__ void merge_basic_kernel(const int* A, int m, const int* B, int n, int* C) {
    int tid = blockIdx.x * blockDim.x + threadIdx.x;
    int elementsPerThread = (m + n + blockDim.x * gridDim.x - 1) / (blockDim.x * gridDim.x);
    int k_curr = min(tid * elementsPerThread, m + n);
    int k_next = min((tid + 1) * elementsPerThread, m + n);
    int i_curr = co_rank(k_curr, A, m, B, n), i_next = co_rank(k_next, A, m, B, n);
    int j_curr = k_curr - i_curr, j_next = k_next - i_next;
    merge_sequential(&A[i_curr], i_next - i_curr, &B[j_curr], j_next - j_curr, &C[k_curr]);
}
```

<figcaption>Parallel merge: each thread finds the co-ranks of the start and end of its output section by binary search and merges its section sequentially.</figcaption>
</figure>

<div class="example">

Merge $A = [1, 7, 8, 9, 10]$ and $B = [7, 10, 10, 12]$ with 3 threads of 3 output elements each. Thread 1 starts at $k = 3$: trying $i = 3, j = 0$ fails because $A[2] = 8 > B[0] = 7$; the search moves to $i = 1, j = 2$, which fails because $B[1] = 10 \ge A[1] = 7$; then $i = 2, j = 1$ satisfies $A[1] = 7 \le B[1] = 10$ and $B[0] = 7 < A[2] = 8$. So thread 1 merges from $A[2]$ and $B[1]$ and produces $C[3..5] = [8, 9, 10]$, while thread 0 produced $[1, 7, 7]$ from $A[0..1]$ and $B[0]$. The full result is $C = [1, 7, 7, 8, 9, 10, 10, 10, 12]$.

</div>

The binary search takes $O(\log \min(m, n))$ steps per thread, so the total work is $O(m + n + p \log(m + n))$ for $p$ threads, nearly work-efficient when each thread merges many elements.

### Tiled Merge

In the basic kernel, the threads of a warp merge sections of $A$ and $B$ that are far apart in memory, and each thread's sequential merge reads its inputs one element at a time: the accesses are not coalesced. A **tiled merge** partitions the work at two levels, blocks and then threads, in three steps:

1. Each **block** computes the co-ranks of the start and end of its (large) output section, so it knows its input ranges in $A$ and $B$.
2. The block then works through its ranges in iterations: in each, its threads **cooperatively load** the next tile of $A$ and the next tile of $B$ into shared memory with coalesced accesses, each thread finds its co-ranks **within the tiles** (a cheap search in shared memory), and merges its part.
3. Since the number of elements consumed from each tile depends on the data, the block computes how many elements of $A$ and $B$ were used in this iteration (one more co-rank, at the end of the iteration's output) and advances its positions by those amounts.

A variant loads the tiles into a **circular buffer** so that the unconsumed part of a tile is not reloaded. [[5]](#ref-5) The tiled kernel replaces most global memory accesses by coalesced tile loads and shared-memory reads.

### Radix Sort

Comparison-based sorts need $\Omega(n \log n)$ comparisons. **Radix sort** sorts integer (or integer-encoded) keys without comparisons, by distributing the keys according to their digits, and it is the fastest GPU sort for such keys.

<div class="definition">

**Least-significant-digit (LSD) radix sort** sorts the keys by their lowest digit, then by the next digit, and so on, with a **stable** sort in each pass. Because each pass keeps the order of the previous ones among keys with equal digits, after the pass on the most significant digit the keys are fully sorted.

</div>

With 1-bit digits, each pass is a **split**: keys whose bit is 0 go to the front, keys whose bit is 1 to the back, each group in its original order. The destination of each key comes from an **exclusive scan** of the bits ([Prefix Sum](#parallel-patterns-prefix-sum)): if `onesBefore[i]` is the number of 1-keys before position $i$, a 0-key at $i$ goes to $i - \text{onesBefore}[i]$, and a 1-key to (number of 0-keys) + `onesBefore[i]`.

{{< figure src="/images/computer-systems/gpu-computing/parallel_patterns_merge_sort/pass_radix_sort.svg" alt="One pass of radix sort" width="600px" class="fig" caption="One pass of radix sort on bit 0: an exclusive scan of the bits gives, for each key, the number of 1-keys before it, from which its destination follows; keys with bit 0 equal to 0 move to the front, 1-keys to the back, each group keeping its order (a stable split)." >}}

<div class="example">

Sort [4, 7, 2, 6, 3, 5, 1, 0] (3-bit keys). Pass on bit 0 (above): [4, 2, 6, 0, 7, 3, 5, 1]. Pass on bit 1: the keys with bit 1 = 0 are 4, 0, 5, 1 and those with bit 1 = 1 are 2, 6, 7, 3, giving [4, 0, 5, 1, 2, 6, 7, 3]. Pass on bit 2: [0, 1, 2, 3, 4, 5, 6, 7]. Three passes for 3-bit keys; 32 passes for 32-bit keys with 1-bit digits.

</div>

A naive kernel does each pass with one thread per key: extract the bit, scan the bits across the whole array (a hierarchical scan), and scatter each key to its destination. The scatter is **uncoalesced**: consecutive threads write to two distant regions. Two optimizations make radix sort fast [[12]](#ref-12):

1. **Local sort in shared memory.** Each block first sorts its tile of keys by the current digit in shared memory (with a block-level scan), so that the keys of each bucket are contiguous within the tile. The block then writes each bucket's keys as a contiguous run, which coalesces the writes. The global position of each run is the number of keys in that bucket in earlier tiles plus the keys in smaller buckets in all tiles, an exclusive scan of a table of per-tile bucket counts.
2. **Multi-bit digits.** With $r$-bit digits, each pass distributes the keys into $2^r$ buckets, so a 32-bit key needs only $32/r$ passes. Each block computes a **histogram** of its keys' digits ([Histogram](#parallel-patterns-histogram-and-atomic-operations)), the histograms are scanned to give each block's starting position in each bucket, and the keys are scattered. Larger $r$ means fewer passes but more buckets: each block's writes are split into more, smaller runs (less coalescing), and the count table grows. Typical GPU implementations use $r = 4$ to 8.

Each pass reads and writes all keys, so radix sort does $O(n \cdot b / r)$ work for $b$-bit keys, linear in $n$, and is limited by memory bandwidth.

### Merge Sort

For keys that cannot be decomposed into digits, or with a general comparison function, **merge sort** is used: each block first sorts a tile in shared memory (with a sorting network or a block-level radix sort), and then the sorted tiles are merged in pairs, in $\log_2(\text{number of tiles})$ rounds. Early rounds merge many small pairs, one per block; later rounds merge a few very large pairs, each spread over many blocks with the [co-rank partitioning](#parallel-merge-and-the-co-rank-function), so all rounds keep the whole GPU busy. The total work is $O(n \log n)$.


## Application Case Study: Advanced MRI Reconstruction

This case study shows that parallel execution not only speeds up existing methods but makes practical methods that are known to be better but were ignored because of their computational cost. It goes through determining the kernel parallelism structure, assigning variables to CUDA memories, working around hardware limits and validating the results.

### Application Background

Magnetic resonance imaging (MRI) probes the structure and function of tissues safely and non-invasively. It has two phases: **acquisition** (scan), in which the scanner samples data in **k-space** (the spatial-frequency or Fourier domain) along a predefined trajectory, and **reconstruction**, in which the samples are transformed into the image. MRI is limited by noise, imaging artifacts and long acquisition times. Short scans increase throughput and reduce patient discomfort and motion artifacts; high resolution and fidelity allow earlier detection of disease. These goals (short scan time, high resolution, high signal-to-noise ratio, SNR) conflict: improving one usually costs the others, unless far more computation becomes affordable.

The k-space trajectory affects the image quality, the reconstruction time and the acquisition time. For a class of reconstruction methods, the image is

$$
\hat{m}(\mathbf{r}) = \sum_j W(\mathbf{k}_j)\, s(\mathbf{k}_j)\, e^{i 2\pi \mathbf{k}_j \cdot \mathbf{r}},
$$

where $s(\mathbf{k})$ is the measured k-space data and $W(\mathbf{k})$ is a weighting function that accounts for nonuniform sampling (it reduces the influence of densely sampled regions) and can also reduce noise and artifacts.

- If the samples lie on a uniform **Cartesian grid**, $W$ is constant and factors out, and reconstruction is an inverse **FFT**, which is extremely efficient. Cartesian trajectories are easy to implement on scanners and widely used.
- **Non-Cartesian** trajectories (spirals, radial lines, rosettes) are less sensitive to patient motion, give self-calibrating field inhomogeneity information, and need less from the scanner hardware. But the exponentials are no longer uniformly spaced, so the sum is not an FFT. The common approach, **gridding**, interpolates the samples onto a Cartesian grid (for example by convolving each sample with a gridding kernel) and then uses the FFT.

{{< figure src="/images/computer-systems/gpu-computing/application_case_study_advanced/scanner_k_space_trajectories_reconstruction_strategies.svg" alt="Scanner k-space trajectories and reconstruction strategies" width="640px" class="fig" caption="Scanner k-space trajectories and their reconstruction strategies: (A) Cartesian trajectory with FFT reconstruction; (B) a non-Cartesian (spiral) trajectory interpolated onto a Cartesian grid (gridding) so that the FFT can be used; (C) a spiral trajectory with linear-solver-based reconstruction (after Kirk &amp; Hwu, Fig. 8.1)." >}}

This chapter covers an **iterative, statistically optimal** reconstruction that models the imaging physics accurately and bounds the noise error in each voxel. It allows subtle phenomena to be measured, such as a map of **sodium** in tissue. Sodium is much less abundant than water in tissue, so measuring it reliably needs high SNR, which the iterative method provides. A change in sodium concentration is an early sign of disease or tissue death; for example, it can show early whether a brain tumour responds to chemotherapy. Such iterative reconstructions were impractical for large 3D problems, taking hours on a CPU, and GPUs brought them down to minutes, acceptable in clinical settings.

### Iterative Reconstruction

Haldar and Liang's linear-solver-based method models and compensates for the physics of the acquisition, reducing artifacts. It solves the quasi-Bayesian estimation problem

$$
(F^H F + \lambda W^H W)\,\boldsymbol{\rho} = F^H \mathbf{d},
$$

where $\boldsymbol{\rho}$ is the vector of voxel values of the reconstructed image, $F$ models the physics of imaging, $\mathbf{d}$ is the vector of data samples, and $W$ incorporates prior information such as anatomical constraints derived from high-resolution water scans of the patient.

{{< figure src="/images/computer-systems/gpu-computing/application_case_study_advanced/iterative_linear_solver_based_reconstruction.svg" alt="Iterative linear-solver-based reconstruction" width="520px" class="fig" caption="An iterative linear-solver-based approach to reconstructing non-Cartesian k-space data (after Kirk &amp; Hwu, Fig. 8.3)." >}}

A direct solution would multiply and add matrices ($F^H F + \lambda W^H W$), multiply a matrix by a vector ($F^H \mathbf{d}$), invert a matrix and multiply again, but the matrices are enormous: even for a 128³-voxel image, $F$ has 128³ columns of $N$ elements each, with $N$ the number of k-space samples. So the equation is solved iteratively with the **conjugate gradient (CG)** method, which improves the estimate $\boldsymbol{\rho}$ in each iteration and whose cost is dominated by matrix–vector products with $F^H F + \lambda W^H W$.

- $W$ is often sparse, so $W^H W$ is cheap, and $F^H F$ is a Toeplitz matrix, so products with it can be done with the FFT through a precomputed structure **Q**. Computing Q can take days on a CPU, but it is done once per trajectory and reused for many scans.
- $F^H \mathbf{d}$ takes about an order of magnitude less time than Q but still several hours for a 128³ image on a CPU (about 6 in single precision and over 8 in double), and it must be computed for **every** image. This is the target of the chapter. Q has the same computational structure, so the same method accelerates both.
- The CG step itself ("find ρ") takes less than 1% of the per-image time on a CPU, so it is left on the CPU.

### Computing FHd

The sequential code for Q and $F^H d$ has the same structure, an outer loop around an inner loop; Q has a much larger `M`, since it is a matrix–matrix product.

<figure class="fig">

```c
// (A) Q computation
for (m = 0; m < M; m++) {
    phiMag[m] = rPhi[m]*rPhi[m] + iPhi[m]*iPhi[m];
    for (n = 0; n < N; n++) {
        expQ = 2*PI*(kx[m]*x[n] + ky[m]*y[n] + kz[m]*z[n]);
        rQ[n] += phiMag[m]*cos(expQ);
        iQ[n] += phiMag[m]*sin(expQ);
    }
}

// (B) FHd computation
for (m = 0; m < M; m++) {
    rMu[m] = rPhi[m]*rD[m] + iPhi[m]*iD[m];
    iMu[m] = rPhi[m]*iD[m] - iPhi[m]*rD[m];
    for (n = 0; n < N; n++) {
        expFhD = 2*PI*(kx[m]*x[n] + ky[m]*y[n] + kz[m]*z[n]);
        cArg = cos(expFhD);
        sArg = sin(expFhD);
        rFhD[n] += rMu[m]*cArg - iMu[m]*sArg;
        iFhD[n] += iMu[m]*cArg + rMu[m]*sArg;
    }
}
```

<figcaption>Computation of Q and F<sup>H</sup>d (after Kirk &amp; Hwu, Fig. 8.4).</figcaption>
</figure>

$F^H d$ has substantial data parallelism. The code first computes the real and imaginary parts of Mu (`rMu`, `iMu`) at each k-space sample, then the real and imaginary parts of $F^H d$ at each voxel. Each voxel depends on all k-space samples, but no voxel depends on another, so all iterations of the outer loop can run in parallel, and so can all iterations of the inner loop; the inner loop depends only on the statements before it in the same outer iteration.

Two bottlenecks are evident:

1. In the inner loop, the ratio of floating-point operations to memory accesses is at best 3:1 (if `sin` and `cos` are 5-term Taylor series, 13 and 12 operations) and at worst 1:1 (if each is one hardware operation). A kernel needs a much higher ratio not to be limited by memory bandwidth. (The accesses are counted in Step 2 below: 14 per iteration.)
2. The ratio of arithmetic to trigonometric operations is only 13:2, so the GPU code must tolerate or avoid the long latency of `sin` and `cos`.

#### Step 1. Determine the Kernel Parallelism Structure

The straightforward conversion maps each iteration of the **outer** loop to a thread: each thread computes the contribution of one k-space sample to all $F^H d$ elements. M is typically hundreds of thousands, so many blocks are needed: with 65,536 samples and 512 threads per block (`FHd_THREADS_PER_BLOCK`), the grid has 128 blocks, and thread `blockIdx.x*512 + threadIdx.x` handles sample `m`.

Such a kernel has a major problem: **all threads write to all voxel elements**. It would need atomic operations in the inner loop to keep threads from overwriting each other's contributions, which would be very slow; as written, it is incorrect.

The listings in this chapter keep the book's shorthand: the parameter lists are abbreviated (a real kernel also receives `rD`, `iD`, `rFhD` and `iFhD`, all `float*`), and the bounds check `if (m < M)` or `if (n < N)` is omitted. `PI` must be a `float` constant such as `3.14159265f`; a double literal would make `2*PI*(...)` a double-precision computation, which runs at 1/64 of the single-precision rate on the RTX 3060.

The other option is for each thread to compute **one** $F^H d$ element from all samples. That requires swapping the loops, **loop interchange**, so that each outer iteration processes one voxel. Interchange needs a **perfectly nested** loop, with no statements between the two `for` statements, and the computation of `rMu` and `iMu` is in the way. It can be moved out with **loop fission** (loop splitting): the body of the outer loop is split into two loops, one for the statements before the inner loop and one for the inner loop.

<figure class="fig">

```c
// (A) before                               // (B) after loop fission
for (m = 0; m < M; m++) {                   for (m = 0; m < M; m++) {
    rMu[m] = rPhi[m]*rD[m] + iPhi[m]*iD[m];     rMu[m] = rPhi[m]*rD[m] + iPhi[m]*iD[m];
    iMu[m] = rPhi[m]*iD[m] - iPhi[m]*rD[m];     iMu[m] = rPhi[m]*iD[m] - iPhi[m]*rD[m];
    for (n = 0; n < N; n++) {               }
        expFhD = 2*PI*(kx[m]*x[n] + ...);   for (m = 0; m < M; m++) {
        cArg = cos(expFhD);                     for (n = 0; n < N; n++) {
        sArg = sin(expFhD);                         expFhD = 2*PI*(kx[m]*x[n] + ...);
        rFhD[n] += rMu[m]*cArg - iMu[m]*sArg;       cArg = cos(expFhD);
        iFhD[n] += iMu[m]*cArg + rMu[m]*sArg;       sArg = sin(expFhD);
    }                                               rFhD[n] += rMu[m]*cArg - iMu[m]*sArg;
}                                                   iFhD[n] += iMu[m]*cArg + rMu[m]*sArg;
                                                }
                                            }
```

<figcaption>Loop fission on the F<sup>H</sup>d computation (after Kirk &amp; Hwu, Fig. 8.6).</figcaption>
</figure>

Fission changes the execution order: originally both parts of iteration 0 run before iteration 1; after fission, the first part of all iterations runs before the second part of any. The result is the same, because the first part of an iteration does not depend on the second part of any earlier iteration. (Compilers that analyse cross-iteration dependences do this transformation.) Each loop now becomes a kernel; the two kernels run one after the other, which loses no parallelism since the second loop needs the results of the first.

<figure class="fig">

```c
__global__ void cmpMu(float* rPhi, iPhi, rD, iD, rMu, iMu) {
    int m = blockIdx.x * MU_THREADS_PER_BLOCK + threadIdx.x;
    rMu[m] = rPhi[m]*rD[m] + iPhi[m]*iD[m];
    iMu[m] = rPhi[m]*iD[m] - iPhi[m]*rD[m];
}
```

<figcaption>The <code>cmpMu</code> kernel (after Kirk &amp; Hwu, Fig. 8.7).</figcaption>
</figure>

In `cmpMu`, each thread does one iteration of the first loop: with 512 threads per block, the thread with `blockIdx.x` = 5 and `threadIdx.x` = 2 does iteration $5 \times 512 + 2 = 2562$. Each thread writes its own Mu element, so there are no conflicts.

The second kernel has three options:

1. **One thread per inner-loop iteration**: the most parallelism, but $N \times M$ threads, with $N$ in the millions and $M$ in the hundreds of thousands, far too many.
2. **One thread per outer-loop iteration** ($M$ threads): still plenty of parallelism, but the same conflicts as the first version, since every thread writes all voxels.

3. **One thread per voxel** ($N$ threads): interchange the loops and give each thread an iteration of the new outer loop. Interchange is allowed because all iterations of both loops are independent and can run in any order. A 128³ image gives $2{,}097{,}152$ threads, and even 512³ (134 million threads) fits in one launch. Each thread accumulates into its own `rFhD[n]` and `iFhD[n]`, so there are **no conflicts**: the best option.

<figure class="fig">

```c
// (A) before loop interchange              // (B) after loop interchange
for (m = 0; m < M; m++) {                   for (n = 0; n < N; n++) {
    for (n = 0; n < N; n++) {                   for (m = 0; m < M; m++) {
        expFhD = 2*PI*(kx[m]*x[n] +                 expFhD = 2*PI*(kx[m]*x[n] +
                 ky[m]*y[n] + kz[m]*z[n]);                   ky[m]*y[n] + kz[m]*z[n]);
        cArg = cos(expFhD);                         cArg = cos(expFhD);
        sArg = sin(expFhD);                         sArg = sin(expFhD);
        rFhD[n] += rMu[m]*cArg - iMu[m]*sArg;       rFhD[n] += rMu[m]*cArg - iMu[m]*sArg;
        iFhD[n] += iMu[m]*cArg + rMu[m]*sArg;       iFhD[n] += iMu[m]*cArg + rMu[m]*sArg;
    }                                           }
}                                           }
```

<figcaption>Loop interchange of the F<sup>H</sup>d computation (after Kirk &amp; Hwu, Fig. 8.9).</figcaption>
</figure>

<figure class="fig">

```c
__global__ void cmpFHd(float* rPhi, iPhi, phiMag,
                       kx, ky, kz, x, y, z, rMu, iMu, int M) {
    int n = blockIdx.x * FHd_THREADS_PER_BLOCK + threadIdx.x;
    for (m = 0; m < M; m++) {
        float expFhD = 2*PI*(kx[m]*x[n] + ky[m]*y[n] + kz[m]*z[n]);
        float cArg = cos(expFhD);
        float sArg = sin(expFhD);
        rFhD[n] += rMu[m]*cArg - iMu[m]*sArg;
        iFhD[n] += iMu[m]*cArg + rMu[m]*sArg;
    }
}
```

<figcaption>Third option of the F<sup>H</sup>d kernel: one thread per voxel (after Kirk &amp; Hwu, Fig. 8.10).</figcaption>
</figure>

This kernel is launched with `N/FHd_THREADS_PER_BLOCK` blocks of `FHd_THREADS_PER_BLOCK` threads, and thread `blockIdx.x*FHd_THREADS_PER_BLOCK + threadIdx.x` handles voxel `n`.

#### Step 2. Getting Around the Memory Bandwidth Limitation

The simple kernel is limited by memory bandwidth. Each inner iteration makes at least 14 memory accesses (`kx[m]`, `ky[m]`, `kz[m]`, `x[n]`, `y[n]`, `z[n]`, `rMu[m]` twice, `iMu[m]` twice, and a read and a write of each of `rFhD[n]` and `iFhD[n]`) for about 13 floating-point operations: a ratio of about 1.

**Registers.** `x[n]`, `y[n]` and `z[n]` are the same in all iterations of a thread, so they can be loaded into automatic variables (registers) before the loop. `rFhD[n]` and `iFhD[n]` are read and written in every iteration, so the loop can accumulate into two automatic variables and write them out after the loop. Declaring automatic **arrays** instead would not work: it would create private copies of whole arrays in each thread's local memory, while only one element of each is needed.

Five more registers per thread reduce the accesses per iteration from 14 to 7, raising the ratio from 13:14 to 13:7. Registers per block increase by $5 \times$ `FHd_THREADS_PER_BLOCK`, which here does not limit the number of blocks per SM, but must be watched.

**Constant memory.** The k-space samples `kx[m]`, `ky[m]`, `kz[m]` are different in each iteration, so registers cannot hold them, but the kernel never modifies them, and **all threads of a warp access the same element** at the same time, since the index `m` does not depend on `threadIdx`. This is the ideal pattern for the cached constant memory: each element brought into the constant cache is used by all 32 threads of the warp, so at least 31 of 32 accesses hit, and a value read from the cache is **broadcast** to all threads of the warp in one access. Constant memory is then almost as efficient as registers (a load instruction is still needed).

Constant memory holds only 64 KB, but the k-space data can be much larger. Since all threads march through the k-space arrays in the same order, the loop can be divided into sections, each processing a **chunk** that fits in constant memory. The host calls the kernel repeatedly, copying a new chunk into constant memory before each call.

<figure class="fig">

```c
__constant__ float kx_c[CHUNK_SIZE], ky_c[CHUNK_SIZE], kz_c[CHUNK_SIZE];
...
int main() {
    int i;
    for (i = 0; i < M/CHUNK_SIZE; i++) {
        cudaMemcpyToSymbol(kx_c, &kx[i*CHUNK_SIZE], 4*CHUNK_SIZE);
        cudaMemcpyToSymbol(ky_c, &ky[i*CHUNK_SIZE], 4*CHUNK_SIZE);
        cudaMemcpyToSymbol(kz_c, &kz[i*CHUNK_SIZE], 4*CHUNK_SIZE);
        ...
        cmpFHd<<<N/FHd_THREADS_PER_BLOCK, FHd_THREADS_PER_BLOCK>>>
            (rPhi, iPhi, phiMag, x, y, z, rMu + i*CHUNK_SIZE, iMu + i*CHUNK_SIZE, CHUNK_SIZE);
    }
    /* Call the kernel once more if M is not */
    /* a perfect multiple of CHUNK_SIZE      */
}
```

<figcaption>Chunking k-space data to fit into constant memory (after Kirk &amp; Hwu, Fig. 8.12). The book uses <code>cudaMemcpy()</code> with <code>cudaMemcpyHostToDevice</code>; a <code>__constant__</code> variable is written with <code>cudaMemcpyToSymbol()</code>.</figcaption>
</figure>

The kernel now reads `kx_c[m]`, `ky_c[m]` and `kz_c[m]` as global `__constant__` variables instead of through pointer parameters; reads through a generic pointer would not use the constant cache.

The remaining global accesses are the four to `rMu[m]` and `iMu[m]`, which the compiler reduces to two (one to each location, kept in registers for the second use), for a ratio of 13:2. Memory bandwidth is no longer the only limit.

**Data layout.** In practice this version gained less than expected, because the constant cache performed poorly. Each constant cache entry stores **several consecutive words**, which lowers the hardware cost, and the cache has few entries. With `kx`, `ky` and `kz` in three separate arrays, each iteration needs three entries, and since different warps can be at very different iterations, the active warps of an SM needed more entries than the cache had. The fix is to store the components of each sample in consecutive words, as an **array of structs**, so that all components used by an iteration fit in one cache entry.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/application_case_study_advanced/k_space_data_separate_arrays.svg" alt="k-space data in separate arrays" width="300px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/application_case_study_advanced/k_space_data_array_structs.svg" alt="k-space data as an array of structs" width="300px" style="margin:0" >}}
</div>
<figcaption>Effect of the k-space data layout on constant cache efficiency: each cache entry holds several consecutive words, so the components used in one iteration take one entry when stored as a struct and several when stored in separate arrays (after Kirk &amp; Hwu, Fig. 8.14).</figcaption>
</figure>

<figure class="fig">

```c
struct kdata {
    float x, y, z;
};
struct kdata* k;                    // host array of M samples
__constant__ struct kdata k_c[CHUNK_SIZE];
...
int main() {
    int i;
    for (i = 0; i < M/CHUNK_SIZE; i++) {
        cudaMemcpyToSymbol(k_c, &k[i*CHUNK_SIZE], 12*CHUNK_SIZE);
        cmpFHd<<<N/FHd_THREADS_PER_BLOCK, FHd_THREADS_PER_BLOCK>>>(..., rMu + i*CHUNK_SIZE, iMu + i*CHUNK_SIZE, CHUNK_SIZE);
    }
}
```

<figcaption>Adjusting the k-space data layout to improve cache efficiency (after Kirk &amp; Hwu, Fig. 8.15).</figcaption>
</figure>

Only one array now holds the k-space data, so one copy of $12 \times$ `CHUNK_SIZE` bytes transfers a chunk, and in the kernel `kx[m]` becomes `k_c[m].x`, and so on.

#### Step 3. Using Hardware Trigonometry Functions

CUDA offers hardware math functions with much higher throughput than the software versions, executed by the **special function units (SFUs)**. The calls to `sin` and `cos` become the intrinsics `__sinf()` and `__cosf()`, which the compiler translates into SFU instructions. Their error grows for arguments far outside $[-\pi, \pi]$ (the `-use_fast_math` option makes the same substitution throughout a program). They are in the most heavily executed loop, so the gain is large.

<figure class="fig">

```c
__global__ void cmpFHd(float* rPhi, iPhi, phiMag,
                       x, y, z, rMu, iMu, int M) {
    int n = blockIdx.x * FHd_THREADS_PER_BLOCK + threadIdx.x;
    float xn_r = x[n];  float yn_r = y[n];  float zn_r = z[n];
    float rFhDn_r = rFhD[n];  float iFhDn_r = iFhD[n];
    for (m = 0; m < M; m++) {
        float expFhD = 2*PI*(k_c[m].x*xn_r + k_c[m].y*yn_r + k_c[m].z*zn_r);
        float cArg = __cosf(expFhD);
        float sArg = __sinf(expFhD);
        rFhDn_r += rMu[m]*cArg - iMu[m]*sArg;
        iFhDn_r += iMu[m]*cArg + rMu[m]*sArg;
    }
    rFhD[n] = rFhDn_r;  iFhD[n] = iFhDn_r;
}
```

<figcaption>The final F<sup>H</sup>d kernel, with registers, constant memory, the array-of-structs layout and the hardware <code>__sinf()</code> and <code>__cosf()</code> functions (after Kirk &amp; Hwu, Figs. 8.16 and 8.17).</figcaption>
</figure>

The hardware functions are **less accurate** ([Arithmetic Accuracy and Rounding](#arithmetic-accuracy-and-rounding)), so the result must be validated. The test starts from a "perfect" image $I_0$, synthesizes the corresponding scanned k-space data, reconstructs an image $I$ from it, and compares the two with these metrics (for $m \times n$ images):

$$
\text{MSE} = \frac{1}{mn} \sum_i \sum_j \big(I(i,j) - I_0(i,j)\big)^2, \qquad
\text{PSNR} = 20 \log_{10} \frac{\max I_0(i,j)}{\sqrt{\text{MSE}}},
$$

$$
A_s = \sqrt{\frac{1}{mn} \sum_i \sum_j I_0(i,j)^2}, \qquad
\text{SNR} = 20 \log_{10} \frac{A_s}{\sqrt{\text{MSE}}}.
$$

(after Kirk &amp; Hwu, Fig. 8.18). The pass criteria depend on how the image will be used, and here were set with clinical experts; for images that physicians read, visual inspection is also needed.

#### Step 4. Experimental Performance Tuning

The kernel's configuration parameters must still be chosen:

- **Threads per block** (32, 64, 128, 256, 512, or non-powers of two): enough threads per block are needed to fill the SM's thread slots within its block limit, but more threads per block use more registers per block, which can reduce the blocks per SM.
- **k-space samples per grid**: a chunk must fit in the 64 KB of constant memory, 16K floats; with 3 floats per sample, up to 4K samples (a power of two for simple loop control). Larger chunks need fewer kernel launches.
- **Loop unrolling factor**: unrolling removes overhead instructions, but too much increases register use.

These parameters interact, since increasing one can use up the resources another needs, so they must be evaluated jointly by experiment, which can mean many versions of the source. For $F^H d$, an exhaustive search of the combinations gave about 20% better performance than a heuristic search; Ryoo et al. proposed screening out most inferior combinations with a Pareto-optimal curve [[4]](#ref-4).

## Application Case Study: Molecular Visualization and Analysis

The MRI case study showed how to choose the loop level to parallelize, how to use constant memory to multiply the bandwidth for read-only data, registers to reduce bandwidth use, and special function units for trigonometry. This case study uses an application on a **regular grid** to show techniques for global memory coalescing and higher computation throughput, through a series of versions of an electrostatic potential map kernel, each improving on the last. Its computation pattern is one of the best matches for GPU computing.

### Application Background

VMD (Visual Molecular Dynamics) is a widely used system for displaying, animating and analysing biomolecular systems, also used for other large datasets thanks to its extensibility. Most users run it on a desktop for interactive 3D visualization and analysis; computations too long for interactive use run in batch mode, for example to render movies. GPU acceleration aims to make slow batch jobs fast enough for interactive use, which greatly improves the productivity of research. Several parts of VMD have been accelerated with CUDA: electrostatic potential calculation, ion placement, molecular orbital calculation and display, and imaging of gas migration pathways in proteins.

This case study is the calculation of **electrostatic potential maps** on a grid, used for example to place ions into a protein structure before a molecular dynamics simulation, and to compute time-averaged potentials during a simulation.

**Direct Coulomb summation (DCS)** is a highly accurate method that suits GPUs well. The potential at each grid point is the sum of contributions from all atoms, and the contribution of atom $i$ to lattice point $j$ is the charge of the atom divided by its distance $r_{ij}$ to the point:

$$
V_j = \sum_i \frac{q_i}{r_{ij}}.
$$

The work is proportional to the number of atoms times the number of grid points, which is very large for realistic systems, so this calculation used to be a batch job.

{{< figure src="/images/computer-systems/gpu-computing/application_case_study_molecular/direct_coulomb_summation.svg" alt="Direct Coulomb summation" width="420px" class="fig" caption="Direct Coulomb summation: the contribution of atom[i] to the potential at lattice point j is atom[i].charge / r<sub>ij</sub>, and the potential at j is the sum over all atoms (after Kirk &amp; Hwu, Fig. 9.2)." >}}

### A Simple Kernel Implementation

The base C code processes one 2D slice of the 3D grid and is called for every slice. Its two outer loops iterate over the y and x grid indices, and its inner loop accumulates the contributions of all atoms to the grid point. Each atom occupies four consecutive elements of `atoms[]`: its x, y and z coordinates and its charge. The grid coordinates are computed on the fly from the indices and the uniform grid spacing, and the z coordinate, the same for the whole slice, is computed by the caller.

<figure class="fig">

```c
void cenergy(float *energygrid, dim3 grid, float gridspacing,
             float z, const float *atoms, int numatoms) {
    int i, j, n;
    int atomarrdim = numatoms * 4;
    for (j = 0; j < grid.y; j++) {
        float y = gridspacing * (float) j;
        for (i = 0; i < grid.x; i++) {
            float x = gridspacing * (float) i;
            float energy = 0.0f;
            for (n = 0; n < atomarrdim; n += 4) {   // calculate potential contribution of each atom
                float dx = x - atoms[n    ];
                float dy = y - atoms[n + 1];
                float dz = z - atoms[n + 2];
                energy += atoms[n + 3] / sqrtf(dx*dx + dy*dy + dz*dz);
            }
            energygrid[grid.x * j + i] = energy;
        }
    }
}
```

<figcaption>Base Coulomb potential calculation code for a 2D slice of the 3D grid (after Kirk &amp; Hwu, Fig. 9.3).</figcaption>
</figure>

Two lessons from the MRI case study apply at once:

1. The computation is massively parallel, and of the two ways to organize it, **one thread per grid point** is better than one thread per atom, since the latter would make every thread write to every grid point and need atomic operations. The thread grid is 2D, matching the slice. For each thread to execute one iteration of the two outer loops, they must be perfectly nested: the computation of `y` is moved into the x loop rather than split off by loop fission, which would need an array of `y` values and a second kernel that does very little work. This trades a little redundant computation for parallelism.
2. Every thread reads the charge and position of **every** atom, and these values never change, so the `atoms[]` array goes into **constant memory**, divided into 64 KB chunks as before.

{{< figure src="/images/computer-systems/gpu-computing/application_case_study_molecular/overview_dcs_kernel_design.svg" alt="Overview of the DCS kernel design" width="640px" class="fig" caption="Overview of the DCS kernel design: for each 2D slice of the potential map, the host copies the slice to global memory, then streams the atoms through constant memory chunk by chunk, launching the kernel once per chunk, and finally copies the slice back (after Kirk &amp; Hwu, Fig. 9.4)." >}}

Within each kernel launch, thread blocks compute tiles of the slice; in the simplest kernel, each thread computes one grid point, and in more sophisticated kernels, several.

<figure class="fig">

```c
    ...
    int atomid;
    float curenergy = energygrid[outaddr];     // start the global memory read early;
    float coorx = gridspacing * xindex;        // the kernel hides some of its own latency
    float coory = gridspacing * yindex;
    float energyval = 0.0f;
    for (atomid = 0; atomid < numatoms; atomid++) {
        float dx = coorx - atominfo[atomid].x;
        float dy = coory - atominfo[atomid].y;
        energyval += atominfo[atomid].w *
                     rsqrtf(dx*dx + dy*dy + atominfo[atomid].z);
    }
    energygrid[outaddr] = curenergy + energyval;   // only use of the global read is at the end
```

<figcaption>DCS kernel, version 1. <code>atominfo[]</code> is a <code>float4</code> array in constant memory; its <code>z</code> field holds the precomputed dz² for the slice and <code>w</code> the charge (after Kirk &amp; Hwu, Fig. 9.5).</figcaption>
</figure>

The outer loops are replaced by the execution configuration, and the body corresponds directly to the inner loop. One subtle point: the kernel computes the contribution of one chunk of atoms, so each grid point must be **read, updated and written back** by every launch. The kernel loads the old grid value at the start and uses it only at the end, which hides part of the global memory latency inside the thread and reduces the number of warps the scheduler needs.

Each thread does 9 floating-point operations per 4 memory accesses, which looks too low, but all four accesses are to `atominfo[]`, which is cached in each SM's constant cache and broadcast to all threads of a warp. As in the MRI case, this massive reuse raises the effective ratio of floating-point operations to global memory accesses far above 10, so global memory bandwidth is not the limit. (`rsqrtf()` computes $1/\sqrt{x}$ in one SFU operation.)

### Instruction Execution Efficiency

The constant cache removes the global memory bottleneck, but the kernel still executes **4 constant memory load instructions for every 9 floating-point operations**, and these use issue slots that could execute floating-point instructions. Two redundancies can be removed:

- With **thread coarsening**, the work of several threads is given to one, so that the atom data are loaded from constant memory once into registers and used for several grid points.
- All grid points of a row have the same y coordinate, so `dy` (and `dy*dy + dz*dz`) is the same for all of them, yet version 1 recomputes it in every thread.

{{< figure src="/images/computer-systems/gpu-computing/application_case_study_molecular/reusing_information_among_multiple_grid_points.svg" alt="Reusing information among multiple grid points" width="480px" class="fig" caption="Reusing information among the grid points of one thread: the atom is read once, and dy² + dz² is computed once for all the points of a row (after Kirk &amp; Hwu, Fig. 9.6)." >}}

In version 2, each thread computes **four** grid points of a row:

<figure class="fig">

```c
    ...
    for (atomid = 0; atomid < numatoms; atomid++) {
        float dy = coory - atominfo[atomid].y;
        float dysqpdzsq = (dy * dy) + atominfo[atomid].z;
        float x = atominfo[atomid].x;
        float dx1 = coorx1 - x;
        float dx2 = coorx2 - x;
        float dx3 = coorx3 - x;
        float dx4 = coorx4 - x;
        float charge = atominfo[atomid].w;
        energyvalx1 += charge * rsqrtf(dx1*dx1 + dysqpdzsq);
        energyvalx2 += charge * rsqrtf(dx2*dx2 + dysqpdzsq);
        energyvalx3 += charge * rsqrtf(dx3*dx3 + dysqpdzsq);
        energyvalx4 += charge * rsqrtf(dx4*dx4 + dysqpdzsq);
    }
```

<figcaption>DCS kernel, version 2: compared with version 1, memory loads drop 4×, and fewer operations are needed per evaluation, but more registers are used (after Kirk &amp; Hwu, Fig. 9.7).</figcaption>
</figure>

For each atom, `dy`, `dysqpdzsq`, the atom's `x` and its `charge` are computed or loaded once into registers and used for all four points. Per atom and four grid points, version 2 does 4 constant memory accesses, 5 subtractions, 9 additions and 9 multiplications, **27 operations**, against 16 accesses, 8 subtractions, 12 additions and 12 multiplications, **48 operations**, for four iterations of version 1. (These counts include the memory accesses and leave out the 4 `rsqrtf` calls, which both versions need.) The application-level throughput (atom evaluations per second) rose more than the FLOPS rate, because some floating-point operations were eliminated altogether. The cost is more registers per thread and so fewer threads per SM, a good trade here.

### Memory Coalescing

Profiling version 2 shows that its **writes are uncoalesced**, for two reasons.

1. **Each thread computes four adjacent grid points**, so in each statement that writes `energygrid[]`, adjacent threads access locations 4 elements apart, and the locations written by a warp are spread out with three elements between them. The fix is to assign **adjacent grid points to adjacent threads**: the first 16 consecutive points to the 16 threads in the x dimension of the block, the next 16 points to the same threads, and so on until each thread has its points (8 points per thread was found best).

2. **The layout of `energygrid[]`.** Each block covers $8 \times 16 = 128$ consecutive points of a row, so a row whose length is not a multiple of 128 would make the last block of each row write past its end, into the next row. The fix is to **pad** each row to a multiple of 128 elements (up to 127 extra elements, 508 bytes). The padding also starts every row at an aligned address, so that a warp's writes use whole 32-byte sectors.

{{< figure src="/images/computer-systems/gpu-computing/application_case_study_molecular/organizing_threads_memory_layout_coalesced_writes.svg" alt="Organizing threads and memory layout for coalesced writes" width="640px" class="fig" caption="Organizing threads and memory for coalesced writes: each thread block computes a tile of the slice, consecutive threads write consecutive points, and each thread's points are a half-warp (16) apart; the rows and the tile rows are padded so every row starts at an aligned address and no thread writes outside the slice (after Kirk &amp; Hwu, Fig. 9.8)." >}}

<figure class="fig">

```c
    ...
    float coory = gridspacing * yindex;
    float coorx = gridspacing * xindex;
    float gridspacing_coalesce = gridspacing * BLOCKSIZEX;    // points spaced for coalescing
    int atomid;
    for (atomid = 0; atomid < numatoms; atomid++) {
        float dy = coory - atominfo[atomid].y;
        float dyz2 = (dy * dy) + atominfo[atomid].z;          // reuse dy^2 + dz^2
        float dx1 = coorx - atominfo[atomid].x;
        float dx2 = dx1 + gridspacing_coalesce;
        ...
        float dx8 = dx7 + gridspacing_coalesce;
        energyvalx1 += atominfo[atomid].w * rsqrtf(dx1*dx1 + dyz2);
        ...
        energyvalx8 += atominfo[atomid].w * rsqrtf(dx8*dx8 + dyz2);
    }
    energygrid[outaddr               ] += energyvalx1;      // global memory operations only at the end
    ...
    energygrid[outaddr + 7*BLOCKSIZEX] += energyvalx8;
```

<figcaption>DCS kernel, version 3 (after Kirk &amp; Hwu, Fig. 9.9).</figcaption>
</figure>

The x coordinates of a thread's 8 points are `gridspacing_coalesce` apart, the grid spacing times `BLOCKSIZEX` (16), and the writes go to `outaddr`, `outaddr + BLOCKSIZEX`, …, `outaddr + 7*BLOCKSIZEX`. Making the x dimension of the block equal to the coalescing unit simplifies the indexing.

There is also a problem with the **last row of thread blocks**: the slice may not have enough rows to fill it, and those threads would write into the next slice of the 3D array. A test in the kernel would add instructions and control divergence; instead, the y dimension is **padded** to a multiple of the tile height, which adds up to 15 rows (with 16-row tiles).

<div class="example">

Padding can be costly for small grids. A 100 × 100 slice is padded to 128 × 112: 14,336 points instead of 10,000, a 43% overhead. Padding the whole 3D grid would turn 100 × 100 × 100 = 1,000,000 points into 128 × 112 × 112 = 1,605,632, a 60% overhead. This is one reason the energy grid is computed in 2D slices, with the host iterating over the slices. Such trade-offs appear often in simulations, differential equation solvers and video processing.

</div>

Version 3 also moves the read of `energygrid[]` from the start of the kernel to the end: the contributions are accumulated in the loop, then the old values are read, added to and written back. This exposes more of the global memory latency in each thread, but saves 8 registers; since the kernel already uses many registers for the atom data and distances, this relieves its main bottleneck, lets more blocks fit in each SM, and improves performance overall.

## Parallel Programming and Computational Thinking

The previous chapters were about practice: CUDA features, performance and numerical considerations, and case studies. This chapter generalizes them. Parallel programming is the process of **decomposing a domain problem** into well-defined, coordinated work units, each realized with efficient numerical methods and known algorithms. A programmer with strong computational thinking not only analyses but **transforms** the structure of the problem: deciding which parts are inherently serial, which suit high-performance parallel execution, and what it costs to move parts from the first group to the second. Then they must choose algorithms that balance parallelism, computational efficiency and memory bandwidth.

### Problem Decomposition

Finding parallelism is often simple in concept but hard in practice. The key is to decide the work done by each unit of parallel execution (a thread), called the **threading arrangement**, so that the problem's parallelism is used well. In the potential map, all atoms can be processed in parallel and all grid points computed in parallel, but there are two arrangements:

- **Atom-centric**: each thread computes the effect of one atom on all grid points. This is a **scatter** access pattern: each thread distributes its atom's effect over the grid. It is undesirable on GPUs, because many threads may write to the same grid point at once; the grid must be in memory writable by all of them, and **atomic operations** are needed to prevent race conditions and lost updates, which are much slower than register accesses.
- **Grid-centric**: each thread computes the effect of all atoms on one grid point. This is a **gather** pattern: each thread collects the effects of the inputs into its own point. It suits GPUs, because the threads accumulate in private registers, and many threads share the input atoms, which constant memory caching or shared memory can serve efficiently.

Both give the same parallelism and the same results, but very different performance on a given machine.

A real application consists of several modules. In molecular dynamics, for each atom the application computes vibrational, rotational and nonbonded forces, each by a different method, then updates the positions and velocities. The amount of work varies greatly: the nonbonded force involves interactions among many atoms and takes far more computation than the others. These modules tend to be separate passes over the force data, and for each, the programmer decides whether it is worth running on the GPU. For example, the vibrational and rotational forces may not have enough work, so the program launches a kernel for the nonbonded forces while computing the others on the host; the update module, also on the host, combines the forces and computes the new positions and velocities.

{{< figure src="/images/computer-systems/gpu-computing/parallel_programming_computational_thinking/major_tasks_molecular_dynamics_application.svg" alt="Major tasks of a molecular dynamics application" width="520px" class="fig" caption="Major tasks of a molecular dynamics application in each time step; the nonbonded force does most of the work (after Kirk &amp; Hwu, Fig. 10.1)." >}}

The share of the work done on the device decides the application-level speedup.

<div class="example">

If the nonbonded force takes 95% of the sequential time and is accelerated 100× on the GPU, while the rest stays on the host, the application speedup is

$$
\frac{1}{0.05 + 0.95/100} = \frac{1}{0.0595} = 17.
$$

The sequential 5% holds the speedup to 17, although the main computation is 100 times faster (and to at most $1/0.05 = 20$, however fast it becomes). This is Amdahl's law: the accumulated time of small activities not worth putting on the GPU can limit the speedup seen by users.

</div>

Two approaches reduce the effect of the sequential tasks:

- **Task-level parallelism.** Small activities that do not warrant massive fine-grained parallelism can still run in parallel with each other, for example on the cores of a multicore host, or as several small kernels running at the same time on the GPU in different streams ([Overlapping Data Transfer and Computation](#overlapping-data-transfer-and-computation)).
- **Hierarchical data parallelism.** An MPI implementation distributes large chunks of the spatial grid and their atoms to the nodes of a cluster. The host of each node computes the vibrational and rotational forces for its chunk, which gives these modules a speedup too, and each node uses its GPU for the nonbonded forces; the nodes exchange data for forces across chunk boundaries and atoms that move between chunks. MPI and CUDA complement each other for large datasets.

Amdahl's law assumes a fixed problem size. **Gustafson's law** looks at the opposite case, in which the problem grows with the machine: if a fraction $s$ of the time on a parallel machine with $N$ processors is sequential and $1 - s$ is parallel, the same run would take $s + (1 - s)N$ times as long on one processor, so the **scaled speedup** is

$$
S = s + (1 - s)\,N.
$$

<div class="example">

If the sequential part takes 5% of the run on a GPU-accelerated node, and the parallel part uses the equivalent of 100 processors, the scaled speedup is $0.05 + 0.95 \times 100 = 95$: larger datasets grow the parallel part while the sequential part stays roughly constant, so any sufficiently large problem can be parallelized effectively. This is why GPUs pay off on large datasets.

</div>

### Algorithm Selection

<div class="definition">

An **algorithm** is a step-by-step procedure in which each step is precisely stated and can be carried out by a computer. It must have three properties: **definiteness** (each step is precise, with no ambiguity), **effective computability** (each step can be carried out by a computer) and **finiteness** (it is guaranteed to terminate).

</div>

A problem usually has several algorithms: some need fewer steps, some allow more parallelism, some use less memory bandwidth, and often none is best in all three. Given a problem and a decomposition, the programmer chooses the best compromise for the hardware.

- In matrix multiplication, with each thread computing one output element, the straightforward algorithm ([Kernel Functions and Threading](#kernel-functions-and-threading)) uses all the parallelism but too much global memory bandwidth. **Tiling** ([A Strategy for Reducing Global Memory Traffic](#a-strategy-for-reducing-global-memory-traffic)) divides the dot products into phases, in which the threads of a tile synchronize, load the tile into shared memory together and use it before moving on. Each thread executes more statements and more indexing, but the kernel is much faster because it uses much less bandwidth. Tiling is one of the most important strategies for matrix applications.
- **Merging threads** ([Thread Granularity](#thread-granularity), [Instruction Execution Efficiency](#instruction-execution-efficiency)) gives higher instruction and memory access efficiency: in matrix multiplication, a merged thread loads each Md element once for several dot products, reducing address calculations, load instructions and bandwidth; in the DCS kernel, it also reduces the distance calculations.

#### Cutoff Binning

More aggressive strategies trade a little accuracy for much better efficiency. **Cutoff binning** is based on the observation that in many grid problems based on physical laws, the contributions of particles far from a grid point are small enough to be treated separately. (For the $1/r$ Coulomb potential they are not negligible in total, so production codes compute the short-range part with a cutoff and add the long-range part with a smooth method such as particle-mesh Ewald or multilevel summation.)

Direct summation (A below) is very parallel and gives excellent speedups for moderate grids, but does not scale to very large ones: the number of atoms grows with the volume of the system, so the computation grows with the **square** of the volume, which becomes too slow even for massively parallel devices. Since the contribution falls off with distance, each grid point really needs only the atoms within a fixed radius (B). An algorithm that sums only those atoms has computation **linear** in the volume.

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/gpu-computing/parallel_programming_computational_thinking/direct_summation.svg" alt="A. Direct summation" width="190px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/parallel_programming_computational_thinking/b_cutoff_summation.svg" alt="B. Cutoff summation" width="190px" style="margin:0" >}}
{{< figure src="/images/computer-systems/gpu-computing/parallel_programming_computational_thinking/c_cutoff_binning.svg" alt="C. Cutoff with binning" width="190px" style="margin:0" >}}
</div>
<figcaption>The cutoff summation algorithm: (A) direct summation, (B) summing only the charges within a cutoff radius of the grid point (the open circle), and (C) sorting the charges into bins so that the direct summation kernel can process the neighbourhood of bins around a grid point (after Kirk &amp; Hwu, Fig. 10.2).</figcaption>
</figure>

Sequential cutoff algorithms handle one atom at a time and iterate over the grid points within the radius of the atom, which is easy because the grid points are in an array indexed by their coordinates. This does not carry over to parallel execution, because it is the atom-centric **scatter** arrangement. A cutoff algorithm based on the grid-centric decomposition is needed, and there is a well-known way to adapt a direct summation kernel (Rodrigues et al.):

1. **Sort the atoms into bins** by their coordinates. Each bin corresponds to a box in grid space and contains all atoms in that box.
2. The **neighbourhood** of a grid point is the set of bins that contain all the atoms that can contribute to it (in practice several layers of bins around the point's own bin, C above).
3. Each thread iterates through the bins of its neighbourhood, found from its block and thread indices, and for each atom checks whether it is within the radius, since some atoms of the surrounding bins are not. This check causes some control divergence.

Each thread now examines far fewer atoms, which is the source of the gain. But different thread blocks now need different neighbourhoods, so the small constant memory is unlikely to hold the atoms for all active blocks. The atoms go into **global memory**, and the threads of a block collaboratively load the atoms of their common neighbourhood into **shared memory** and examine them from there.

Bins end up with **different numbers of atoms**, since atoms are distributed statistically: some bins are crowded and some empty. For coalescing, all bins should be the same size and aligned, but making every bin as large as the fullest one means filling many bins with dummy atoms of zero charge, which occupy memory, use transfer bandwidth and lengthen the execution of blocks whose bins have few real atoms. The usual solution sets the bin size at a reasonable level, much smaller than the largest possible count, and keeps an **overflow list**: an atom whose bin is full goes to the overflow list. After the kernel, the host runs a sequential cutoff algorithm on the overflow atoms and adds their contributions. If the overflow atoms are a small percentage, this costs little; and if each kernel computes a subvolume, the host can process the overflow atoms of one subvolume **while the device computes the next**, hiding most of the delay.

The lesson is that, given a decomposition, the programmer chooses among algorithms, some with different trade-offs at the same accuracy, others giving up some accuracy for much better scalability. Cutoff is perhaps the most popular of the latter, used also in ray tracing and collision detection in games.

## References

1. <span id="ref-1"></span>Kirk, David B., and Wen-mei W. Hwu. *Programming Massively Parallel Processors: A Hands-on Approach*. Morgan Kaufmann, 2010.

2. <span id="ref-2"></span>NVIDIA. *CUDA C++ Programming Guide*, release 12.6. [https://docs.nvidia.com/cuda/cuda-c-programming-guide/](https://docs.nvidia.com/cuda/cuda-c-programming-guide/).

3. <span id="ref-3"></span>NVIDIA. *NVIDIA Ampere GA102 GPU Architecture* (whitepaper), 2020. GA106 has the same SM design.

4. <span id="ref-4"></span>Ryoo, Shane, Christopher I. Rodrigues, Sara S. Baghsorkhi, Sam S. Stone, David B. Kirk, and Wen-mei W. Hwu. "Optimization Principles and Application Performance Evaluation of a Multithreaded GPU Using CUDA." *Proceedings of the 13th ACM SIGPLAN Symposium on Principles and Practice of Parallel Programming (PPoPP)*, 2008, pp. 73–82.

5. <span id="ref-5"></span>Schmidt, Tanner. *Accelerated Computing: Programming GPUs*. CSE 599I lecture slides 7–11 (stencil, prefix sum, histogram, sparse matrices, merge), University of Washington, Spring 2017. [https://tschmidt23.github.io/cse599i/](https://tschmidt23.github.io/cse599i/).

6. <span id="ref-6"></span>Micikevicius, Paulius. "3D Finite Difference Computation on GPUs Using CUDA." *Proceedings of the 2nd Workshop on General Purpose Processing on Graphics Processing Units (GPGPU-2)*, 2009.

7. <span id="ref-7"></span>CSE 262 lecture slides, Lecture 11, University of California San Diego, Winter 2015. [https://cseweb.ucsd.edu/classes/wi15/cse262-a/static/Lec11-slides.pdf](https://cseweb.ucsd.edu/classes/wi15/cse262-a/static/Lec11-slides.pdf).

8. <span id="ref-8"></span>*Histograms in CUDA*. CSCI 5451: Introduction to Parallel Computing, Lecture 25, University of Minnesota, Fall 2025. [https://jimtmooney.github.io/Courses/F25/slides/1203_Histogram.pdf](https://jimtmooney.github.io/Courses/F25/slides/1203_Histogram.pdf).

9. <span id="ref-9"></span>Hwu, Wen-mei W., David B. Kirk, and Izzat El Hajj. *Programming Massively Parallel Processors: A Hands-on Approach*, 4th ed. Morgan Kaufmann, 2022. Chapter 11 (Prefix Sum) lecture slides.

10. <span id="ref-10"></span>Merrill, Duane, and Michael Garland. *Single-pass Parallel Prefix Scan with Decoupled Look-back*. NVIDIA Technical Report NVR-2016-002, 2016. [https://research.nvidia.com/sites/default/files/publications/nvr-2016-002.pdf](https://research.nvidia.com/sites/default/files/publications/nvr-2016-002.pdf).

11. <span id="ref-11"></span>Bell, Nathan, and Michael Garland. *Efficient Sparse Matrix-Vector Multiplication on CUDA*. NVIDIA Technical Report NVR-2008-004, 2008. [https://www.nvidia.com/docs/io/66889/nvr-2008-004.pdf](https://www.nvidia.com/docs/io/66889/nvr-2008-004.pdf).

12. <span id="ref-12"></span>Satish, Nadathur, Mark Harris, and Michael Garland. "Designing Efficient Sorting Algorithms for Manycore GPUs." *Proceedings of the IEEE International Parallel and Distributed Processing Symposium (IPDPS)*, 2009.

13. <span id="ref-13"></span>Jia, Zhe, Marco Maggioni, Benjamin Staiger, and Daniele P. Scarpazza. *Dissecting the NVIDIA Volta GPU Architecture via Microbenchmarking*. Technical report, 2018. [https://arxiv.org/abs/1804.06826](https://arxiv.org/abs/1804.06826).

14. <span id="ref-14"></span>Harris, Mark, Shubhabrata Sengupta, and John D. Owens. "Parallel Prefix Sum (Scan) with CUDA." In *GPU Gems 3*, Chapter 39. Addison-Wesley, 2007. [https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch39.html](https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch39.html).
