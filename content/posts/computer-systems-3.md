---
author: ["Utkarsh Sharma"]
title: "Computer Systems III: Computer Architecture"
date: "2026-11-03T12:00:00"
description: "Lecture notes on computer architecture and organization."
summary: "Part III of the Computer Systems series: computer architecture (basic organization, instruction set architecture and MIPS32, performance and Amdahl's law, design of the control unit, the MIPS32 datapath, pipelining and pipeline hazards, instruction-level parallelism with dynamic scheduling and speculation, SRAM and DRAM, memory interfacing and interleaving, the memory hierarchy and cache memory, I/O organization with interrupts and DMA, buses and USB, multithreading, vector processors and SIMD extensions, the roofline model, multicore processors and cache coherence)."
tags: ["Computer Architecture"]
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
  .post-content.post-content figure.table.tight table th, .post-content.post-content figure.table.tight table td { padding: 6px 10px !important; }
  .post-content figure.table td.grp { vertical-align: middle; font-weight: 600; }
  .post-content.post-content figure.table table th, .post-content.post-content figure.table table td { padding: 6px 16px !important; }
  .post-content figure svg { max-width: 100%; height: auto; color: var(--primary); }
  .post-content figure svg .dim { opacity: .65; }
  .post-content .figrow { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; align-items: flex-start; }
  .post-content .code-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0; }
  .post-content .code-pair .highlight, .post-content .code-pair pre { margin: 0 !important; }
  @media (max-width: 640px) { .post-content .code-pair { grid-template-columns: minmax(0, 1fr); } }
</style>

These notes follow the NPTEL course *Computer Architecture and Organization* (IIT Kharagpur) [[1]](#ref-1), with definitions and figures from Hamacher et al. [[2]](#ref-2), Stallings [[3]](#ref-3) and Hennessy & Patterson [[4]](#ref-4).

## Basics of Computer Organization

### Architecture and Organization

<div class="definition">

*Computer organization* is the design of the components and functional blocks from which a computer is built. *Computer architecture* is how these components are integrated into a system that achieves a desired level of performance.

</div>

### Functional Units

All instructions and data are stored in memory. An instruction and the data it needs are brought into the processor and executed there, and input and output devices connect the computer to the outside world. This is the **von Neumann architecture**.

<figure class="fig">
<svg viewBox="0 0 600 256" width="600" role="img" aria-label="Functional units of a von Neumann computer">
  <defs><marker id="arr-fu" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="200" y="20" width="200" height="150" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="40.0" text-anchor="middle" font-size="12" fill="currentColor">Processor (CPU)</text>
  <rect x="220" y="55" width="160" height="45" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="220" y="55" width="160" height="45" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="300.0" y="81.7" text-anchor="middle" font-size="12" fill="currentColor">Control Unit</text>
  <rect x="220" y="112" width="160" height="45" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="220" y="112" width="160" height="45" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="300.0" y="138.7" text-anchor="middle" font-size="12" fill="currentColor">ALU + registers</text>
  <line x1="300" y1="100" x2="300" y2="112" stroke="currentColor" stroke-width="1.2"/>
  <rect x="200" y="200" width="200" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="200" width="200" height="44" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="300.0" y="226.2" text-anchor="middle" font-size="12" fill="currentColor">Memory (program + data)</text>
  <rect x="20" y="75" width="120" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="80.0" y="101.2" text-anchor="middle" font-size="12" fill="currentColor">Input</text>
  <rect x="460" y="75" width="120" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="101.2" text-anchor="middle" font-size="12" fill="currentColor">Output</text>
  <line x1="140" y1="97" x2="197" y2="97" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-fu)"/>
  <line x1="400" y1="97" x2="457" y2="97" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-fu)"/>
  <line x1="285" y1="172" x2="285" y2="197" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-fu)"/>
  <line x1="315" y1="197" x2="315" y2="172" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-fu)"/>
  <text x="330.0" y="190.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">instructions, data</text>
</svg>
<figcaption>Functional units of a computer.</figcaption>
</figure>

- **Processor (CPU)**: a control unit and an arithmetic logic unit (ALU).
  - The **ALU** contains registers and the circuits for arithmetic (add, subtract, multiply, divide) and logic (AND, OR, NOT, shift, compare). The operands are brought into registers, the operation is carried out, and the result is stored in a register or in memory.
  - The **control unit** decodes the instruction's **opcode** and generates the control signals in the required sequence. For $R1 \leftarrow R2 + R3$ it enables the outputs of $R2$ and $R3$, selects addition, and stores the adder output in $R1$.
- **Memory**: *primary (main) memory* holds the active program and data, and *secondary memory* holds all programs and data as files. The processor has direct access only to primary memory. The memory system is a hierarchy: L1, L2 and L3 caches, main memory, secondary memory.
  - **RAM**: the access time does not depend on the location. Used for caches and main memory.
  - **ROM**: fixed data that cannot be changed.
  - **Magnetic disk**: the access time depends on the location. Used as secondary memory.
  - **Flash memory**: faster than disk, and replacing it as secondary memory.

### Basic Operation

The following special-purpose registers are used:

- **Memory Address Register (MAR):** the address of the memory location to be accessed.
- **Memory Data Register (MDR):** the data to be written into memory, or the data read from memory.
- **Program Counter (PC):** the address of the next instruction. It is incremented when an instruction is fetched.
- **Instruction Register (IR):** the instruction fetched from memory, while it is decoded.

<figure class="fig">
<svg viewBox="0 0 580 166" width="580" role="img" aria-label="Processor-memory interface through MAR and MDR">
  <defs><marker id="arr-pm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="20" width="200" height="130" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="120.0" y="40.0" text-anchor="middle" font-size="12" fill="currentColor">Processor</text>
  <rect x="60" y="55" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="55" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="120.0" y="74.2" text-anchor="middle" font-size="12" fill="currentColor">MAR</text>
  <rect x="60" y="100" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="100" width="120" height="30" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="120.0" y="119.2" text-anchor="middle" font-size="12" fill="currentColor">MDR</text>
  <rect x="400" y="20" width="160" height="130" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="480.0" y="40.0" text-anchor="middle" font-size="12" fill="currentColor">Primary memory</text>
  <rect x="430" y="50" width="100" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="422.0" y="65.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="430" y="72" width="100" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="422.0" y="87.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="430" y="94" width="100" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="422.0" y="109.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="430" y="116" width="100" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="422.0" y="131.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">⋮</text>
  <line x1="180" y1="70" x2="397" y2="70" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-pm)"/>
  <text x="290.0" y="64.0" text-anchor="middle" font-size="11" fill="currentColor">address</text>
  <line x1="180" y1="112" x2="397" y2="112" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-pm)"/>
  <line x1="397" y1="120" x2="180" y2="120" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-pm)"/>
  <text x="290.0" y="106.0" text-anchor="middle" font-size="11" fill="currentColor">data</text>
  <line x1="220" y1="140" x2="397" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-pm)"/>
  <text x="290.0" y="134.0" text-anchor="middle" font-size="11" fill="currentColor">control: READ / WRITE</text>
</svg>
<figcaption>The processor accesses memory through MAR and MDR.</figcaption>
</figure>

- **Read:** load the address into MAR and issue READ. The data read is stored in MDR.
- **Write:** load the address into MAR and the data into MDR, then issue WRITE.

The steps carried out to execute an instruction are called **micro-operations**. Every instruction starts with the fetch:

$$\text{MAR} \leftarrow \text{PC}, \qquad \text{MDR} \leftarrow \text{Mem[MAR]}, \qquad \text{IR} \leftarrow \text{MDR}, \qquad \text{PC} \leftarrow \text{PC} + 4$$

and the control unit then decodes IR.

<div class="example">

`ADD R1, LOCA` ($R1 \leftarrow R1 + \text{Mem[LOCA]}$) is stored at address 1000, with $R1 = 50$, $\text{LOCA} = 5000$ and $\text{Mem[5000]} = 75$.

</div>

<figure class="table">
<figcaption>Micro-operations of <code>ADD R1, LOCA</code>.</figcaption>

| Step | Micro-operation | Result |
|:-:|:--|:--|
| 1 | $\text{MAR} \leftarrow \text{PC}$ | MAR = 1000 |
| 2 | $\text{MDR} \leftarrow \text{Mem[MAR]}$ | MDR = `ADD R1, LOCA` |
| 3 | $\text{IR} \leftarrow \text{MDR}$, $\text{PC} \leftarrow \text{PC} + 4$ | PC = 1004; decode |
| 4 | $\text{MAR} \leftarrow \text{IR[operand]}$ | MAR = 5000 |
| 5 | $\text{MDR} \leftarrow \text{Mem[MAR]}$ | MDR = 75 |
| 6 | $R1 \leftarrow R1 + \text{MDR}$ | R1 = 125 |

</figure>

For `ADD R1, R2` the fetch is the same, and after decoding there is only one step, $R1 \leftarrow R1 + R2$.

### Bus Architecture

A **bus** is a group of lines that connects several devices.

- With a **single bus**, only one data transfer is possible in a clock cycle.
- With **multiple buses**, several transfers can be done in the same cycle, so instructions execute faster. Several short buses also have smaller parasitic capacitance, and hence smaller delay, than one long bus.

At the system level the processor, memory and I/O devices may share a single bus, or I/O may be connected through an I/O processor on a second bus. Inside the processor, the registers and the ALU can also be connected by a single internal bus:

<figure class="fig">
<svg viewBox="0 0 530 468" width="530" role="img" aria-label="Single-bus organization of the processor datapath">
  <defs><marker id="arr-sb" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="300" y1="20" x2="300" y2="445" stroke="currentColor" stroke-width="3"/>
  <text x="308.0" y="12.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">internal processor bus</text>
  <rect x="180" y="30" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220.0" y="50.2" text-anchor="middle" font-size="12" fill="currentColor">PC</text>
  <line x1="260" y1="40" x2="298.5" y2="40" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <line x1="298.5" y1="52" x2="260" y2="52" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <rect x="180" y="80" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220.0" y="100.2" text-anchor="middle" font-size="12" fill="currentColor">MAR</text>
  <line x1="298.5" y1="96" x2="260" y2="96" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <rect x="180" y="130" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220.0" y="150.2" text-anchor="middle" font-size="12" fill="currentColor">MDR</text>
  <line x1="260" y1="140" x2="298.5" y2="140" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <line x1="298.5" y1="152" x2="260" y2="152" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <rect x="180" y="190" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220.0" y="210.2" text-anchor="middle" font-size="12" fill="currentColor">IR</text>
  <line x1="260" y1="200" x2="298.5" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <line x1="298.5" y1="212" x2="260" y2="212" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <rect x="180" y="300" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220.0" y="320.2" text-anchor="middle" font-size="12" fill="currentColor">Y</text>
  <line x1="298.5" y1="316" x2="260" y2="316" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <rect x="20" y="80" width="90" height="82" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="80" width="90" height="82" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="65.0" y="125.2" text-anchor="middle" font-size="12" fill="currentColor">Memory</text>
  <line x1="180" y1="96" x2="113" y2="96" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="146.0" y="91.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">address</text>
  <line x1="113" y1="142" x2="177" y2="142" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <line x1="177" y1="152" x2="113" y2="152" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="146.0" y="167.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">data</text>
  <rect x="40" y="240" width="170" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="40" y="240" width="170" height="50" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="125.0" y="260.0" text-anchor="middle" font-size="11" fill="currentColor">Instruction decoding</text>
  <text x="125.0" y="275.0" text-anchor="middle" font-size="11" fill="currentColor">and control unit</text>
  <line x1="200" y1="222" x2="200" y2="237" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="40.0" y="305.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">control signals to all units</text>
  <rect x="340" y="40" width="80" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="59.2" text-anchor="middle" font-size="12" fill="currentColor">R0</text>
  <line x1="301.5" y1="50" x2="340" y2="50" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <line x1="340" y1="60" x2="301.5" y2="60" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <rect x="340" y="80" width="80" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="99.2" text-anchor="middle" font-size="12" fill="currentColor">R1</text>
  <line x1="301.5" y1="90" x2="340" y2="90" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <line x1="340" y1="100" x2="301.5" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="380.0" y="140.0" text-anchor="middle" font-size="14" fill="currentColor">⋮</text>
  <rect x="340" y="160" width="80" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="179.2" text-anchor="middle" font-size="12" fill="currentColor">Rn−1</text>
  <line x1="301.5" y1="170" x2="340" y2="170" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <line x1="340" y1="180" x2="301.5" y2="180" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="430.0" y="115.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">general-purpose</text>
  <text x="430.0" y="129.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">registers</text>
  <polygon points="140,350 250,350 235,375 155,375" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="195.0" y="367.0" text-anchor="middle" font-size="11" fill="currentColor">MUX</text>
  <line x1="220" y1="332" x2="220" y2="350" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="122.0" y="344.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <polyline points="132,340 170,340 170,350" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sb)"/>
  <line x1="104" y1="364" x2="147" y2="364" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="100.0" y="368.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">select</text>
  <polygon points="170,395 220,395 230,407 240,395 290,395 265,440 195,440" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="230.0" y="426.0" text-anchor="middle" font-size="12" fill="currentColor">ALU</text>
  <line x1="195" y1="375" x2="195" y2="395" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <polyline points="298.5,383 265,383 265,395" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sb)"/>
  <line x1="120" y1="418" x2="181" y2="418" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
  <text x="116.0" y="414.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">function select,</text>
  <text x="116.0" y="427.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">carry-in</text>
  <rect x="340" y="400" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="420.2" text-anchor="middle" font-size="12" fill="currentColor">Z</text>
  <polyline points="230,440 230,456 380,456 380,432" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sb)"/>
  <line x1="340" y1="416" x2="301.5" y2="416" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-sb)"/>
</svg>
<figcaption>Single-bus organization of the processor (after the NPTEL course <a href="#ref-1">[1]</a> and Hamacher). Register Y holds one ALU operand and Z holds the result; the MUX (multiplexer) selects the constant 4 for $\text{PC} \leftarrow \text{PC} + 4$.</figcaption>
</figure>

### Memory Addressing

Memory is an array of locations, each with a unique address. A memory with $M$ locations of $N$ bits is an $M \times N$ memory (e.g. $1024 \times 8$), and $n$ address bits can address $2^n$ locations. Memory is usually **byte-addressable**: every byte has an address, and an instruction can access a half-word (2 B), a word (4 B) or a long word (8 B). The word size depends on the machine, typically 32 or 64 bits.

<div class="example">

(a) A computer has 64 MB of byte-addressable memory. How many address bits are needed? (b) A computer has 1 GB of memory with 32-bit words. How many bits are needed to address a word?

</div>

(a) $64\text{ MB} = 2^6 \times 2^{20} = 2^{26}$ B, so 26 bits. (b) $2^{30} / 4 = 2^{28}$ words, so 28 bits.

#### Byte Ordering

- **Little endian:** the least significant byte is stored at the lowest address (x86, including the Ryzen 7 5800H).
- **Big endian:** the most significant byte is stored at the lowest address (network byte order in TCP/IP).

<figure class="table">
<figcaption>The 32-bit number <code>01010101 00110011 00001111 11000011</code> stored from address 2000.</figcaption>

| Address | Big endian | Little endian |
|:-:|:-:|:-:|
| 2000 | 01010101 | 11000011 |
| 2001 | 00110011 | 00001111 |
| 2002 | 00001111 | 00110011 |
| 2003 | 11000011 | 01010101 |

</figure>

#### Load and Store

A **load** reads a memory location into a register (`LOAD R1, 2000`), and a **store** writes a register into memory (`STORE 2020, R3`). For example, $S = (A + B) - (C - D)$:

```text
LOAD  R1, A
LOAD  R2, B
ADD   R3, R1, R2    // R3 = A + B
LOAD  R1, C
LOAD  R2, D
SUB   R4, R1, R2    // R4 = C - D
SUB   R3, R3, R4    // R3 = R3 - R4
STORE S, R3
```

#### Machine, Assembly and High-Level Languages

- **Machine language** is executed directly by the hardware; instructions are binary codes.
- **Assembly language** is a symbolic version of machine language, with a one-to-one correspondence to it.
- **High-level languages** (C, C++, Java) are closer to human languages.

An **assembler** translates assembly language to machine code. A **compiler** translates a high-level language program, either directly to machine code or first to assembly language. A *cross-assembler* or *cross-compiler* runs on one machine and generates code for another, e.g. a compiler running on a PC that generates code for a phone.

### von Neumann and Harvard Architectures

<figure class="fig">
<svg viewBox="0 0 460 190" width="460" role="img" aria-label="von Neumann and Harvard architectures">
  <defs><marker id="arr-vh" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="20" width="110" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="20" width="110" height="44" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="75.0" y="46.2" text-anchor="middle" font-size="12" fill="currentColor">Processor</text>
  <rect x="20" y="110" width="110" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="110" width="110" height="44" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="75.0" y="135.8" text-anchor="middle" font-size="11" fill="currentColor">Program / data</text>
  <line x1="65" y1="64" x2="65" y2="107" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vh)"/>
  <line x1="85" y1="107" x2="85" y2="64" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vh)"/>
  <text x="75.0" y="180.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(a) von Neumann</text>
  <rect x="250" y="20" width="160" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="20" width="160" height="44" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="330.0" y="46.2" text-anchor="middle" font-size="12" fill="currentColor">Processor</text>
  <rect x="220" y="110" width="100" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="220" y="110" width="100" height="44" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="270.0" y="135.8" text-anchor="middle" font-size="11" fill="currentColor">Program</text>
  <rect x="340" y="110" width="100" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="110" width="100" height="44" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="390.0" y="135.8" text-anchor="middle" font-size="11" fill="currentColor">Data</text>
  <line x1="270" y1="107" x2="270" y2="64" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vh)"/>
  <line x1="380" y1="64" x2="380" y2="107" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vh)"/>
  <line x1="400" y1="107" x2="400" y2="64" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vh)"/>
  <text x="330.0" y="180.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(b) Harvard</text>
</svg>
<figcaption>(a) von Neumann: instructions and data in one memory. (b) Harvard: separate program and data memories.</figcaption>
</figure>

- **von Neumann:** instructions and data are stored in the same memory. It is flexible, easy to implement, and used in most general-purpose processors. The processor–memory bus is a bottleneck, since all instructions and data pass through it.
- **Harvard:** instructions are stored in a program memory and data in a data memory, so an instruction fetch and a data access can be done in parallel. Used in some microcontrollers, and in pipelines with separate instruction and data caches. The processor–memory bottleneck remains.

In a pipeline, instruction execution is divided into 5 stages: IF (instruction fetch), ID (decode), EX (ALU operation), MEM (memory access) and WB (write back). In clock cycle 4, instruction 4 is in IF while instruction 1 is in MEM. With a single memory one of them has to wait; with separate memories both proceed.

## Instruction Set Architecture

<div class="definition">

The *instruction set architecture (ISA)* is the interface between software and hardware. It consists of the programmer's view of the machine (registers, address and data buses) and the instruction set.

</div>

Many ISAs are used across generations of machines (x86 has been extended from 16 to 64 bits and still runs on the Ryzen 7 5800H). The design issues of an instruction set are:

- the number of explicit operands (0, 1, 2 or 3);
- the location of the operands (registers, accumulator, memory) and how they are specified (addressing modes);
- the operand sizes (byte, half-word, word, double word);
- the operations (ADD, SUB, MUL, AND, OR, CMP, MOVE, JMP, …).

### Types of ISA

<figure class="table">
<figcaption>Evolution of instruction sets (TOS: top of stack; NEXT: the element below it; ACC: accumulator).</figcaption>

| Type | Example | Operation |
|:--|:--|:--|
| Stack | `ADD` | TOS ← TOS + NEXT |
| Accumulator | `ADD X` | ACC ← ACC + Mem[X] |
| Memory–memory | `ADD A,B,C` | Mem[A] ← Mem[B] + Mem[C] |
| Register–memory | `ADD R1,X` | R1 ← R1 + Mem[X] |
| Load–store | `ADD R1,R2,R3` | R1 ← R2 + R3 |

</figure>

In a **load–store** architecture only LOAD and STORE instructions access memory, and all other instructions operate on registers. This is the basis of RISC (reduced instruction set computer; see CISC and RISC below).

<div class="example">

Write $Y = A/B - (A - C \times B)$ for each type of machine.

</div>

<div class="code-pair">

```text
; stack
PUSH A
PUSH B
DIV          ; A/B
PUSH A
PUSH C
PUSH B
MUL          ; C*B
SUB          ; A - C*B
SUB          ; A/B - (A - C*B)
POP  Y
```

```text
; accumulator
LOAD  C
MUL   B
STORE D      ; D = C*B
LOAD  A
SUB   D
STORE D      ; D = A - C*B
LOAD  A
DIV   B
SUB   D
STORE Y
```

</div>

<div class="code-pair">

```text
; memory-memory (3 operands)
DIV  D, A, B   ; D = A/B
MUL  E, C, B   ; E = C*B
SUB  E, A, E   ; E = A - E
SUB  Y, D, E
```

```text
; load-store
LOAD  R1, A
LOAD  R2, B
LOAD  R3, C
DIV   R4, R1, R2
MUL   R5, R3, R2
SUB   R5, R1, R5
SUB   R4, R4, R5
STORE Y, R4
```

</div>

Older architectures had many special-purpose registers (PC, stack pointer, index register, flags, accumulator); newer ones have many general-purpose registers (GPRs).

- It is easy for the compiler to assign variables to registers.
- Registers are much faster than memory.
- Fewer bits are needed to specify a register, so the instruction encoding is more compact.
- The drawback is that more registers must be saved and restored on procedure calls and interrupts.

### Instruction Format

An instruction consists of an **opcode**, which specifies the operation (data transfer, arithmetic and logic, control, I/O, machine control), and **operands**, which specify the sources and the destination (immediate data, a register or a memory address).

- *Implied*: `NOP`, `HALT`
- *1-address*: `ADD X`, `LOAD M`
- *2-address*: `ADD X, Y`
- *Register–memory*: `ADD R1, X`
- *Register–register*: `ADD R1, R2, R3`

Fixed-size instructions are easier to decode. With 32 registers a register is specified in 5 bits; for example, in a 32-bit format, `LOAD R11, 100(R2)` is encoded as a 6-bit opcode, two 5-bit register fields and a 16-bit immediate.

#### Expanding Opcodes

For a fixed instruction length there is a trade-off between the **number of opcodes** and the **addressing capability**: more opcode bits leave fewer bits for addresses. A refinement is the *variable-length* (*expanding*) *opcode*: there is a minimum opcode length, but for some opcodes further operations are specified using additional bits of the instruction. Since the instruction length is fixed, those instructions have fewer bits for addressing, so this is used for instructions that need fewer operands or less powerful addressing [[3]](#ref-3).

<div class="example">

Consider 12-bit instructions with a 3-bit opcode [[3]](#ref-3).

- Opcodes 0–5 are memory-reference instructions (an address plus page and indirect bits), so there are only six basic operations.
- Opcode 6 is I/O: 6 bits select one of 64 devices and 3 bits give the command.
- Opcode 7 is a register-reference (microinstruction) format: each remaining bit specifies an operation, such as clear accumulator, and the bits can be combined.

With this opcode extension, about 35 instructions fit in 12 bits.

</div>

##### How Many Instructions Can Be Encoded

Each opcode pattern not used by a longer-address format becomes a **prefix** for the next format, which takes over the bits of the address field it no longer needs. No opcode may be a prefix of another, so the instruction can still be decoded.

With $n$-bit instructions and $k$-bit address fields, a two-address instruction has $n - 2k$ opcode bits, i.e. $2^{n-2k}$ patterns. If $T_2$ of them are used, then

$$N_1^{\max} = \left(2^{n-2k} - T_2\right) 2^k, \qquad N_0^{\max} = \left(\left(2^{n-2k} - T_2\right) 2^k - T_1\right) 2^k$$

where $T_1$ is the number of one-address instructions actually used and $N_1^{\max}$, $N_0^{\max}$ are the most one- and zero-address instructions possible.

<div class="example">

16-bit instructions and 6-bit address fields, with 15 two-address and 60 one-address instructions. How many zero-address instructions are possible?

- Two-address: $16 - 12 = 4$ opcode bits, 16 patterns. 15 are used (`0000`–`1110`), so 1 pattern (`1111`) is left.
- One-address: `1111` plus 6 more bits gives $1 \times 2^6 = 64$ patterns. 60 are used, so 4 are left.
- Zero-address: each of those 4 patterns plus the last 6 bits gives $4 \times 2^6 = 256$ instructions.

</div>

<figure class="table">
<figcaption>The three formats in the example (bit counts out of 16).</figcaption>

| Format | Opcode | Addresses |
|:--|:--|:--|
| two-address | 4 bits: `0000`–`1110` | $A_1$ (6), $A_2$ (6) |
| one-address | 10 bits: `1111 000000`–`1111 111011` | $A$ (6) |
| zero-address | 16 bits: `1111 111100 xxxxxx`–`1111 111111 xxxxxx` | none |

</figure>

### Addressing Modes

<div class="definition">

An *addressing mode* specifies how the operand of an instruction is located. The address from which the operand is finally read is the *effective address (EA)*.

</div>

CISC (complex instruction set computer) ISAs support many addressing modes; load–store ISAs support very few.

<figure class="fig">
<svg viewBox="0 0 640 456" width="640" role="img" aria-label="How the operand is located in common addressing modes">
  <defs><marker id="arr-am" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20.0" y="30.0" text-anchor="start" font-size="12" fill="currentColor">Immediate</text>
  <text x="330.0" y="30.0" text-anchor="start" font-size="12" fill="currentColor">Direct</text>
  <text x="20.0" y="175.0" text-anchor="start" font-size="12" fill="currentColor">Indirect</text>
  <text x="330.0" y="175.0" text-anchor="start" font-size="12" fill="currentColor">Register indirect</text>
  <text x="20.0" y="320.0" text-anchor="start" font-size="12" fill="currentColor">Indexed / base</text>
  <text x="330.0" y="320.0" text-anchor="start" font-size="12" fill="currentColor">PC-relative</text>
  <rect x="20" y="40" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="45.0" y="56.5" text-anchor="middle" font-size="10" fill="currentColor">opcode</text>
  <rect x="70" y="40" width="90" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="115.0" y="56.5" text-anchor="middle" font-size="10" fill="currentColor">operand</text>
  <text x="175.0" y="90.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">operand is in the instruction</text>
  <rect x="330" y="40" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="355.0" y="56.5" text-anchor="middle" font-size="10" fill="currentColor">opcode</text>
  <rect x="380" y="40" width="80" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="420.0" y="56.5" text-anchor="middle" font-size="10" fill="currentColor">address A</text>
  <rect x="510" y="20" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="510" y="42" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550.0" y="57.0" text-anchor="middle" font-size="10" fill="#ef4444">operand</text>
  <rect x="510" y="64" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550.0" y="100.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">memory</text>
  <line x1="460" y1="53" x2="507" y2="53" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <rect x="20" y="185" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="45.0" y="201.5" text-anchor="middle" font-size="10" fill="currentColor">opcode</text>
  <rect x="70" y="185" width="80" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="110.0" y="201.5" text-anchor="middle" font-size="10" fill="currentColor">address A</text>
  <rect x="200" y="187" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="202.0" text-anchor="middle" font-size="10" fill="currentColor">pointer</text>
  <rect x="200" y="209" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="231" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="246.0" text-anchor="middle" font-size="10" fill="#ef4444">operand</text>
  <text x="240.0" y="267.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">memory</text>
  <line x1="150" y1="198" x2="197" y2="198" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <polyline points="280,198 295,198 295,242 283,242" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-am)"/>
  <rect x="330" y="185" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="355.0" y="201.5" text-anchor="middle" font-size="10" fill="currentColor">opcode</text>
  <rect x="380" y="185" width="80" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="420.0" y="201.5" text-anchor="middle" font-size="10" fill="currentColor">Ri</text>
  <rect x="350" y="235" width="80" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="350" y="235" width="80" height="26" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="390.0" y="251.5" text-anchor="middle" font-size="10" fill="currentColor">Ri: address</text>
  <line x1="420" y1="211" x2="420" y2="232" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <rect x="510" y="215" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="510" y="237" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550.0" y="252.0" text-anchor="middle" font-size="10" fill="#ef4444">operand</text>
  <rect x="510" y="259" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550.0" y="295.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">memory</text>
  <line x1="430" y1="248" x2="507" y2="248" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <rect x="20" y="330" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="45.0" y="346.5" text-anchor="middle" font-size="10" fill="currentColor">opcode</text>
  <rect x="70" y="330" width="90" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="115.0" y="346.5" text-anchor="middle" font-size="10" fill="currentColor">Ri | offset</text>
  <rect x="30" y="382" width="60" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="382" width="60" height="24" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="60.0" y="397.5" text-anchor="middle" font-size="10" fill="currentColor">Ri</text>
  <circle cx="140" cy="394" r="11" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="399.0" text-anchor="middle" font-size="14" fill="currentColor">+</text>
  <line x1="90" y1="394" x2="127" y2="394" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <line x1="140" y1="356" x2="140" y2="381" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <rect x="200" y="361" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="383" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="398.0" text-anchor="middle" font-size="10" fill="#ef4444">operand</text>
  <rect x="200" y="405" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="441.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">memory</text>
  <line x1="151" y1="394" x2="197" y2="394" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <rect x="330" y="330" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="355.0" y="346.5" text-anchor="middle" font-size="10" fill="currentColor">opcode</text>
  <rect x="380" y="330" width="80" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="420.0" y="346.5" text-anchor="middle" font-size="10" fill="currentColor">offset</text>
  <rect x="340" y="382" width="60" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="382" width="60" height="24" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="370.0" y="397.5" text-anchor="middle" font-size="10" fill="currentColor">PC</text>
  <circle cx="450" cy="394" r="11" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="450.0" y="399.0" text-anchor="middle" font-size="14" fill="currentColor">+</text>
  <line x1="400" y1="394" x2="437" y2="394" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <line x1="450" y1="356" x2="450" y2="381" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
  <rect x="510" y="361" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="510" y="383" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550.0" y="398.0" text-anchor="middle" font-size="10" fill="#ef4444">operand</text>
  <rect x="510" y="405" width="80" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550.0" y="441.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">memory</text>
  <line x1="461" y1="394" x2="507" y2="394" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-am)"/>
</svg>
<figcaption>Common addressing modes, with the number of memory accesses needed to get the operand.</figcaption>
</figure>

<figure class="table">
<figcaption>Common addressing modes.</figcaption>

| Mode | Example | Operand | Accesses |
|:--|:--|:--|:-:|
| Immediate | `ADDI R1, R2, 42` | in the instruction | 0 |
| Register | `ADD R1, R2, R3` | in register R2 | 0 |
| Direct (absolute) | `ADD R1, 20A6H` | Mem[20A6] | 1 |
| Indirect | `ADD R1, (20A6H)` | Mem[Mem[20A6]] | 2 |
| Register indirect | `ADD R1, (R5)` | Mem[R5] | 1 |
| Indexed | `LOAD R1, 1050(R3)` | Mem[1050 + R3] | 1 |
| PC-relative | `BEQ …, offset` | target = PC + offset | — |
| Autoincrement | `ADD R1, (R2)+` | Mem[R2], then R2 += size | 1 |
| Autodecrement | `ADD R1, −(R2)` | R2 −= size, then Mem[R2] | 1 |

</figure>

- **Immediate:** no memory access is needed, but the range is limited by the number of bits of the constant.
- **Direct:** one memory access, but the address space is limited by the size of the address field.
- **Indirect:** two memory accesses, but a large address space.
- **Register:** few bits are needed and there is no memory access.
- **Register indirect:** a large address space, with one memory access fewer than indirect addressing.
- **Indexed:** the offset is the starting address of an array and the index register selects the element.
- **PC-relative:** the offset is added to the *updated* PC, i.e. the address of the next instruction [[2]](#ref-2). With a 12-bit offset the range is $-2048$ to $+2047$.
- **Stack:** the operand is on top of the stack (`PUSH X`, `POP X`, `ADD`). The stack pointer (SP) is updated by `PUSH`, `POP`, `CALL` and `RET`.
- **Base:** all addresses are added to a base (segment) register, so code and data can be moved in memory.
- **Autoincrement and autodecrement:** the register holding the address is incremented after the access, or decremented before it (like `a++` and `--a` in C) [[2]](#ref-2).

### CISC and RISC

**Complex Instruction Set Computer (CISC):**

- complex instruction set with many addressing modes (R–R, R–M, M–M, indexed, indirect, …);
- special-purpose registers and flags (sign, zero, carry, overflow);
- variable-length instructions and complex encoding;
- easy mapping of high-level language statements to machine instructions;
- complex instruction decoding and control unit, and a complex pipeline implementation.

Example: x86, including the Ryzen 7 5800H. CISC machines have had modes such as memory indirect (`ADD R1, @(R4)`: $R1 \leftarrow R1 + \text{Mem[Mem[R4]]}$) and scaled (`ADD R1, 50(R2)[R3]`: $R1 \leftarrow R1 + \text{Mem}[50 + R2 + R3 \times d]$).

**Reduced Instruction Set Computer (RISC)**, or load–store architecture:

- simple architecture for efficient pipelining;
- simple instruction set with very few addressing modes;
- many general-purpose registers and very few special-purpose ones;
- uniform instruction length and encoding, so decoding is easy;
- compiler-assisted scheduling of the pipeline.

Examples: MIPS (used in these notes), ARM (most phones).

A 1991 comparison of a CISC and a RISC machine found that the RISC machine executed about twice as many instructions, but the CPI (average cycles per instruction) of the CISC machine was about six times larger. So the RISC machine was about three times faster, and needed much less hardware. x86 remains CISC because of backward compatibility: the user sees a CISC instruction set, the hardware translates each instruction into RISC-like instructions, and these are executed in a pipeline.

### MIPS32

MIPS32 is a RISC ISA. Its programmer-visible registers are:

- 32 general-purpose 32-bit registers $R0$–$R31$.
  - $R0$ is hard-wired to 0. It can be the destination of an instruction whose result is discarded, or a source of zero.
  - $R31$ stores the return address on a function call (`JAL`, `BLTZAL`, `BGEZAL`).
- A 32-bit PC, changed only by branch and jump instructions.
- HI and LO, which hold the 64-bit product of a multiply (HI the upper 32 bits, LO the lower), and the remainder (HI) and quotient (LO) of a divide.

There is no separate stack pointer, index register or flag register. Any GPR can be used as a stack pointer or index register, and conditions are kept in registers instead of flags, which avoids problems in a pipeline.

<figure class="table">
<figcaption>MIPS32 register conventions.</figcaption>

| Name | Number | Use |
|:--|:--|:--|
| `$zero` | R0 | constant 0 |
| `$at` | R1 | reserved for the assembler (pseudo-instructions) |
| `$v0`–`$v1` | R2–R3 | function results, expression evaluation |
| `$a0`–`$a3` | R4–R7 | first four function arguments |
| `$t0`–`$t9` | R8–R15, R24–R25 | temporaries, not preserved across calls |
| `$s0`–`$s7` | R16–R23 | saved temporaries, preserved across calls |
| `$k0`–`$k1` | R26–R27 | reserved for the OS kernel |
| `$gp` | R28 | global pointer |
| `$sp` | R29 | stack pointer |
| `$fp` | R30 | frame pointer |
| `$ra` | R31 | return address |

</figure>

Words must be **aligned**: the address of a word is a multiple of 4 (the last two bits are 00), so a word can be fetched in one cycle. A misaligned word may need two cycles.

#### Instruction Classes

- **Load and store:** memory is accessed only through these. `LB`, `LH`, `LW` load a byte, half-word or word (sign-extended); `LBU`, `LHU` load without sign extension; `SB`, `SH`, `SW` store. `LWL`, `LWR`, `SWL`, `SWR` access unaligned words, and `LL`, `SC` (load linked, store conditional) do an atomic read–modify–write.
- **Arithmetic and logic**, all on registers:
  - with a 16-bit immediate: `ADDI`, `ADDIU`, `ANDI`, `ORI`, `XORI`, `SLTI`, `LUI`;
  - with three registers: `ADD`, `ADDU`, `SUB`, `SUBU`, `AND`, `OR`, `NOR`, `XOR`, `SLT`, `SLTU`;
  - shifts: `SLL`, `SRL`, `SRA` (and variable versions), `ROTR`.
- **Multiply and divide:** `MULT`, `MULTU`, `DIV`, `DIVU` write HI and LO, and `MFHI`, `MFLO` read them. `MUL` writes the low 32 bits of the product to a GPR.
- **Jump and branch:**
  - `BEQ` and `BNE` compare two registers; `BGEZ`, `BGTZ`, `BLEZ`, `BLTZ` compare with zero. These are PC-relative, with a 16-bit offset.
  - `J` and `JAL` jump within a 256 MB region; `JR` and `JALR` jump to the address in a register.
- **Miscellaneous:** `SYSCALL`, `BREAK`, traps (`TEQ`, `TGE`, …), conditional moves (`MOVZ`, `MOVN`), `PREF`, `NOP`. Coprocessor instructions are for CP0 (virtual memory and exceptions) and CP1 (floating point).

#### Instruction Encoding

All MIPS32 instructions are 32 bits long, in one of three formats. Fields such as `rs` and `rt` are in the same position in every format, which keeps decoding simple (see [MIPS32 Implementation](#mips32-implementation)).

<figure class="fig">
<svg viewBox="0 0 620 210" width="620" role="img" aria-label="MIPS32 R-type, I-type and J-type instruction formats">
  <defs><marker id="arr-mf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="60.0" y="50.0" text-anchor="end" font-size="12" fill="currentColor">R-type</text>
  <rect x="70.0" y="30" width="101.25" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="70.0" y="30" width="101.25" height="30" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="120.6" y="48.9" text-anchor="middle" font-size="11" fill="currentColor">opcode</text>
  <text x="72.0" y="26.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">31</text>
  <rect x="171.25" y="30" width="84.375" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="213.4" y="48.9" text-anchor="middle" font-size="11" fill="currentColor">rs</text>
  <text x="173.2" y="26.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">25</text>
  <rect x="255.625" y="30" width="84.375" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="297.8" y="48.9" text-anchor="middle" font-size="11" fill="currentColor">rt</text>
  <text x="257.6" y="26.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">20</text>
  <rect x="340.0" y="30" width="84.375" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="382.2" y="48.9" text-anchor="middle" font-size="11" fill="currentColor">rd</text>
  <text x="342.0" y="26.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">15</text>
  <rect x="424.375" y="30" width="84.375" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="466.6" y="48.9" text-anchor="middle" font-size="11" fill="currentColor">shamt</text>
  <text x="426.4" y="26.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">10</text>
  <rect x="508.75" y="30" width="101.25" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="559.4" y="48.9" text-anchor="middle" font-size="11" fill="currentColor">funct</text>
  <text x="510.8" y="26.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">5</text>
  <text x="608.0" y="26.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="60.0" y="110.0" text-anchor="end" font-size="12" fill="currentColor">I-type</text>
  <rect x="70.0" y="90" width="101.25" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="70.0" y="90" width="101.25" height="30" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="120.6" y="108.8" text-anchor="middle" font-size="11" fill="currentColor">opcode</text>
  <text x="72.0" y="86.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">31</text>
  <rect x="171.25" y="90" width="84.375" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="213.4" y="108.8" text-anchor="middle" font-size="11" fill="currentColor">rs</text>
  <text x="173.2" y="86.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">25</text>
  <rect x="255.625" y="90" width="84.375" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="297.8" y="108.8" text-anchor="middle" font-size="11" fill="currentColor">rt</text>
  <text x="257.6" y="86.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">20</text>
  <rect x="340.0" y="90" width="270.0" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="475.0" y="108.8" text-anchor="middle" font-size="11" fill="currentColor">16-bit immediate</text>
  <text x="342.0" y="86.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">15</text>
  <text x="608.0" y="86.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="60.0" y="170.0" text-anchor="end" font-size="12" fill="currentColor">J-type</text>
  <rect x="70.0" y="150" width="101.25" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="70.0" y="150" width="101.25" height="30" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="120.6" y="168.8" text-anchor="middle" font-size="11" fill="currentColor">opcode</text>
  <text x="72.0" y="146.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">31</text>
  <rect x="171.25" y="150" width="438.75" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="390.6" y="168.8" text-anchor="middle" font-size="11" fill="currentColor">26-bit jump address</text>
  <text x="173.2" y="146.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">25</text>
  <text x="608.0" y="146.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">0</text>
</svg>
<figcaption>MIPS32 instruction formats.</figcaption>
</figure>

- **R-type:** two source registers `rs`, `rt` and a destination `rd`; `shamt` is the shift amount and `funct` selects the ALU operation. For `add $t1, $s1, $s2` (`$t1` = R9, `$s1` = R17, `$s2` = R18; opcode 0, funct 100000) the encoding is `000000 10001 10010 01001 00000 100000`.
- **I-type:** a source `rs`, a destination `rt` and a 16-bit immediate. Used for loads, stores, ALU-immediate instructions and branches. For `lw $t1, 48($s1)` (opcode 100011) the encoding is `100011 10001 01001 0000000000110000`.
- **J-type:** a 26-bit address, shifted left by 2 to give 28 bits.

MIPS32 addressing modes:

- register: `add $s1, $s2, $s3`
- immediate: `addi $s1, $s2, 200`
- base (displacement): `lw $s1, 150($s2)`
- PC-relative: `beq $s1, $s2, Label`, the 16-bit offset is added to PC
- pseudo-direct: `j Label`, the 26-bit field is shifted left by 2 and combined with the upper bits of PC

#### Programming Examples

```text
# A[10] = X - A[12]        ($s3 = &A[0], $s2 = X; 4 bytes per element)
lw   $t0, 48($s3)          # $t0 = A[12]
sub  $t0, $s2, $t0
sw   $t0, 40($s3)          # A[10] = $t0

# if (x < y) z = x - y; else z = x + y;     ($s0 = x, $s1 = y, $s3 = z)
      slt  $t0, $s0, $s1    # $t0 = 1 if x < y
      beq  $t0, $zero, Lab1
      sub  $s3, $s0, $s1
      j    Lab2
Lab1: add  $s3, $s0, $s1
Lab2:
```

MIPS has only `beq` and `bne` for comparing two registers, so `<` is implemented with `slt` followed by a branch. The assembler provides **pseudo-instructions**, which it translates into MIPS32 instructions using `$at`:

<figure class="table">
<figcaption>Some MIPS pseudo-instructions.</figcaption>

| Pseudo-instruction | Translates to |
|:--|:--|
| `blt $1, $2, L` | `slt $at, $1, $2` ; `bne $at, $zero, L` |
| `bgt $1, $2, L` | `slt $at, $2, $1` ; `bne $at, $zero, L` |
| `move $1, $2` | `add $1, $2, $zero` |
| `li $1, 0x23ABCD` | `lui $1, 0x0023` ; `ori $1, $1, 0xABCD` |

</figure>

About 90% of constants fit in 16 bits and need one instruction. A 32-bit constant needs two: `lui` loads the upper 16 bits (the lower 16 become 0), and `ori` inserts the lower 16 bits. For example, `0xAAAA3333` is loaded with `lui $s1, 0xAAAA` and `ori $s1, $s1, 0x3333`.

A function is called with `jal Label`, which jumps and stores the return address in `$ra`, and returns with `jr $ra`.

## Performance Evaluation

### Measuring CPU Performance

A processor runs with a clock of rate $f$, and the clock cycle time is $C = 1/f$. A machine instruction consists of micro-operations that take one cycle each, so an instruction takes one or more cycles. For a program running on a machine:

- $IC$: the instruction count (number of instructions executed);
- $CPI$: the average number of cycles per instruction;
- $C$: the clock cycle time.

$$\text{Execution time } XT = IC \times CPI \times C = \frac{IC \times CPI}{f}$$

Performance is the reciprocal of the execution time, so the speedup of machine $A$ over machine $B$ is

$$\text{Speedup} = \frac{\text{Perf}_A}{\text{Perf}_B} = \frac{XT_B}{XT_A}$$

<figure class="table">
<figcaption>Factors affecting IC, CPI and C.</figcaption>

| | $IC$ | $CPI$ | $C$ |
|:--|:-:|:-:|:-:|
| Program | ✓ | ✓ | |
| Compiler | ✓ | ✓ | |
| ISA | ✓ | ✓ | |
| CPU organization | | ✓ | ✓ |
| Hardware technology | | | ✓ |

</figure>

It is difficult to change one factor without affecting the others. RISC increases $IC$ but decreases $CPI$ and $C$; CISC decreases $IC$ but increases $CPI$ and $C$. Experimentally, RISC gives better performance.

<div class="example">

Machine A runs a program with CPI 2.3. Machine B, with the same ISA and a better compiler, runs it with 20% fewer instructions and CPI 1.7 at 1.2 GHz. What clock rate must A have for the same performance?

</div>

$$IC_A \times 2.3 \times C_A = 0.8\,IC_A \times 1.7 \times \frac{1}{1.2 \times 10^9} \quad\Rightarrow\quad C_A = 0.493 \text{ ns}, \quad f_A = 2.03 \text{ GHz}$$

#### CPI from Instruction Classes

If there are $n$ classes of instructions, $IC_i$ instructions of class $i$ each take $CPI_i$ cycles, and $F_i = IC_i / IC$ is the frequency of class $i$, then

$$\text{CPU cycles} = \sum_{i=1}^{n} IC_i \times CPI_i, \qquad CPI = \frac{\sum_i IC_i \times CPI_i}{IC} = \sum_{i=1}^{n} F_i \times CPI_i$$

<div class="example">

Instruction types A, B and C have CPI 1.3, 2.2 and 2.0 and frequencies 60%, 10% and 30%. Which is better: reducing the CPI of A to 1.1, or that of B to 1.6?

</div>

- (a) $0.6 \times 1.1 + 0.1 \times 2.2 + 0.3 \times 2.0 = 1.48$.
- (b) $0.6 \times 1.3 + 0.1 \times 1.6 + 0.3 \times 2.0 = 1.54$.

So option (a) is better.

### MIPS and MFLOPS

$$\text{MIPS} = \frac{IC}{XT \times 10^6} = \frac{\text{clock rate (MHz)}}{CPI}$$

Problems with MIPS (millions of instructions per second):

- it depends on the instruction set, so it cannot compare machines with different ISAs;
- it varies between programs on the same machine;
- a higher MIPS rating does not always mean better performance. With a floating-point coprocessor, a program runs faster but executes fewer, more complex instructions, so the MIPS rating is lower; with software floating point it is slower but has a higher MIPS rating.

The MIPS rating is valid only when the same program, ISA and compiler are used, i.e. the machine code is identical.

MFLOPS (millions of floating-point operations per second) is suited to programs with many floating-point computations. But different machines implement different floating-point operations, these take different times (division is much slower than addition), and a program with no floating-point operations, such as a compiler, has an MFLOPS rating of 0.

<div class="example">

A 1 GHz processor has instruction classes A, B, C with CPI 1, 2, 3. Two compilers produce (7, 2, 1) and (12, 1, 1) million instructions of each class. Find the MIPS rating and the CPU time for each.

</div>

- Compiler 1: $CPI = (7 + 4 + 3)/10 = 1.40$, MIPS $= 1000/1.40 = 714.3$, time $= 10 \times 10^6 \times 1.40 / 10^9 = 0.014$ s.
- Compiler 2: $CPI = (12 + 2 + 3)/14 = 1.21$, MIPS $= 1000/1.214 = 823.5$, time $= 14 \times 10^6 \times 1.21 / 10^9 = 0.017$ s.

The MIPS rating says compiler 2 is faster, but its program takes longer.

### Benchmarks

A **benchmark** is a set of standard programs used to compare the performance of machines. Four levels of programs are used:

1. **Real applications:** a suite of programs typical of the target workload, such as SPEC (System Performance Evaluation Corporation). SPEC CPU2006 has 12 integer (CINT2006) and 17 floating-point (CFP2006) programs.
2. **Kernel benchmarks:** computation-intensive pieces extracted from real programs (Livermore Loops, Linpack). They are used to evaluate specific features of a machine.
3. **Toy benchmarks:** programs of 10–100 lines (sieve of Eratosthenes, quicksort). They are easy to run but of limited use.
4. **Synthetic benchmarks:** artificial programs that match the average frequency of operations of a large set of programs (Whetstone, Dhrystone). Compilers can inflate their results; optimizing compilers can discard over 25% of Dhrystone.

Benchmark results must be reproducible, so the hardware, software, compiler flags and tuning parameters are specified.

### Summarizing Performance

<figure class="table">
<figcaption>Execution times (s) of two programs on three machines.</figcaption>

| | A | B | C |
|:--|:-:|:-:|:-:|
| P1 | 1 | 10 | 25 |
| P2 | 500 | 250 | 10 |
| Total | 501 | 260 | 35 |

</figure>

A is 10 times faster than B for P1, but B is 2 times faster than A for P2. The results can be summarized as follows.

- **Total (or arithmetic mean) execution time**, $\frac{1}{n}\sum_i XT_i$. B is $501/260 = 1.93$ times faster than A, and C is $501/35 = 14.3$ times faster than A. This is correct only if the programs run equally often.
- **Weighted arithmetic mean**, $\sum_i W_i \times XT_i$, where $W_i$ is the fraction of the workload that is program $i$. With $W = (0.5, 0.5)$: A = 250.5, B = 130, C = 17.5. With $W = (0.9, 0.1)$: A = 50.9, B = 34, C = 23.5.
- **Normalized execution time:** each time is divided by the time on a reference machine, and the results are averaged. SPEC uses this.

$$\text{Normalized arithmetic mean} = \frac{1}{n}\sum_{i=1}^{n} XTR_i, \qquad \text{Normalized geometric mean} = \sqrt[n]{\prod_{i=1}^{n} XTR_i}$$

<figure class="table">
<figcaption>Means of the normalized times, with each machine as the reference.</figcaption>

| Reference | A | B | C |
|:--|:-:|:-:|:-:|
| A: arithmetic | 1.0 | 5.25 | 12.51 |
| A: geometric | 1.0 | 2.24 | 0.71 |
| B: arithmetic | 1.05 | 1.0 | 1.27 |
| B: geometric | 0.45 | 1.0 | 0.32 |
| C: arithmetic | 25.02 | 12.7 | 1.0 |
| C: geometric | 1.41 | 3.16 | 1.0 |

</figure>

The geometric means are consistent whichever machine is the reference (C, A, B in order of performance), whereas the arithmetic means are not. So the arithmetic mean should not be used to average normalized times. The drawback of the geometric mean is that it does not predict execution time.

### Amdahl's Law

<div class="definition">

*Amdahl's law* (Gene Amdahl, 1967): the performance improvement gained from using a faster mode of execution is limited by the fraction of the time the faster mode can be used.

</div>

If a fraction $F$ of the execution time is improved by a factor $S$, the time changes from $1$ to $(1 - F) + F/S$:

<figure class="fig">
<svg viewBox="0 0 600 140" width="600" role="img" aria-label="Amdahl's law: only the fraction F is sped up by S">
  <defs><marker id="arr-amd" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="110" y="20" width="300" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="40.2" text-anchor="middle" font-size="12" fill="currentColor">1 − F</text>
  <rect x="410" y="20" width="160" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="410" y="20" width="160" height="32" rx="3" fill="#ef4444" opacity=".18"/>
  <text x="490.0" y="40.2" text-anchor="middle" font-size="12" fill="currentColor">F</text>
  <text x="100.0" y="41.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">before</text>
  <rect x="110" y="80" width="300" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="100.2" text-anchor="middle" font-size="12" fill="currentColor">1 − F</text>
  <rect x="410" y="80" width="40" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="410" y="80" width="40" height="32" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="430.0" y="99.8" text-anchor="middle" font-size="11" fill="currentColor">F/S</text>
  <text x="100.0" y="101.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">after</text>
  <line x1="450" y1="96" x2="568" y2="96" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="510.0" y="130.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">time saved</text>
</svg>
<figcaption>Only the fraction $F$ of the execution time is sped up by $S$.</figcaption>
</figure>

$$\text{Speedup} = \frac{1}{(1 - F) + \dfrac{F}{S}} \qquad\xrightarrow{\;S \to \infty\;}\qquad \frac{1}{1 - F}$$

The fraction $F$ limits the maximum speedup. With $F = 0.25$ the speedup can never exceed $1/0.75 = 1.33$ ($S = 10$ already gives 1.29); with $F = 0.75$ the limit is 4.

- Making 10% of a program 90 times faster gives $1/(0.9 + 0.1/90) = 1.11$.
- Making 90% of a program 10 times faster gives $1/(0.1 + 0.9/10) = 5.26$.

<div class="example">

A RISC processor has the instruction mix Load 20% (CPI 5), Store 8% (CPI 3), ALU 60% (CPI 1), Branch 12% (CPI 2). The CPI of loads is reduced from 5 to 2. Find the speedup.

</div>

$CPI = 0.2 \times 5 + 0.08 \times 3 + 0.6 \times 1 + 0.12 \times 2 = 2.08$, and loads take $1.00/2.08 = 48\%$ of the time. So $F = 0.48$ and $S = 5/2 = 2.5$:

$$\text{Speedup} = \frac{1}{0.52 + 0.48/2.5} = 1.40$$

Alternatively, the new CPI is $0.2 \times 2 + 0.24 + 0.6 + 0.24 = 1.48$, and $2.08/1.48 = 1.40$. Here $F$ is the fraction of time (48%), not of instructions (20%).

<div class="example">

A program takes 50 s, of which 42 s are spent on multiplication. By how much must the multiplier be improved for the program to run 5 times faster? 8 times faster?

</div>

$F = 42/50 = 0.84$. For 5 times: $5 = 1/(0.16 + 0.84/S)$ gives $S = 21$. For 8 times: $8 = 1/(0.16 + 0.84/S)$ gives $S = -24$, so it is not possible; the maximum speedup is $1/0.16 = 6.25$.

Corollaries:

- **Make the common case fast.** Here "common" means the most time-consuming, not the most frequent, and it is found by profiling.
- Amdahl's law does not bound slowdown: if $F = 0.01$ is made 1000 times slower ($S = 0.001$), the new time is $0.99 + 0.01/0.001 = 10.99$ times the old.

If disjoint fractions $F_1, \dots, F_m$ are improved by $S_1, \dots, S_m$:

$$\text{Speedup} = \frac{1}{\left(1 - \sum_{i} F_i\right) + \sum_{i} \dfrac{F_i}{S_i}}$$

If two improvements overlap, the overlapping part is treated as a separate fraction with its own speedup.

<div class="example">

Without a cache, memory operations take 30% of the execution time. An L1 cache speeds up 80% of the memory operations by a factor of 4, and an L2 cache speeds up 50% of the remaining 20% by a factor of 2. Find the overall speedup.

</div>

$F_{L1} = 0.3 \times 0.8 = 0.24$ with $S_{L1} = 4$, and $F_{L2} = 0.3 \times 0.2 \times 0.5 = 0.03$ with $S_{L2} = 2$:

$$\text{Speedup} = \frac{1}{(1 - 0.24 - 0.03) + 0.24/4 + 0.03/2} = \frac{1}{0.805} = 1.24$$

## Design of the Control Unit

### Datapath and Control Signals

Instruction execution needs the registers, their internal organization, and the datapath. The registers, the ALU and the interconnecting bus are together called the **datapath**. The instruction decoder and control unit generate the control signals, in the proper sequence, to carry out the instruction in IR. Data movement is of three kinds: register to register, register to ALU, and ALU to register.

A register $R_i$ has two control signals:

- $R_i\text{in}$: load $R_i$ with the data on the bus;
- $R_i\text{out}$: place the contents of $R_i$ on the bus.

<figure class="fig">
<svg viewBox="0 0 450 176" width="450" role="img" aria-label="A register connected to the bus through Rin and Rout switches">
  <defs><marker id="arr-rg" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="30.0" y1="20.0" x2="30.0" y2="150.0" stroke="currentColor" stroke-width="3"/>
  <text x="30.0" y="168.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">bus</text>
  <rect x="120" y="60" width="110" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="120" y="60" width="110" height="44" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="175.0" y="86.2" text-anchor="middle" font-size="12" fill="currentColor">register Rᵢ</text>
  <polyline points="32.0,70.0 90.0,70.0 117.0,70.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-rg)"/>
  <text x="75.0" y="62.0" text-anchor="middle" font-size="11" fill="#22c55e">Rᵢin</text>
  <polyline points="120.0,94.0 32.0,94.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-rg)"/>
  <text x="75.0" y="112.0" text-anchor="middle" font-size="11" fill="#ef4444">Rᵢout</text>
  <circle cx="92" cy="70" r="4" fill="#22c55e"/>
  <circle cx="92" cy="94" r="4" fill="#ef4444"/>
  <text x="250.0" y="70.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">Rᵢin = 1: load from the bus</text>
  <text x="250.0" y="98.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">Rᵢout = 1: drive onto the bus</text>
</svg>
<figcaption>A register connected to the bus through controlled switches.</figcaption>
</figure>

All operations are synchronized with the processor clock: the control signals are asserted at the start of a cycle and return to 0 after the transfer. A time step is written with its control signals, e.g. `MOVE R1, R2` ($R1 \leftarrow R2$) is

$$T_1:\ R2_{\text{out}},\ R1_{\text{in}}$$

On the single-bus datapath (figure in [Bus Architecture](#bus-architecture)), one ALU operand comes through register Y and the other directly from the bus, and the result is stored in Z. `ADD R1, R2` ($R1 \leftarrow R1 + R2$) after the fetch is

$$T_1:\ R1_{\text{out}},\ Y_{\text{in}} \qquad T_2:\ R2_{\text{out}},\ \text{SelectY},\ \text{ADD},\ Z_{\text{in}} \qquad T_3:\ Z_{\text{out}},\ R1_{\text{in}}$$

### Memory Read and Write

MDR is connected to the internal bus ($\text{MDR}_\text{in}$, $\text{MDR}_\text{out}$) and to the memory bus ($\text{MDR}_\text{inE}$, $\text{MDR}_\text{outE}$). Since the memory response time varies, the processor waits for the **Memory Function Complete (MFC)** signal, which indicates that the read or write is complete. The step that waits for it contains WMFC.

<figure class="table">
<figcaption>Reading and writing a word.</figcaption>

| `MOVE R1, (R2)` (read) | `MOVE (R1), R2` (write) |
|:--|:--|
| $T_1$: $R2_\text{out}$, $\text{MAR}_\text{in}$, Read | $T_1$: $R1_\text{out}$, $\text{MAR}_\text{in}$ |
| $T_2$: $\text{MDR}_\text{inE}$, WMFC | $T_2$: $R2_\text{out}$, $\text{MDR}_\text{in}$, Write |
| $T_3$: $\text{MDR}_\text{out}$, $R1_\text{in}$ | $T_3$: $\text{MDR}_\text{outE}$, WMFC |

</figure>

### Execution of a Complete Instruction

The first three steps are the instruction fetch, common to all instructions. In $T_1$ the ALU computes PC + 4 (Select4) while memory is read, and in $T_2$ the result is loaded into PC.

<figure class="table tight">
<figcaption>Control sequences on the single-bus datapath. In step 4, $\text{IR}_\text{out}$ places the address field (for LOCA) or the offset field (for the branch) on the bus.</figcaption>

<table>
<thead><tr><th>Step</th><th><code>ADD R1, R2</code></th><th><code>ADD R1, LOCA</code></th><th><code>BR Label</code></th></tr></thead>
<tbody>
<tr><td style="text-align:center">1</td><td colspan="3" style="text-align:center">$\text{PC}_\text{out}$, $\text{MAR}_\text{in}$, Read, Select4, Add, $Z_\text{in}$</td></tr>
<tr><td style="text-align:center">2</td><td colspan="3" style="text-align:center">$Z_\text{out}$, $\text{PC}_\text{in}$, $Y_\text{in}$, WMFC</td></tr>
<tr><td style="text-align:center">3</td><td colspan="3" style="text-align:center">$\text{MDR}_\text{out}$, $\text{IR}_\text{in}$</td></tr>
<tr><td style="text-align:center">4</td><td>$R1_\text{out}$, $Y_\text{in}$</td><td>$\text{IR}_\text{out}$, $\text{MAR}_\text{in}$, Read</td><td>$\text{IR}_\text{out}$, SelectY, Add, $Z_\text{in}$</td></tr>
<tr><td style="text-align:center">5</td><td>$R2_\text{out}$, SelectY, Add, $Z_\text{in}$</td><td>$R1_\text{out}$, $Y_\text{in}$, WMFC</td><td>$Z_\text{out}$, $\text{PC}_\text{in}$, End</td></tr>
<tr><td style="text-align:center">6</td><td>$Z_\text{out}$, $R1_\text{in}$, End</td><td>$\text{MDR}_\text{out}$, SelectY, Add, $Z_\text{in}$</td><td></td></tr>
<tr><td style="text-align:center">7</td><td></td><td>$Z_\text{out}$, $R1_\text{in}$, End</td><td></td></tr>
</tbody>
</table>
</figure>

Other instructions differ only after step 3:

- `LOAD R1, LOCA`: address field of $\text{IR}_\text{out}$, $\text{MAR}_\text{in}$, Read; WMFC; $\text{MDR}_\text{out}$, $R1_\text{in}$, End.
- `STORE LOCA, R1`: address field of $\text{IR}_\text{out}$, $\text{MAR}_\text{in}$; $R1_\text{out}$, $\text{MDR}_\text{in}$, Write; $\text{MDR}_\text{outE}$, WMFC, End.
- `MOVE R1, #10`: immediate field of $\text{IR}_\text{out}$, $R1_\text{in}$, End.
- `BZ Label`: like `BR`, but step 4 also has "if $Z = 0$ then End".
- `INC R1`: $R1_\text{out}$, Select4, Add, $Z_\text{in}$; $Z_\text{out}$, $R1_\text{in}$, End.
- `CMP R1, R2`: $R1_\text{out}$, $Y_\text{in}$; $R2_\text{out}$, SelectY, Sub, $Z_\text{in}$, End.
- `HALT`: End.

#### Three-Bus Organization

With three internal buses, two operands can be sent to the ALU on buses A and B while the result is placed on bus C, so fewer steps are needed than with a single bus.

<figure class="fig">
<svg viewBox="0 0 660 320" width="660" role="img" aria-label="Three-bus organization: two source buses into the ALU and a result bus">
  <defs><marker id="arr-3b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="200.0" y1="20.0" x2="200.0" y2="300.0" stroke="currentColor" stroke-width="3"/>
  <text x="200.0" y="14.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">bus A</text>
  <line x1="250.0" y1="20.0" x2="250.0" y2="300.0" stroke="currentColor" stroke-width="3"/>
  <text x="250.0" y="14.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">bus B</text>
  <line x1="420.0" y1="20.0" x2="420.0" y2="300.0" stroke="currentColor" stroke-width="3"/>
  <text x="420.0" y="14.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">bus C</text>
  <rect x="270" y="40" width="110" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="325.0" y="62.2" text-anchor="middle" font-size="12" fill="currentColor">PC</text>
  <rect x="270" y="100" width="110" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="100" width="110" height="60" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="325.0" y="134.2" text-anchor="middle" font-size="12" fill="currentColor">Register file</text>
  <rect x="470" y="120" width="90" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="515.0" y="142.2" text-anchor="middle" font-size="12" fill="currentColor">MAR</text>
  <rect x="470" y="180" width="90" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="515.0" y="202.2" text-anchor="middle" font-size="12" fill="currentColor">MDR</text>
  <rect x="470" y="240" width="90" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="515.0" y="262.2" text-anchor="middle" font-size="12" fill="currentColor">IR</text>
  <rect x="40" y="220" width="90" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="40" y="220" width="90" height="60" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="85.0" y="254.2" text-anchor="middle" font-size="12" fill="currentColor">ALU</text>
  <line x1="380.0" y1="58.0" x2="418.0" y2="58.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="250.0" y1="58.0" x2="270.0" y2="58.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="270.0" y1="115.0" x2="200.0" y2="115.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="270.0" y1="135.0" x2="250.0" y2="135.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="380.0" y1="145.0" x2="418.0" y2="145.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="130.0" y1="240.0" x2="200.0" y2="240.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="130.0" y1="260.0" x2="250.0" y2="260.0" stroke="currentColor" stroke-width="1.5"/>
  <polyline points="85.0,280.0 85.0,298.0 420.0,298.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="420.0" y1="138.0" x2="470.0" y2="138.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="420.0" y1="198.0" x2="470.0" y2="198.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="420.0" y1="258.0" x2="470.0" y2="258.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="470.0" y1="210.0" x2="250.0" y2="210.0" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="250" cy="210" r="3.5" fill="currentColor"/>
  <line x1="560.0" y1="138.0" x2="600.0" y2="138.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="560.0" y1="198.0" x2="600.0" y2="198.0" stroke="currentColor" stroke-width="1.5"/>
  <text x="605.0" y="142.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">address</text>
  <text x="605.0" y="202.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">data</text>
  <text x="605.0" y="120.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">to memory</text>
  <text x="165.0" y="232.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">A</text>
  <text x="190.0" y="272.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">B</text>
  <text x="250.0" y="312.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">result on bus C</text>
  <circle cx="200" cy="115" r="3.5" fill="currentColor"/>
  <circle cx="250" cy="135" r="3.5" fill="currentColor"/>
  <circle cx="250" cy="58" r="3.5" fill="currentColor"/>
  <circle cx="420" cy="58" r="3.5" fill="currentColor"/>
  <circle cx="420" cy="145" r="3.5" fill="currentColor"/>
  <circle cx="420" cy="138" r="3.5" fill="currentColor"/>
  <circle cx="420" cy="198" r="3.5" fill="currentColor"/>
  <circle cx="420" cy="258" r="3.5" fill="currentColor"/>
  <circle cx="200" cy="240" r="3.5" fill="currentColor"/>
  <circle cx="250" cy="260" r="3.5" fill="currentColor"/>
  <circle cx="420" cy="298" r="3.5" fill="currentColor"/>
</svg>
<figcaption>Three-bus organization of the datapath (after the NPTEL course <a href="#ref-1">[1]</a>).</figcaption>
</figure>

`SUB R1, R2, R3` ($R1 \leftarrow R2 - R3$) takes four steps:

$$\begin{aligned}
&T_1:\ \text{PC}_\text{out},\ R{=}B,\ \text{MAR}_\text{in},\ \text{Read},\ \text{IncPC} \\
&T_2:\ \text{WMFC} \\
&T_3:\ \text{MDR}_\text{outB},\ R{=}B,\ \text{IR}_\text{in} \\
&T_4:\ R2_\text{outA},\ R3_\text{outB},\ \text{SelectA},\ \text{SUB},\ R1_\text{in},\ \text{End}
\end{aligned}$$

### Hardwired Control

In a **hardwired** control unit the control signals are generated by combinational logic. Each step is assumed to take one clock cycle, and a counter keeps track of the time step.

<figure class="fig">
<svg viewBox="0 0 720 314" width="720" role="img" aria-label="Hardwired control unit: step counter and decoders feeding a combinational encoder">
  <defs><marker id="arr-hw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="40" width="80" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="61.9" text-anchor="middle" font-size="11" fill="currentColor">clock</text>
  <rect x="140" y="40" width="120" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="200.0" y="55.5" text-anchor="middle" font-size="10" fill="currentColor">control step</text>
  <text x="200.0" y="67.5" text-anchor="middle" font-size="10" fill="currentColor">counter</text>
  <rect x="300" y="40" width="300" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="450.0" y="61.9" text-anchor="middle" font-size="11" fill="currentColor">step decoder</text>
  <line x1="100.0" y1="58.0" x2="137.0" y2="58.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <line x1="260.0" y1="58.0" x2="297.0" y2="58.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <line x1="200.0" y1="14.0" x2="200.0" y2="37.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="206.0" y="22.0" text-anchor="start" font-size="10" fill="currentColor">Run</text>
  <rect x="300" y="120" width="300" height="100" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="120" width="300" height="100" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="450.0" y="174.6" text-anchor="middle" font-size="13" fill="currentColor">encoder</text>
  <line x1="360.0" y1="76.0" x2="360.0" y2="117.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="365.0" y="100.0" text-anchor="start" font-size="10" fill="currentColor">T₁</text>
  <line x1="420.0" y1="76.0" x2="420.0" y2="117.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="425.0" y="100.0" text-anchor="start" font-size="10" fill="currentColor">T₂</text>
  <line x1="540.0" y1="76.0" x2="540.0" y2="117.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="545.0" y="100.0" text-anchor="start" font-size="10" fill="currentColor">Tₙ</text>
  <text x="480.0" y="102.0" text-anchor="middle" font-size="12" fill="currentColor">⋯</text>
  <rect x="20" y="150" width="80" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="172.2" text-anchor="middle" font-size="12" fill="currentColor">IR</text>
  <rect x="140" y="130" width="90" height="76" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="165.5" text-anchor="middle" font-size="10" fill="currentColor">instruction</text>
  <text x="185.0" y="177.5" text-anchor="middle" font-size="10" fill="currentColor">decoder</text>
  <line x1="100.0" y1="168.0" x2="137.0" y2="168.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <line x1="230.0" y1="142.0" x2="297.0" y2="142.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="236.0" y="139.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">INS₁</text>
  <line x1="230.0" y1="162.0" x2="297.0" y2="162.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="236.0" y="159.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">INS₂</text>
  <line x1="230.0" y1="202.0" x2="297.0" y2="202.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="236.0" y="199.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">INSₘ</text>
  <text x="264.0" y="186.0" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
  <line x1="380.0" y1="262.0" x2="380.0" y2="223.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="380.0" y="276.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">condition codes</text>
  <line x1="520.0" y1="262.0" x2="520.0" y2="223.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hw)"/>
  <text x="520.0" y="276.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">external inputs (MFC, …)</text>
  <line x1="600.0" y1="135.0" x2="640.0" y2="135.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-hw)"/>
  <line x1="600.0" y1="155.0" x2="640.0" y2="155.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-hw)"/>
  <line x1="600.0" y1="175.0" x2="640.0" y2="175.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-hw)"/>
  <text x="620.0" y="194.0" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
  <text x="648.0" y="150.0" text-anchor="start" font-size="11" fill="currentColor">control</text>
  <text x="648.0" y="164.0" text-anchor="start" font-size="11" fill="currentColor">signals</text>
  <polyline points="600.0,208.0 630.0,208.0 630.0,292.0 10.0,292.0 10.0,98.0 180.0,98.0 180.0,79.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-hw)"/>
  <text x="636.0" y="222.0" text-anchor="start" font-size="10" fill="#ef4444">End</text>
  <text x="320.0" y="306.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">End resets the counter; Run = 0 stops it (e.g. while waiting for MFC)</text>
</svg>
<figcaption>Hardwired control unit (after the NPTEL course <a href="#ref-1">[1]</a> and Hamacher).</figcaption>
</figure>

- The control signals depend on the control step counter, the contents of IR, the condition code flags, and external inputs such as MFC.
- The **step decoder** gives a separate line $T_1, T_2, \dots$ for each step. If an instruction needs at most 10 steps, a $4 \times 16$ decoder is used.
- The **instruction decoder** sets one output line $\text{INS}_i$ for the instruction in IR. With up to 100 instructions, a $7 \times 128$ decoder is used.
- The counter is incremented every clock while **Run** is 1; Run is 0 while waiting for MFC (WMFC). **End** resets the counter to start a new instruction.
- The **encoder** generates each control signal as a logic function of these lines, read off the control sequences. For example,

$$\text{PC}_\text{in} = T_2 + T_5 \cdot \text{BR}, \qquad \text{End} = T_6 \cdot \text{ADDR} + T_5 \cdot \text{BR} + T_7 \cdot \text{ADDM}$$

The sequence of operations is determined by the wiring of the logic, hence the name. A hardwired control unit is fast, but is limited by the complexity of the instruction set.

### Microprogrammed Control

In a **microprogrammed** control unit the control signals are generated by a program stored in a **control store (CS)**.

- Each step of a control sequence is a **control word (CW)**, whose bits represent the control signals. A control word is a **microinstruction**.
- The sequence of control words for a machine instruction is its **microroutine**.
- When an instruction is loaded into IR, the starting address generator loads the address of its microroutine into the **microprogram counter (μPC)**. The μPC is then incremented every clock, and the control words are read in sequence.

<figure class="fig">
<svg viewBox="0 0 680 150" width="680" role="img" aria-label="Microprogrammed control unit: the micro-PC reads control words from the control store">
  <defs><marker id="arr-mp" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="40" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55.0" y="64.2" text-anchor="middle" font-size="12" fill="currentColor">IR</text>
  <rect x="130" y="40" width="130" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="195.0" y="57.5" text-anchor="middle" font-size="10" fill="currentColor">starting address</text>
  <text x="195.0" y="69.5" text-anchor="middle" font-size="10" fill="currentColor">generator</text>
  <rect x="300" y="40" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="40" width="70" height="40" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="335.0" y="64.2" text-anchor="middle" font-size="12" fill="currentColor">μPC</text>
  <rect x="410" y="20" width="120" height="80" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="410" y="20" width="120" height="80" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="470.0" y="63.9" text-anchor="middle" font-size="11" fill="currentColor">control store</text>
  <line x1="90.0" y1="60.0" x2="127.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mp)"/>
  <line x1="260.0" y1="60.0" x2="297.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mp)"/>
  <line x1="370.0" y1="60.0" x2="407.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mp)"/>
  <line x1="530.0" y1="60.0" x2="580.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mp)"/>
  <text x="586.0" y="56.0" text-anchor="start" font-size="11" fill="currentColor">control word</text>
  <text x="586.0" y="71.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">(CW)</text>
  <line x1="335.0" y1="125.0" x2="335.0" y2="83.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mp)"/>
  <text x="335.0" y="140.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">clock: μPC + 1</text>
</svg>
<figcaption>Microprogrammed control unit.</figcaption>
</figure>

<figure class="table">
<figcaption>Control store for <code>ADD R1, R2</code>: one column per microinstruction, a 1 for each active signal (Select = 0 selects the constant 4, 1 selects Y).</figcaption>

| Signal | 1 | 2 | 3 | 4 | 5 | 6 |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|
| $\text{PC}_\text{in}$ | 0 | 1 | 0 | 0 | 0 | 0 |
| $\text{PC}_\text{out}$ | 1 | 0 | 0 | 0 | 0 | 0 |
| $\text{MAR}_\text{in}$ | 1 | 0 | 0 | 0 | 0 | 0 |
| Read | 1 | 0 | 0 | 0 | 0 | 0 |
| $\text{MDR}_\text{out}$ | 0 | 0 | 1 | 0 | 0 | 0 |
| $\text{IR}_\text{in}$ | 0 | 0 | 1 | 0 | 0 | 0 |
| $\text{Y}_\text{in}$ | 0 | 1 | 0 | 1 | 0 | 0 |
| Select | 0 | 0 | 0 | 0 | 1 | 0 |
| Add | 1 | 0 | 0 | 0 | 1 | 0 |
| $\text{Z}_\text{in}$ | 1 | 0 | 0 | 0 | 1 | 0 |
| $\text{Z}_\text{out}$ | 0 | 1 | 0 | 0 | 0 | 1 |
| $\text{R1}_\text{out}$ | 0 | 0 | 0 | 1 | 0 | 0 |
| $\text{R1}_\text{in}$ | 0 | 0 | 0 | 0 | 0 | 1 |
| $\text{R2}_\text{out}$ | 0 | 0 | 0 | 0 | 1 | 0 |
| WMFC | 0 | 1 | 0 | 0 | 0 | 0 |
| End | 0 | 0 | 0 | 0 | 0 | 1 |

</figure>

<figure class="table">
<figcaption>Hardwired and microprogrammed control.</figcaption>

| | Hardwired | Microprogrammed |
|:--|:--|:--|
| Signals from | combinational logic | control store |
| Speed | faster | slower (one control store read per step) |
| Changing the design | rewiring | changing the microprogram |
| Suited to | RISC | CISC |

</figure>

#### Microinstruction Encoding

Suppose there are $k$ control signals $c_1, \dots, c_k$.

<figure class="fig">
<svg viewBox="0 0 520 252" width="520" role="img" aria-label="Horizontal, vertical and diagonal microinstruction encoding">
  <defs><marker id="arr-me" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20.0" y="20.0" text-anchor="start" font-size="11" fill="currentColor">(a) horizontal: one bit per signal</text>
  <rect x="20" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="35.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c1</text>
  <rect x="50" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="50" y="30" width="30" height="26" rx="0" fill="#22c55e" opacity=".3"/>
  <text x="65.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c2</text>
  <rect x="80" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c3</text>
  <rect x="110" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="110" y="30" width="30" height="26" rx="0" fill="#22c55e" opacity=".3"/>
  <text x="125.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c4</text>
  <rect x="140" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="140" y="30" width="30" height="26" rx="0" fill="#22c55e" opacity=".3"/>
  <text x="155.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c5</text>
  <rect x="170" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c6</text>
  <rect x="200" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c7</text>
  <rect x="230" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="245.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c8</text>
  <rect x="260" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="275.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c9</text>
  <rect x="290" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="305.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c10</text>
  <rect x="320" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="335.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">c11</text>
  <rect x="350" y="30" width="30" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="365.0" y="46.1" text-anchor="middle" font-size="9" fill="currentColor">cₖ</text>
  <text x="20.0" y="92.0" text-anchor="start" font-size="11" fill="currentColor">(b) vertical: one encoded field</text>
  <rect x="20" y="102" width="120" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="80.0" y="118.5" text-anchor="middle" font-size="10" fill="currentColor">m-bit code</text>
  <rect x="170" y="102" width="90" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="170" y="102" width="90" height="26" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="215.0" y="118.5" text-anchor="middle" font-size="10" fill="currentColor">decoder</text>
  <line x1="140.0" y1="115.0" x2="167.0" y2="115.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-me)"/>
  <line x1="260.0" y1="115.0" x2="290.0" y2="115.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-me)"/>
  <text x="296.0" y="119.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">exactly one of c₁ … cₖ (k ≤ 2ᵐ)</text>
  <text x="20.0" y="164.0" text-anchor="start" font-size="11" fill="currentColor">(c) diagonal: groups of mutually exclusive signals</text>
  <rect x="20" y="174" width="70" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55.0" y="190.5" text-anchor="middle" font-size="10" fill="currentColor">m1</text>
  <rect x="24" y="220" width="62" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="24" y="220" width="62" height="22" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="55.0" y="234.2" text-anchor="middle" font-size="9" fill="currentColor">dec</text>
  <line x1="55.0" y1="200.0" x2="55.0" y2="217.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-me)"/>
  <rect x="90" y="174" width="55" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="117.5" y="190.5" text-anchor="middle" font-size="10" fill="currentColor">m2</text>
  <rect x="94" y="220" width="47" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="94" y="220" width="47" height="22" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="117.5" y="234.2" text-anchor="middle" font-size="9" fill="currentColor">dec</text>
  <line x1="117.5" y1="200.0" x2="117.5" y2="217.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-me)"/>
  <rect x="145" y="174" width="85" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="187.5" y="190.5" text-anchor="middle" font-size="10" fill="currentColor">m3</text>
  <rect x="149" y="220" width="77" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="149" y="220" width="77" height="22" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="187.5" y="234.2" text-anchor="middle" font-size="9" fill="currentColor">dec</text>
  <line x1="187.5" y1="200.0" x2="187.5" y2="217.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-me)"/>
  <rect x="230" y="174" width="45" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="252.5" y="190.5" text-anchor="middle" font-size="10" fill="currentColor">m4</text>
  <rect x="234" y="220" width="37" height="22" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="234" y="220" width="37" height="22" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="252.5" y="234.2" text-anchor="middle" font-size="9" fill="currentColor">dec</text>
  <line x1="252.5" y1="200.0" x2="252.5" y2="217.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-me)"/>
  <text x="290.0" y="236.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">one signal per group, groups in parallel</text>
</svg>
<figcaption>Horizontal, vertical and diagonal microinstruction encoding.</figcaption>
</figure>

- **Horizontal:** a control word has $k$ bits, one for each control signal, and several bits can be 1. Any number of micro-operations can be activated in parallel, but the control words are long, so the control memory is large and costly.
- **Vertical:** the control signals are encoded in an $m$-bit word with $k \le 2^m$, and a decoder activates exactly one signal. The words are short, but only one signal is active at a time, so more steps are needed.
- **Diagonal:** the signals are divided into $s$ groups of $k_1, \dots, k_s$ signals, where the signals in a group are mutually exclusive. Each group is encoded in $m_i$ bits with $k_i \le 2^{m_i}$ and has its own decoder. Signals in different groups can be active together. This gives the parallelism needed by the microprograms with fewer bits than horizontal encoding, and is used in practice.

<div class="example">

A datapath has 100 control signals. After analysing the microprograms, they are divided into 5 groups of 25, 15, 40, 5 and 15 mutually exclusive signals. Find the control word size for each encoding.

</div>

- Horizontal: 100 bits.
- Vertical: $\lceil \log_2 100 \rceil = 7$ bits.
- Diagonal: $25 \le 2^5$, $15 \le 2^4$, $40 \le 2^6$, $5 \le 2^3$, $15 \le 2^4$, so $5 + 4 + 6 + 3 + 4 = 22$ bits.

#### Microprogram Sequencing

Incrementing the μPC is not enough when a microroutine has to branch, e.g. on a condition flag or to the common fetch routine. A common approach is a single **address field** in the microinstruction, with **branch control** bits that select, using the flags, between this address, an address derived from the instruction register code, and the next sequential address [[3]](#ref-3):

$$\underbrace{\text{branch control}}_{\lceil \log_2 (\text{no. of conditions}) \rceil} \;\Big|\; \underbrace{\text{address}}_{\lceil \log_2 (\text{control store words}) \rceil} \;\Big|\; \underbrace{\text{control signals}}_{\text{horizontal, vertical or diagonal}}$$

The selected condition decides whether the μPC is loaded from the address field or incremented. For example, with a 4K-word control store, 8 branch conditions and 30 horizontal control signals, a microinstruction has $3 + 12 + 30 = 45$ bits.

### MIPS32 Implementation

The relative positions of the register fields and the immediate data are the same in all MIPS32 instructions. So when an instruction is decoded, the register operands are fetched and the immediate data is sign-extended at the same time; if they are not needed, they are ignored. The register bank has two read ports and one write port.

The instruction execution cycle has five steps. It uses temporary registers: A and B hold the register operands, Imm the sign-extended immediate, NPC the next PC (PC + 4), ALUOut the ALU result and LMD the load memory data.

<figure class="table">
<figcaption>Micro-operations of the non-pipelined MIPS32 implementation.</figcaption>
<table>
<thead><tr><th>Step</th><th>Instruction</th><th>Micro-operations</th></tr></thead>
<tbody>
<tr><td class="grp">IF</td><td>all</td><td>IR ← Mem[PC]<br>NPC ← PC + 4</td></tr>
<tr><td class="grp">ID</td><td>all</td><td>A ← Reg[rs]<br>B ← Reg[rt]<br>Imm ← (IR₁₅)¹⁶ ## IR₁₅..₀<br>Imm1 ← IR₂₅..₀ ## 00</td></tr>
<tr><td rowspan="4" class="grp">EX</td><td>load / store</td><td>ALUOut ← A + Imm</td></tr>
<tr><td>R–R ALU</td><td>ALUOut ← A func B</td></tr>
<tr><td>R–Imm ALU</td><td>ALUOut ← A func Imm</td></tr>
<tr><td>branch</td><td>ALUOut ← NPC + (Imm ≪ 2)<br>cond ← (A op 0)</td></tr>
<tr><td rowspan="4" class="grp">MEM</td><td>load</td><td>PC ← NPC<br>LMD ← Mem[ALUOut]</td></tr>
<tr><td>store</td><td>PC ← NPC<br>Mem[ALUOut] ← B</td></tr>
<tr><td>branch</td><td>if (cond) PC ← ALUOut<br>else PC ← NPC</td></tr>
<tr><td>others</td><td>PC ← NPC</td></tr>
<tr><td rowspan="3" class="grp">WB</td><td>R–R ALU</td><td>Reg[rd] ← ALUOut</td></tr>
<tr><td>R–Imm ALU</td><td>Reg[rt] ← ALUOut</td></tr>
<tr><td>load</td><td>Reg[rt] ← LMD</td></tr>
</tbody>
</table>
</figure>

In IF the new PC is not stored in PC, since for a branch it may be the target address; it is kept in NPC and PC is updated in MEM. In ID, `##` is concatenation: the 16-bit immediate is sign-extended by copying IR₁₅ sixteen times.

<figure class="fig">
<svg viewBox="0 0 750 214" width="750" role="img" aria-label="Non-pipelined MIPS32 datapath across the five steps">
  <defs><marker id="arr-md" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="70.0" y="14.0" text-anchor="middle" font-size="12" fill="#ef4444">IF</text>
  <text x="230.0" y="14.0" text-anchor="middle" font-size="12" fill="#ef4444">ID</text>
  <text x="390.0" y="14.0" text-anchor="middle" font-size="12" fill="#ef4444">EX</text>
  <text x="550.0" y="14.0" text-anchor="middle" font-size="12" fill="#ef4444">MEM</text>
  <text x="690.0" y="14.0" text-anchor="middle" font-size="12" fill="#ef4444">WB</text>
  <rect x="10" y="60" width="50" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="35.0" y="84.2" text-anchor="middle" font-size="12" fill="currentColor">PC</text>
  <rect x="80" y="50" width="70" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="80" y="50" width="70" height="60" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="115.0" y="77.5" text-anchor="middle" font-size="10" fill="currentColor">instr.</text>
  <text x="115.0" y="89.5" text-anchor="middle" font-size="10" fill="currentColor">memory</text>
  <rect x="80" y="140" width="50" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="105.0" y="158.8" text-anchor="middle" font-size="11" fill="currentColor">+4</text>
  <line x1="60.0" y1="80.0" x2="77.0" y2="80.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <polyline points="35.0,100.0 35.0,155.0 77.0,155.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-md)"/>
  <rect x="170" y="60" width="40" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190.0" y="83.8" text-anchor="middle" font-size="11" fill="currentColor">IR</text>
  <line x1="150.0" y1="80.0" x2="167.0" y2="80.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <rect x="170" y="140" width="50" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="195.0" y="158.5" text-anchor="middle" font-size="10" fill="currentColor">NPC</text>
  <line x1="130.0" y1="155.0" x2="167.0" y2="155.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <rect x="240" y="40" width="80" height="70" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="240" y="40" width="80" height="70" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="280.0" y="72.5" text-anchor="middle" font-size="10" fill="currentColor">register</text>
  <text x="280.0" y="84.5" text-anchor="middle" font-size="10" fill="currentColor">bank</text>
  <rect x="240" y="130" width="80" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="280.0" y="148.5" text-anchor="middle" font-size="10" fill="currentColor">sign ext.</text>
  <line x1="210.0" y1="75.0" x2="237.0" y2="75.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <polyline points="210.0,92.0 224.0,92.0 224.0,145.0 237.0,145.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-md)"/>
  <rect x="340" y="40" width="30" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="355.0" y="58.5" text-anchor="middle" font-size="10" fill="currentColor">A</text>
  <rect x="340" y="80" width="30" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="355.0" y="98.5" text-anchor="middle" font-size="10" fill="currentColor">B</text>
  <rect x="340" y="130" width="30" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="355.0" y="147.8" text-anchor="middle" font-size="8" fill="currentColor">Imm</text>
  <line x1="320.0" y1="55.0" x2="337.0" y2="55.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <line x1="320.0" y1="95.0" x2="337.0" y2="95.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <line x1="320.0" y1="145.0" x2="337.0" y2="145.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <polygon points="390,40 450,70 450,120 390,150 390,110 402,95 390,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="428.0" y="100.0" text-anchor="middle" font-size="11" fill="currentColor">ALU</text>
  <line x1="370.0" y1="55.0" x2="389.0" y2="55.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <polyline points="370.0,95.0 374.0,95.0 374.0,118.0 389.0,118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-md)"/>
  <polyline points="370.0,145.0 379.0,145.0 379.0,136.0 389.0,136.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-md)"/>
  <rect x="470" y="80" width="50" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="495.0" y="97.8" text-anchor="middle" font-size="8" fill="currentColor">ALUOut</text>
  <line x1="450.0" y1="95.0" x2="467.0" y2="95.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <rect x="470" y="130" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="495.0" y="146.2" text-anchor="middle" font-size="9" fill="currentColor">cond</text>
  <text x="430.0" y="165.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">= 0</text>
  <rect x="540" y="50" width="70" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="540" y="50" width="70" height="60" rx="3" fill="#a855f7" opacity=".18"/>
  <text x="575.0" y="77.5" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <text x="575.0" y="89.5" text-anchor="middle" font-size="10" fill="currentColor">memory</text>
  <line x1="520.0" y1="88.0" x2="537.0" y2="88.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <rect x="630" y="60" width="40" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="650.0" y="78.2" text-anchor="middle" font-size="9" fill="currentColor">LMD</text>
  <line x1="610.0" y1="75.0" x2="627.0" y2="75.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <rect x="690" y="60" width="22" height="70" rx="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="701.0" y="98.0" text-anchor="middle" font-size="6" fill="currentColor">MUX</text>
  <line x1="670.0" y1="75.0" x2="687.0" y2="75.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-md)"/>
  <polyline points="520.0,102.0 530.0,102.0 530.0,120.0 687.0,120.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-md)"/>
  <polyline points="712.0,95.0 730.0,95.0 730.0,24.0 280.0,24.0 280.0,37.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-md)"/>
  <text x="640.0" y="44.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">write back</text>
  <polyline points="495.0,156.0 495.0,185.0 20.0,185.0 20.0,103.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-md)"/>
  <text x="250.0" y="200.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">next PC: NPC, or ALUOut if the branch is taken</text>
</svg>
<figcaption>Datapath of the non-pipelined MIPS32 implementation (after the NPTEL course <a href="#ref-1">[1]</a>).</figcaption>
</figure>

Since the instruction encoding is regular, the control unit is simple. The control signals of the datapath are LoadPC, LoadNPC, ReadIM, LoadIR, ReadRegPort1, ReadRegPort2, LoadA, LoadB, LoadIMM, MuxALU1, MuxALU2, ALUfunc, LoadALUOut, MuxPC, ReadDM, WriteDM, LoadLMD, MuxWB and WriteReg.

<figure class="table">
<figcaption>Control signals for two instructions.</figcaption>

| Step | `ADD R2, R5, R10` | `LW R2, 100(R5)` |
|:--|:--|:--|
| IF | ReadIM, LoadIR, LoadNPC | ReadIM, LoadIR, LoadNPC |
| ID | ReadRegPort1, ReadRegPort2, LoadA, LoadB | ReadRegPort1, LoadA, LoadIMM |
| EX | ALUfunc = add, LoadALUOut<br>MuxALU1 = 0, MuxALU2 = 0 | ALUfunc = add, LoadALUOut<br>MuxALU1 = 0, MuxALU2 = 1 |
| MEM | LoadPC | LoadPC, ReadDM, LoadLMD |
| WB | MuxWB = 1, WriteReg | MuxWB = 0, WriteReg |

</figure>

## Pipelining

### Basic Concepts

<div class="definition">

*Pipelining* is the overlapped execution of several instructions (or input sets) by partitioning a computation into $k$ sub-computations, called *stages*.

</div>

The increase in hardware cost is small, and the ideal speedup is $k$. Pipelining is used in instruction execution, in arithmetic (the same operation on several data sets) and in memory access (consecutive locations).

<figure class="fig">
<svg viewBox="0 0 564 170" width="564" role="img" aria-label="Five instructions overlapped in a 5-stage pipeline">
  <defs><marker id="arr-pbasic" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-pbasicr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <text x="163.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="209.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="255.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="301.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4</text>
  <text x="347.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">5</text>
  <text x="393.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">6</text>
  <text x="439.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">7</text>
  <text x="485.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">8</text>
  <text x="531.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9</text>
  <text x="132.0" y="18.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">cycle</text>
  <text x="130.0" y="47.0" text-anchor="end" font-size="11" fill="currentColor">i1</text>
  <rect x="141" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="141" y="32" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="163.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="187" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="187" y="32" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="209.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="233" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="233" y="32" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="255.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="279" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="279" y="32" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="301.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="325" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="325" y="32" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="347.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="130.0" y="73.0" text-anchor="end" font-size="11" fill="currentColor">i2</text>
  <rect x="187" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="187" y="58" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="209.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="233" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="233" y="58" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="255.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="279" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="279" y="58" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="301.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="325" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="325" y="58" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="347.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="371" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="371" y="58" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="393.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="130.0" y="99.0" text-anchor="end" font-size="11" fill="currentColor">i3</text>
  <rect x="233" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="233" y="84" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="255.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="279" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="279" y="84" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="301.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="325" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="325" y="84" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="347.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="371" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="371" y="84" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="393.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="417" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="417" y="84" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="439.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="130.0" y="125.0" text-anchor="end" font-size="11" fill="currentColor">i4</text>
  <rect x="279" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="279" y="110" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="301.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="325" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="325" y="110" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="347.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="371" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="371" y="110" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="393.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="417" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="417" y="110" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="439.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="463" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="463" y="110" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="485.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="130.0" y="151.0" text-anchor="end" font-size="11" fill="currentColor">i5</text>
  <rect x="325" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="325" y="136" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="347.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="371" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="371" y="136" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="393.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="417" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="417" y="136" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="439.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="463" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="463" y="136" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="485.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="509" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="509" y="136" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="531.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
</svg>
<figcaption>Five instructions in a 5-stage pipeline. In serial execution, $i_2$ would start only after $i_1$ finishes in cycle 5.</figcaption>
</figure>

With $k$ stages of one cycle each and $n$ instructions:

- **Serial (non-pipelined):** each instruction takes $k$ cycles, so $n$ instructions take $k \cdot n$ cycles.
- **Pipelined:** $k - 1$ cycles fill up the pipeline, and then one instruction completes every cycle (CPI = 1), so $n$ instructions take $n + k - 1$ cycles.

$$S_k = \frac{k\,n}{n + k - 1} \;\xrightarrow{\;n \to \infty\;}\; k$$

A speedup of $k$ could also be obtained by replicating the hardware $k$ times, but the cost would also be $k$ times. Splitting the computation into stages needs only **latches** between the stages, to hold the intermediate results.

### Synchronous k-Stage Pipeline

<figure class="fig">
<svg viewBox="0 0 478 130" width="478" role="img" aria-label="Synchronous k-stage pipeline: combinational stages separated by latches on a common clock">
  <defs><marker id="arr-km" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-kmr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="20" y="40" width="24" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="40" width="24" height="40" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="32.0" y="63.9" text-anchor="middle" font-size="11" fill="currentColor">L</text>
  <line x1="44.0" y1="60.0" x2="57.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-km)"/>
  <rect x="60" y="40" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="40" width="70" height="40" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="95.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">S₁</text>
  <text x="95.0" y="30.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">stage 1</text>
  <line x1="130.0" y1="60.0" x2="143.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-km)"/>
  <rect x="146" y="40" width="24" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="146" y="40" width="24" height="40" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="158.0" y="63.9" text-anchor="middle" font-size="11" fill="currentColor">L</text>
  <line x1="170.0" y1="60.0" x2="183.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-km)"/>
  <rect x="186" y="40" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="186" y="40" width="70" height="40" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="221.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">S₂</text>
  <text x="221.0" y="30.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">stage 2</text>
  <line x1="256.0" y1="60.0" x2="269.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-km)"/>
  <text x="290.0" y="66.0" text-anchor="middle" font-size="16" fill="currentColor">…</text>
  <rect x="312" y="40" width="24" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="312" y="40" width="24" height="40" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="324.0" y="63.9" text-anchor="middle" font-size="11" fill="currentColor">L</text>
  <line x1="336.0" y1="60.0" x2="349.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-km)"/>
  <rect x="352" y="40" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="352" y="40" width="70" height="40" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="387.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">Sₖ</text>
  <text x="387.0" y="30.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">stage k</text>
  <line x1="422.0" y1="60.0" x2="435.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-km)"/>
  <rect x="438" y="40" width="24" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="438" y="40" width="24" height="40" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="450.0" y="63.9" text-anchor="middle" font-size="11" fill="currentColor">L</text>
  <line x1="10.0" y1="105.0" x2="462.0" y2="105.0" stroke="currentColor" stroke-width="1.2"/>
  <text x="10.0" y="120.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">clock</text>
  <line x1="32.0" y1="105.0" x2="32.0" y2="83.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-km)"/>
  <line x1="158.0" y1="105.0" x2="158.0" y2="83.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-km)"/>
  <line x1="324.0" y1="105.0" x2="324.0" y2="83.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-km)"/>
  <line x1="450.0" y1="105.0" x2="450.0" y2="83.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-km)"/>
</svg>
<figcaption>Model of a synchronous $k$-stage pipeline. The stages are combinational circuits, and the latches (master–slave flip-flops) isolate the inputs from the outputs. When the clock is applied, all latches transfer data to the next stage simultaneously.</figcaption>
</figure>

Let $t_i$ be the delay of stage $S_i$ and $d_L$ the delay of a latch. The clock period is set by the slowest stage:

$$\tau = \tau_m + d_L, \qquad \tau_m = \max_i t_i, \qquad f = \frac{1}{\tau}$$

The minimum clock period must satisfy

$$\tau \ge t_{\text{skew} + \text{jitter}} + t_{\text{logic} + \text{setup}}$$

- **Skew:** the maximum delay difference between the arrival of the clock at different latches.
- **Jitter:** the maximum delay difference between the arrival of the clock at the same latch.
- **Logic delay:** the maximum delay of the slowest stage.
- **Setup time:** the minimum time a signal must be stable at the input of a latch before it can be captured.

For $N$ tasks, ignoring the latch overheads:

$$T_k = [k + (N - 1)]\,\tau, \qquad T_1 = N k \tau$$

$$\text{speedup } S_k = \frac{N k}{k + N - 1}, \qquad \text{efficiency } E_k = \frac{S_k}{k} = \frac{N}{k + N - 1}, \qquad \text{throughput } H_k = \frac{N}{[k + N - 1]\,\tau}$$

<div class="example">

A 4-stage pipeline has stage delays 60, 50, 90 and 80 ns, and a latch delay of 10 ns. Find the speedup over a non-pipelined unit for 1000 tasks.

</div>

The clock period is $\tau = 90 + 10 = 100$ ns, and the non-pipelined unit takes $60 + 50 + 90 + 80 = 280$ ns per task.

$$\text{Speedup} = \frac{1000 \times 280}{(4 + 999) \times 100} = \frac{280\,000}{100\,300} \approx 2.79$$

For large $N$ the speedup tends to $280/100 = 2.8$, not 4, because the stages are not balanced.

<div class="example">

A non-pipelined processor X has a clock of 250 MHz and CPI 4. Processor Y has a 5-stage pipeline, but because of latch delay and clock skew its clock is 200 MHz. For a program of 5000 instructions, find the speedup of Y over X and the MIPS rate of each.

</div>

$T_X = 5000 \times 4 / 250\text{ MHz} = 80\ \mu$s and $T_Y = (5 + 4999)/200\text{ MHz} = 25.02\ \mu$s, so the speedup is $80/25.02 = 3.2$. The MIPS rates are $250/4 = 62.5$ for X and $5000/25.02\ \mu\text{s} \approx 200$ for Y.

### Types of Pipelines

The five-stage pipeline is linear, and every instruction passes through each stage once. Pipelines in general differ in four ways:

- **Degree of overlap:** serial (the next operation starts after the previous one finishes), overlapped, or pipelined (fine-grain overlap).
- **Depth:** a shallow pipeline has few stages, each more complex; a deep pipeline has many stages, each simpler.
- **Structure:** in a linear pipeline the stages are executed in sequence; in a non-linear pipeline a stage may be used more than once for a data set (feedforward and feedback connections).
- **Scheduling:** a static pipeline executes the same sequence of stages for all data, and if one stalls all later ones are delayed; a dynamic pipeline can be reconfigured to perform different functions at different times.

<figure class="fig">
<svg viewBox="0 0 600 128" width="600" role="img" aria-label="Linear and non-linear pipeline structures">
  <defs><marker id="arr-ln" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-lnr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="20" y="40" width="54" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="47.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">A</text>
  <line x1="74.0" y1="60.0" x2="107.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-ln)"/>
  <rect x="110" y="40" width="54" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="137.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">B</text>
  <line x1="164.0" y1="60.0" x2="197.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-ln)"/>
  <rect x="200" y="40" width="54" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="227.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">C</text>
  <line x1="4.0" y1="60.0" x2="17.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-ln)"/>
  <line x1="254.0" y1="60.0" x2="270.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-ln)"/>
  <text x="145.0" y="108.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(a) linear: A → B → C</text>
  <rect x="330" y="40" width="54" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="357.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">A</text>
  <line x1="384.0" y1="60.0" x2="417.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-ln)"/>
  <rect x="420" y="40" width="54" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="447.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">B</text>
  <line x1="474.0" y1="60.0" x2="507.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-ln)"/>
  <rect x="510" y="40" width="54" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="537.0" y="64.5" text-anchor="middle" font-size="13" fill="currentColor">C</text>
  <polyline points="537.0,40.0 537.0,22.0 447.0,22.0 447.0,37.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ln)"/>
  <polyline points="537.0,80.0 537.0,96.0 357.0,96.0 357.0,83.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ln)"/>
  <polyline points="384.0,50.0 402.0,50.0 402.0,14.0 530.0,14.0 530.0,37.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ln)"/>
  <text x="447.0" y="120.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(b) non-linear, e.g. A, B, C, B, C, A, C, A</text>
</svg>
<figcaption>Linear and non-linear pipelines.</figcaption>
</figure>

### Reservation Tables

<div class="definition">

A *reservation table* represents the utilization pattern of the stages of a synchronous pipeline: time steps on the $x$-axis and stages on the $y$-axis. The number of columns is the evaluation time.

</div>

For a linear pipeline the table is a diagonal. For a non-linear pipeline with stages A, B, C and two functions X and Y:

<figure class="table">
<figcaption>Reservation table for X (8 time steps).</figcaption>

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| A | X | | | | | X | | X |
| B | | X | | X | | | | |
| C | | | X | | X | | X | |

</figure>

<figure class="table">
<figcaption>Reservation table for Y (6 time steps).</figcaption>

| | 1 | 2 | 3 | 4 | 5 | 6 |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| A | Y | | | | Y | |
| B | | | Y | | | |
| C | | Y | | Y | | Y |

</figure>

- Multiple X's in a row: repeated use of the same stage in different cycles.
- Continuous X's in a row: extended use of a stage over more than one cycle.
- Multiple X's in a column: several stages used in parallel during a clock cycle.

#### Pipeline Scheduling

The number of time units between two initiations is the **latency**. If two initiations try to use the same stage at the same time, there is a **collision**, and the latencies that cause a collision are **forbidden latencies**: the distances between two marks in the same row.

- X: row A gives 5, 7 and 2, row B gives 2, row C gives 2 and 4. Forbidden latencies $\{2, 4, 5, 7\}$.
- Y: row A gives 4, row C gives 2 and 4. Forbidden latencies $\{2, 4\}$.

The **collision vector** is $C = (C_m \dots C_2 C_1)$, where $C_i = 1$ if latency $i$ is forbidden and $m$ is the largest forbidden latency. Here $C_X = (1011010)$ and $C_Y = (1010)$.

From the collision vector a state diagram is constructed. The initial state is the collision vector. A latency $p$ is permitted if $C_p = 0$, and the next state is obtained by shifting the present state $p$ bits to the right and ORing it with the initial collision vector. A latency greater than $m$ returns to the initial state.

<figure class="fig">
<svg viewBox="0 0 440 210" width="440" role="img" aria-label="State diagram for the collision vector 1010">
  <defs><marker id="arr-sd" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-sdr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <ellipse cx="100" cy="110" rx="40" ry="18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="114.0" text-anchor="middle" font-size="12" fill="currentColor">1010</text>
  <ellipse cx="340" cy="45" rx="40" ry="18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="340.0" y="49.0" text-anchor="middle" font-size="12" fill="currentColor">1111</text>
  <ellipse cx="340" cy="175" rx="40" ry="18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="340.0" y="179.0" text-anchor="middle" font-size="12" fill="currentColor">1011</text>
  <path d="M128,97 Q220,30 298,40" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#arr-sd)"/>
  <text x="210.0" y="34.0" text-anchor="middle" font-size="11" fill="#ef4444">1</text>
  <path d="M302,58 Q230,95 142,108" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#arr-sd)"/>
  <text x="236.0" y="104.0" text-anchor="middle" font-size="11" fill="#ef4444">5+</text>
  <path d="M128,123 Q220,190 298,180" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#arr-sd)"/>
  <text x="210.0" y="196.0" text-anchor="middle" font-size="11" fill="#ef4444">3</text>
  <path d="M302,162 Q230,125 142,114" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#arr-sd)"/>
  <text x="236.0" y="126.0" text-anchor="middle" font-size="11" fill="#ef4444">5+</text>
  <path d="M64,102 C 20,70 20,150 64,118" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sd)"/>
  <text x="16.0" y="114.0" text-anchor="end" font-size="11" fill="#ef4444">5+</text>
  <path d="M378,167 C 420,140 420,210 378,183" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sd)"/>
  <text x="422.0" y="179.0" text-anchor="start" font-size="11" fill="#ef4444">3</text>
  <text x="100.0" y="146.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">initial state</text>
</svg>
<figcaption>State diagram for Y, with $C_Y = (1010)$. Each arrow is labelled in red with the permitted latency that causes the transition; 5+ is any latency of 5 or more.</figcaption>
</figure>

- A **latency cycle** is a latency sequence that repeats. In a **simple cycle** each state appears only once. A **greedy cycle** is formed by taking the minimum permitted latency from each state.
- Y: simple cycles (3), (5), (1, 5), (3, 5); greedy cycles (3) and (1, 5).
- X: simple cycles (3), (6), (8), (1, 8), (3, 8), (6, 8); greedy cycles (3) and (1, 8).

The **minimum average latency (MAL)** is 3 for both X and Y.

Scheduling algorithm: the collision vector is loaded into a shift register $R$. If the LSB (least significant bit) of $R$ is 1, no operation is initiated and $R$ is shifted right by one. Otherwise an operation is initiated, $R$ is shifted right by one and ORed with the original collision vector. Inserting non-compute delay stages into the pipeline changes the reservation table and may give a smaller MAL.

### Arithmetic Pipelines

- **Pipelined ripple-carry adder:** latches are placed between the full adders. If a latch is about as slow as a full adder, the clock period is $T \ge t_{FA} + t_L$, and after the pipeline is full one sum is produced every $T$. This suits vector operations such as `a[i] = b[i] + c[i]`.
- **Floating-point addition:** compare the exponents, align the mantissas, add the mantissas, normalize the result (and round, for IEEE 754). For example, $0.9504 \times 10^3 + 0.8200 \times 10^2$: align to $0.0820$, add to get $1.0324$, normalize to $0.10324 \times 10^4$.
- **Floating-point multiplication:** add the exponents, multiply the mantissas, normalize, round.

An adder and a multiplier can be combined into one multifunction pipeline, scheduled with reservation tables.

## Instruction Pipelining in MIPS32

### The Five-Stage Pipeline

Each of the five steps IF, ID, EX, MEM and WB becomes a pipeline stage, each stage finishes in one clock cycle, and a new instruction is started every cycle.

<figure class="fig">
<svg viewBox="0 0 524 128" width="524" role="img" aria-label="The five MIPS32 pipeline stages separated by the IF/ID, ID/EX, EX/MEM and MEM/WB latches">
  <defs><marker id="arr-mp2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-mpr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="10" y="30" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="10" y="30" width="80" height="50" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="50.0" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">IF</text>
  <text x="50.0" y="98.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">instruction</text>
  <text x="50.0" y="111.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">fetch</text>
  <rect x="98" y="24" width="10" height="62" fill="currentColor" opacity=".55"/>
  <text x="103.0" y="16.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">IF/ID</text>
  <line x1="90.0" y1="55.0" x2="97.0" y2="55.0" stroke="currentColor" stroke-width="1.2"/>
  <line x1="108.0" y1="55.0" x2="115.0" y2="55.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-mp2)"/>
  <rect x="116" y="30" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="116" y="30" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="156.0" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">ID</text>
  <text x="156.0" y="98.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">decode,</text>
  <text x="156.0" y="111.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">register read</text>
  <rect x="204" y="24" width="10" height="62" fill="currentColor" opacity=".55"/>
  <text x="209.0" y="16.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">ID/EX</text>
  <line x1="196.0" y1="55.0" x2="203.0" y2="55.0" stroke="currentColor" stroke-width="1.2"/>
  <line x1="214.0" y1="55.0" x2="221.0" y2="55.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-mp2)"/>
  <rect x="222" y="30" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="222" y="30" width="80" height="50" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="262.0" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">EX</text>
  <text x="262.0" y="98.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">ALU / address</text>
  <rect x="310" y="24" width="10" height="62" fill="currentColor" opacity=".55"/>
  <text x="315.0" y="16.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">EX/MEM</text>
  <line x1="302.0" y1="55.0" x2="309.0" y2="55.0" stroke="currentColor" stroke-width="1.2"/>
  <line x1="320.0" y1="55.0" x2="327.0" y2="55.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-mp2)"/>
  <rect x="328" y="30" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="328" y="30" width="80" height="50" rx="3" fill="#a855f7" opacity=".18"/>
  <text x="368.0" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">MEM</text>
  <text x="368.0" y="98.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">data memory</text>
  <rect x="416" y="24" width="10" height="62" fill="currentColor" opacity=".55"/>
  <text x="421.0" y="16.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">MEM/WB</text>
  <line x1="408.0" y1="55.0" x2="415.0" y2="55.0" stroke="currentColor" stroke-width="1.2"/>
  <line x1="426.0" y1="55.0" x2="433.0" y2="55.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-mp2)"/>
  <rect x="434" y="30" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="434" y="30" width="80" height="50" rx="3" fill="#ef4444" opacity=".18"/>
  <text x="474.0" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">WB</text>
  <text x="474.0" y="98.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">register</text>
  <text x="474.0" y="111.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">write</text>
</svg>
<figcaption>The MIPS32 pipeline. The temporary registers of the datapath are part of the latches between stages; for example, ID/EX.A is register A in the ID/EX latch.</figcaption>
</figure>

<figure class="table">
<figcaption>Micro-operations of the pipeline stages.</figcaption>
<table>
<thead><tr><th>Stage</th><th>Instruction</th><th>Micro-operations</th></tr></thead>
<tbody>
<tr><td class="grp">IF</td><td>all</td><td>IF/ID.IR ← Mem[PC]<br>IF/ID.NPC, PC ← (taken branch ? EX/MEM.ALUOut : PC + 4)</td></tr>
<tr><td class="grp">ID</td><td>all</td><td>ID/EX.A ← Reg[rs]<br>ID/EX.B ← Reg[rt]<br>ID/EX.Imm ← sign-extend(IR₁₅..₀)</td></tr>
<tr><td rowspan="4" class="grp">EX</td><td>R–R ALU</td><td>EX/MEM.ALUOut ← A func B</td></tr>
<tr><td>R–Imm ALU</td><td>EX/MEM.ALUOut ← A func Imm</td></tr>
<tr><td>load / store</td><td>EX/MEM.ALUOut ← A + Imm<br>EX/MEM.B ← ID/EX.B</td></tr>
<tr><td>branch</td><td>EX/MEM.ALUOut ← NPC + (Imm ≪ 2)<br>EX/MEM.cond ← (A == 0)</td></tr>
<tr><td rowspan="3" class="grp">MEM</td><td>ALU</td><td>MEM/WB.ALUOut ← EX/MEM.ALUOut</td></tr>
<tr><td>load</td><td>MEM/WB.LMD ← Mem[ALUOut]</td></tr>
<tr><td>store</td><td>Mem[ALUOut] ← B</td></tr>
<tr><td rowspan="3" class="grp">WB</td><td>R–R ALU</td><td>Reg[rd] ← MEM/WB.ALUOut</td></tr>
<tr><td>R–Imm ALU</td><td>Reg[rt] ← MEM/WB.ALUOut</td></tr>
<tr><td>load</td><td>Reg[rt] ← MEM/WB.LMD</td></tr>
</tbody>
</table>
</figure>

Without pipelining, $n$ instructions take $5Tn$; with pipelining they take $(4 + n)(T + \Delta)$, where $\Delta$ is the latch delay. The ideal speedup is about 5.

Requirements of the pipeline:

- An instruction is fetched every cycle, and there can be two memory accesses in a cycle (IF of one instruction, MEM of another). So the peak memory bandwidth is 5 times that of the non-pipelined version, and separate instruction and data caches are used.
- ID needs 2 register reads and WB needs 1 register write in every cycle. The register file has two read ports, and in MIPS32 the write is done in the first half of the cycle and the reads in the second half.
- PC is incremented in IF every cycle (in the non-pipelined version it is updated in MEM).

The latches increase the execution time of an individual instruction, but the throughput increases.

<div class="example">

A MIPS32 processor runs at 1 GHz. Without pipelining, ALU operations and branches take 4 cycles and memory operations 5 cycles, with frequencies 50%, 15% and 35%. In the pipelined version, clock skew and setup time increase the clock cycle by 0.25 ns. Find the speedup.

</div>

Non-pipelined: $1\text{ ns} \times (0.5 \times 4 + 0.15 \times 4 + 0.35 \times 5) = 4.35$ ns per instruction. Pipelined: one instruction every $1.25$ ns. Speedup $= 4.35/1.25 = 3.48$.

### Pipeline Hazards

<div class="definition">

A *hazard* is a situation that prevents an instruction from executing in its designated clock cycle. There are three types:

- **structural hazards**, due to resource conflicts;
- **data hazards**, due to data dependences between instructions;
- **control hazards**, due to branches and other instructions that change the PC.

</div>

A hazard can be avoided with additional hardware, or by inserting stall cycles. When an instruction is stalled, all the instructions after it are also stalled; the instructions before it continue, and no new instruction is fetched during the stall.

$$\text{Speedup} = \frac{C_{\text{nopipe}}}{C_{\text{pipe}}} \times \frac{\text{ideal CPI} \times \text{pipeline depth}}{\text{ideal CPI} + \text{stall cycles per instruction}}$$

With ideal CPI 1 and the same clock cycle time:

$$\text{Speedup} = \frac{\text{pipeline depth}}{1 + \text{stall cycles per instruction}}$$

#### Structural Hazards

Structural hazards arise when the hardware cannot support all combinations of overlapped instructions. Examples:

- a single memory for instructions and data: one instruction is fetched while another reads or writes data;
- a register read in ID while another instruction writes a register in WB;
- a functional unit (such as a floating-point multiplier) that is not fully pipelined.

<figure class="fig">
<svg viewBox="0 0 590 170" width="590" role="img" aria-label="Structural hazard: the fourth instruction's fetch conflicts with the load's memory access">
  <defs><marker id="arr-pstruct" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-pstructr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <text x="143.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="189.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="235.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="281.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4</text>
  <text x="327.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">5</text>
  <text x="373.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">6</text>
  <text x="419.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">7</text>
  <text x="465.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">8</text>
  <text x="511.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9</text>
  <text x="557.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">10</text>
  <text x="112.0" y="18.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">cycle</text>
  <text x="110.0" y="47.0" text-anchor="end" font-size="11" fill="currentColor">LW R1,10(R2)</text>
  <rect x="121" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="121" y="32" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="143.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="167" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="32" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="189.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="213" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="32" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="235.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="259" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="32" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <rect x="259" y="32" width="44" height="22" rx="2" stroke="#ef4444" stroke-width="2.4" fill="none"/>
  <text x="281.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="305" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="32" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="327.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="73.0" text-anchor="end" font-size="11" fill="currentColor">ADD R3,R4,R5</text>
  <rect x="167" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="58" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="189.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="213" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="58" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="235.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="259" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="58" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="281.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="305" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="58" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="327.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="351" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="58" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="373.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="99.0" text-anchor="end" font-size="11" fill="currentColor">SUB R10,R2,R9</text>
  <rect x="213" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="84" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="235.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="259" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="84" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="281.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="305" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="84" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="327.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="351" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="84" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="373.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="397" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="84" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="419.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="125.0" text-anchor="end" font-size="11" fill="currentColor">AND R5,R7,R7</text>
  <rect x="259" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity=".7"/>
  <text x="281.0" y="125.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">stall</text>
  <rect x="305" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="110" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="327.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="351" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="110" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="373.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="397" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="110" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="419.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="443" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="110" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="465.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="489" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="489" y="110" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="511.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="151.0" text-anchor="end" font-size="11" fill="currentColor">ADD R2,R1,R5</text>
  <rect x="305" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity=".7"/>
  <text x="327.0" y="151.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">stall</text>
  <rect x="351" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="136" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="373.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="397" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="136" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="419.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="443" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="136" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="465.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="489" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="489" y="136" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="511.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="535" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="535" y="136" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="557.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
</svg>
<figcaption>Structural hazard with a single-port memory: the fetch of the fourth instruction conflicts with the MEM of the load (red), so a stall is inserted.</figcaption>
</figure>

<div class="example">

Data references are 35% of the instructions and the ideal CPI is 1.3. How much faster is the machine without the memory structural hazard?

</div>

$$\frac{\text{Speedup}_{\text{ideal}}}{\text{Speedup}_{\text{real}}} = \frac{1.3 + 0.35 \times 1}{1.3} = 1.27$$

Structural hazards are allowed in real machines to reduce cost, when they are infrequent. The memory hazard is frequent, because IF accesses memory in every cycle and every load or store accesses it again in MEM. So the small, fast memory next to the processor, the **cache** (see [Memory Hierarchy and Cache Memory](#memory-hierarchy-and-cache-memory)), is split at the first level into separate instruction and data caches, and the two stages no longer compete.

#### Data Hazards

Data hazards arise from data dependences between instructions in the pipeline. In `ADD R2,R5,R8` followed by `SUB R9,R2,R6`, ADD writes R2 in WB (cycle 5) but SUB reads R2 in ID (cycle 3). Without forwarding, SUB must stall until R2 is written: 2 cycles with the split register access above (ID in cycle 5, reading the value written in the first half of that cycle), or 3 cycles without it (ID in cycle 6). Two methods are used together to reduce the stalls:

1. **Data forwarding (bypassing):** the result is in a pipeline register (e.g. EX/MEM.ALUOut) as soon as it is computed. Additional paths with multiplexers forward it to the ALU input of the instruction that needs it; the control unit detects the dependence and selects the path.
2. **Splitting the register access** (the write in the first half of the cycle and the reads in the second half, as in the five-stage pipeline above), which removes the hazard between an instruction and the third instruction after it.

<figure class="fig">
<svg viewBox="0 0 544 170" width="544" role="img" aria-label="Forwarding the ALU result of ADD to the following instructions">
  <defs><marker id="arr-pfwd" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-pfwdr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <text x="143.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="189.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="235.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="281.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4</text>
  <text x="327.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">5</text>
  <text x="373.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">6</text>
  <text x="419.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">7</text>
  <text x="465.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">8</text>
  <text x="511.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9</text>
  <text x="112.0" y="18.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">cycle</text>
  <text x="110.0" y="47.0" text-anchor="end" font-size="11" fill="currentColor">ADD R4,R5,R6</text>
  <rect x="121" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="121" y="32" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="143.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="167" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="32" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="189.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="213" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="32" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <rect x="213" y="32" width="44" height="22" rx="2" stroke="#ef4444" stroke-width="2.4" fill="none"/>
  <text x="235.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="259" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="32" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="281.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="305" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="32" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="327.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="73.0" text-anchor="end" font-size="11" fill="currentColor">SUB R3,R4,R8</text>
  <rect x="167" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="58" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="189.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="213" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="58" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="235.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="259" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="58" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="281.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="305" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="58" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="327.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="351" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="58" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="373.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="99.0" text-anchor="end" font-size="11" fill="currentColor">ADD R7,R2,R4</text>
  <rect x="213" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="84" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="235.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="259" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="84" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="281.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="305" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="84" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="327.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="351" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="84" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="373.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="397" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="84" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="419.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="125.0" text-anchor="end" font-size="11" fill="currentColor">AND R9,R4,R10</text>
  <rect x="259" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="110" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="281.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="305" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="110" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="327.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="351" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="110" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="373.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="397" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="110" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="419.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="443" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="110" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="465.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="151.0" text-anchor="end" font-size="11" fill="currentColor">OR R11,R4,R5</text>
  <rect x="305" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="136" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="327.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="351" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="136" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="373.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="397" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="136" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="419.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="443" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="136" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="465.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="489" y="136" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="489" y="136" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="511.0" y="151.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <path d="M249.0,53.0 C249.0,69.0 254.0,69.0 260.0,69.0" style="stroke: var(--theme, #fff)" stroke-width="6" fill="none"/>
  <path d="M249.0,53.0 C249.0,69.0 254.0,69.0 260.0,69.0" stroke="#ef4444" stroke-width="2.2" fill="none" marker-end="url(#arr-pfwdr)"/>
  <path d="M295.0,53.0 C295.0,95.0 300.0,95.0 306.0,95.0" style="stroke: var(--theme, #fff)" stroke-width="6" fill="none"/>
  <path d="M295.0,53.0 C295.0,95.0 300.0,95.0 306.0,95.0" stroke="#ef4444" stroke-width="2.2" fill="none" marker-end="url(#arr-pfwdr)"/>
</svg>
<figcaption>ADD computes R4 in EX (red), and the result is forwarded to SUB and the second ADD. AND reads R4 in the cycle in which ADD writes it, so the split register access removes that hazard. OR is not affected.</figcaption>
</figure>

In MIPS32, memory references are always kept in order, so there are no data hazards between memory references: `SW R2,100(R5)` followed by `LW R10,100(R5)` is executed correctly. Cache misses can still cause stalls.

A load followed by an instruction that uses the loaded value causes a hazard that forwarding cannot remove: the data is available only at the end of MEM, and the next instruction needs it at the start of EX. The hardware (a **pipeline interlock**) detects the hazard in ID and stalls the instruction for one cycle before it is **issued**, i.e. moved from ID to EX.

<figure class="fig">
<svg viewBox="0 0 544 144" width="544" role="img" aria-label="Load-use hazard: one stall even with forwarding">
  <defs><marker id="arr-ploaduse" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-ploaduser" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <text x="143.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="189.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="235.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="281.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4</text>
  <text x="327.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">5</text>
  <text x="373.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">6</text>
  <text x="419.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">7</text>
  <text x="465.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">8</text>
  <text x="511.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9</text>
  <text x="112.0" y="18.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">cycle</text>
  <text x="110.0" y="47.0" text-anchor="end" font-size="11" fill="currentColor">LW R4,100(R5)</text>
  <rect x="121" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="121" y="32" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="143.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="167" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="32" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="189.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="213" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="32" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="235.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="259" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="32" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <rect x="259" y="32" width="44" height="22" rx="2" stroke="#ef4444" stroke-width="2.4" fill="none"/>
  <text x="281.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="305" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="32" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="327.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="73.0" text-anchor="end" font-size="11" fill="currentColor">SUB R3,R4,R8</text>
  <rect x="167" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="58" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="189.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="213" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="58" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="235.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="259" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity=".7"/>
  <text x="281.0" y="73.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">stall</text>
  <rect x="305" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="58" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="327.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="351" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="58" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="373.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="397" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="58" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="419.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="99.0" text-anchor="end" font-size="11" fill="currentColor">ADD R7,R2,R4</text>
  <rect x="213" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="84" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="235.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="259" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity=".7"/>
  <text x="281.0" y="99.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">stall</text>
  <rect x="305" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="84" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="327.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="351" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="84" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="373.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="397" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="84" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="419.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="443" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="84" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="465.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="125.0" text-anchor="end" font-size="11" fill="currentColor">AND R9,R4,R10</text>
  <rect x="259" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity=".7"/>
  <text x="281.0" y="125.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">stall</text>
  <rect x="305" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="110" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="327.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="351" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="110" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="373.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="397" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="110" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="419.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="443" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="110" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="465.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="489" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="489" y="110" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="511.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <path d="M295.0,53.0 C295.0,69.0 300.0,69.0 306.0,69.0" style="stroke: var(--theme, #fff)" stroke-width="6" fill="none"/>
  <path d="M295.0,53.0 C295.0,69.0 300.0,69.0 306.0,69.0" stroke="#ef4444" stroke-width="2.2" fill="none" marker-end="url(#arr-ploaduser)"/>
</svg>
<figcaption>A load followed by a use of the loaded data: one stall cycle, and then forwarding from MEM.</figcaption>
</figure>

The compiler tries to avoid a load followed by an immediate use (**instruction scheduling**). The slot after a load is the **load delay slot**; if the compiler cannot fill it with an independent instruction, it inserts a NOP (no-operation instruction).

<div class="code-pair">

```text
; x = a - b; y = c + d
LW  R1, a
LW  R2, b
SUB R8, R1, R2   ; stall
SW  R8, x
LW  R1, c
LW  R2, d
ADD R9, R1, R2   ; stall
SW  R9, y
```

```text
; scheduled: no stalls
LW  R1, a
LW  R2, b
LW  R3, c
SUB R8, R1, R2
LW  R4, d
SW  R8, x
ADD R9, R3, R4
SW  R9, y
```

</div>

The scheduled code uses two more registers (R3, R4) and has no load interlocks.

### Dependences and Types of Data Hazards

Dependences are a property of the program. Whether a dependence results in a hazard, and whether the hazard causes a stall, are properties of the pipeline. For instructions $i$ and $j$, with $i$ before $j$ in program order:

- **Data dependence (true dependence):** $j$ uses a result produced by $i$, directly or through a chain of instructions. A value is transmitted from $i$ to $j$, so the order must be preserved.
- **Name dependence:** $i$ and $j$ use the same register or memory location (a name), but no value is transmitted between them through it. Since there is no flow of data, these are also called **false dependences**.
  - **Antidependence:** $j$ writes a name that $i$ reads. The order must be preserved so that $i$ reads the correct (old) value.
  - **Output dependence:** $i$ and $j$ write the same name. The order must be preserved so that the final value is the one written by $j$.
- **Control dependence:** whether $j$ is executed depends on a branch.


A name dependence can be removed by changing the name (register or memory location) used by one of the instructions, so that they no longer conflict. For registers this is **register renaming**, done statically by the compiler or dynamically by the hardware. A true dependence cannot be removed by renaming.

The data hazards are named by the order that must be preserved:

<figure class="table">
<figcaption>Types of data hazards ($i$ before $j$).</figcaption>

| Hazard | Problem | Dependence | Removed by renaming |
|:--|:--|:--|:-:|
| RAW (read after write) | $j$ reads a source before $i$ writes it | true | no |
| WAR (write after read) | $j$ writes a destination before $i$ reads it | anti (name) | yes |
| WAW (write after write) | $j$ writes an operand before $i$ writes it | output (name) | yes |

</figure>

RAR (read after read) is not a hazard.

```text
DIV.D  F0, F2, F4
ADD.D  F6, F0, F8      ; RAW on F0 with DIV.D
S.D    F6, 0(R1)       ; RAW on F6 with ADD.D
SUB.D  F8, F10, F14    ; WAR on F8 with ADD.D
MUL.D  F6, F10, F8     ; WAW on F6 with ADD.D, WAR on F6 with S.D,
                       ; RAW on F8 with SUB.D
```

If the destination of `SUB.D` is renamed to `T` and that of `MUL.D` to `S` (with their later uses), the WAR and WAW hazards are removed and only the RAW dependences remain.

In the MIPS32 integer pipeline only RAW hazards are possible. All reads are done early (in ID), all writes late (in WB), and instructions complete in order, so WAR and WAW cannot occur. Of the RAW hazards, only a load followed by an immediate use causes a stall (as long as branches are resolved in EX or later; see Control Hazards below for branches resolved in ID). WAW hazards are possible in pipelines where writes can happen in more than one stage (such as the multicycle floating-point pipeline below), and WAR hazards when instructions are reordered.

### Control Hazards

Control hazards are caused by branches. If the branch is taken, the PC changes to a value other than PC + 4, and in the basic pipeline the PC is not updated until the end of MEM. The next instruction can be fetched only after that, so 3 cycles are lost. With 30% branches and ideal CPI 1, $CPI = 0.7 \times 1 + 0.3 \times 4 = 1.9$.

In MIPS32 a branch only tests a register for zero or compares two registers. With additional logic the outcome is known by the end of ID, and a separate adder computes the target address, so the penalty is one cycle.

<figure class="fig">
<svg viewBox="0 0 544 144" width="544" role="img" aria-label="Branch resolved in ID: the instruction after the branch is fetched again, one cycle lost">
  <defs><marker id="arr-pbranch" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-pbranchr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <text x="143.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="189.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="235.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="281.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4</text>
  <text x="327.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">5</text>
  <text x="373.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">6</text>
  <text x="419.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">7</text>
  <text x="465.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">8</text>
  <text x="511.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9</text>
  <text x="112.0" y="18.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">cycle</text>
  <text x="110.0" y="47.0" text-anchor="end" font-size="11" fill="currentColor">BEQ R1,R2,L</text>
  <rect x="121" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="121" y="32" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="143.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="167" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="32" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="189.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="213" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="32" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="235.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="259" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="32" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="281.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="305" y="32" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="32" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="327.0" y="47.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="73.0" text-anchor="end" font-size="11" fill="currentColor">i + 1</text>
  <rect x="167" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="167" y="58" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="189.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="213" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="213" y="58" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="235.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="259" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="58" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="281.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="305" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="58" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="327.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="351" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="58" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="373.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="397" y="58" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="58" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="419.0" y="73.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="99.0" text-anchor="end" font-size="11" fill="currentColor">i + 2</text>
  <rect x="213" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity=".7"/>
  <text x="235.0" y="99.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">stall</text>
  <rect x="259" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="259" y="84" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="281.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="305" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="84" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="327.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="351" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="84" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="373.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="397" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="84" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="419.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="443" y="84" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="84" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="465.0" y="99.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
  <text x="110.0" y="125.0" text-anchor="end" font-size="11" fill="currentColor">i + 3</text>
  <rect x="259" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity=".7"/>
  <text x="281.0" y="125.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">stall</text>
  <rect x="305" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="305" y="110" width="44" height="22" rx="2" fill="#3b82f6" opacity=".18"/>
  <text x="327.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">IF</text>
  <rect x="351" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="351" y="110" width="44" height="22" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="373.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">ID</text>
  <rect x="397" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="397" y="110" width="44" height="22" rx="2" fill="#f59e0b" opacity=".18"/>
  <text x="419.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">EX</text>
  <rect x="443" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="443" y="110" width="44" height="22" rx="2" fill="#a855f7" opacity=".18"/>
  <text x="465.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">MEM</text>
  <rect x="489" y="110" width="44" height="22" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <rect x="489" y="110" width="44" height="22" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="511.0" y="125.0" text-anchor="middle" font-size="10" fill="currentColor">WB</text>
</svg>
<figcaption>Branch decided at the end of ID: the instruction after a taken branch is fetched again, with one cycle lost.</figcaption>
</figure>

Deciding the branch in ID creates a new data hazard, since the branch now needs its register operands in ID, one stage earlier than an ALU instruction needs them in EX. An ALU instruction followed by a branch on its result therefore stalls the branch even with forwarding:

- **ALU instruction, then branch:** the result is ready at the end of the ALU instruction's EX, the same cycle in which the branch is in ID, so the branch stalls **1 cycle**.
- **Load, then branch:** the loaded value is ready only at the end of MEM, so the branch stalls **2 cycles**.

Static techniques for reducing the branch penalty:

1. **Stall:** freeze the pipeline and insert one stall cycle.
2. **Predict not taken:** continue as if the branch were not taken, without changing the machine state until the outcome is known. If the branch is taken, the fetched instruction is discarded and the fetch restarts from the target. The penalty is 0 for a not-taken branch and 1 for a taken one.
3. **Predict taken:** fetch from the target as soon as it is known. In MIPS32 the outcome and the target are known at the same time (end of ID), so there is no advantage; it is useful when the target is known before the outcome.
4. **Delayed branch:** the $n$ instructions after a branch (the branch delay slots; $n = 1$ in MIPS32) are always executed, whatever the outcome. The compiler fills the delay slots with useful instructions, from before the branch, from the target, or from the fall-through path. Since the PCs of the delay slots and the target are not sequential, $n + 1$ PCs must be saved on an interrupt.

<div class="example">

Ideal CPI 1, 5 stages, 20% branches of which 75% are taken. Find the speedup for the four techniques, taking an average penalty of 0.5 for the delayed branch.

</div>

$$\text{Speedup} = \frac{5}{1 + \text{branch frequency} \times \text{branch penalty}}$$

- Stall: $5/(1 + 0.2 \times 1) = 4.17$.
- Predict taken: $5/(1 + 0.2 \times 1) = 4.17$.
- Predict not taken: $5/(1 + 0.2 \times 0.75) = 4.35$.
- Delayed branch: $5/(1 + 0.2 \times 0.5) = 4.55$.

#### Dynamic Branch Prediction

- **Branch prediction buffer (BPB):** a small memory indexed by the lower bits of the branch address, holding a bit that says whether the branch was recently taken. The entry may belong to another branch with the same lower address bits. If the prediction is wrong, the bit is inverted. With a 1-bit scheme, a branch that is almost always taken is mispredicted twice when it is not taken. In an inner loop of 20 iterations, the branch is mispredicted on the last iteration and on the first iteration of the next execution, so it is predicted correctly 18 times out of 20 (90%), although it is taken 95% of the time.
- **2-bit prediction:** the prediction changes only after two consecutive mispredictions.

<figure class="fig">
<svg viewBox="0 0 440 214" width="440" role="img" aria-label="Two-bit branch predictor: the prediction changes only after two consecutive mispredictions">
  <defs><marker id="arr-2b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-2br" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <g transform="translate(30,0)">
  <rect x="10" y="28" width="140" height="44" rx="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="10" y="28" width="140" height="44" rx="20" fill="#22c55e" opacity=".18"/>
  <text x="80.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">predict taken</text>
  <text x="80.0" y="63.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(11)</text>
  <rect x="220" y="28" width="140" height="44" rx="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="220" y="28" width="140" height="44" rx="20" fill="#22c55e" opacity=".18"/>
  <text x="290.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">predict taken</text>
  <text x="290.0" y="63.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(10)</text>
  <rect x="10" y="148" width="140" height="44" rx="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="10" y="148" width="140" height="44" rx="20" fill="#ef4444" opacity=".18"/>
  <text x="80.0" y="167.0" text-anchor="middle" font-size="11" fill="currentColor">predict not taken</text>
  <text x="80.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(01)</text>
  <rect x="220" y="148" width="140" height="44" rx="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="220" y="148" width="140" height="44" rx="20" fill="#ef4444" opacity=".18"/>
  <text x="290.0" y="167.0" text-anchor="middle" font-size="11" fill="currentColor">predict not taken</text>
  <text x="290.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(00)</text>
  <line x1="150.0" y1="44.0" x2="220.0" y2="44.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2b)"/>
  <text x="185.0" y="38.0" text-anchor="middle" font-size="10" fill="currentColor">NT</text>
  <line x1="220.0" y1="58.0" x2="150.0" y2="58.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2b)"/>
  <text x="185.0" y="72.0" text-anchor="middle" font-size="10" fill="currentColor">T</text>
  <line x1="150.0" y1="164.0" x2="220.0" y2="164.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2b)"/>
  <text x="185.0" y="158.0" text-anchor="middle" font-size="10" fill="currentColor">NT</text>
  <line x1="220.0" y1="178.0" x2="150.0" y2="178.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2b)"/>
  <text x="185.0" y="192.0" text-anchor="middle" font-size="10" fill="currentColor">T</text>
  <line x1="290.0" y1="72.0" x2="290.0" y2="148.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2b)"/>
  <text x="298.0" y="112.0" text-anchor="start" font-size="10" fill="currentColor">NT</text>
  <line x1="80.0" y1="148.0" x2="80.0" y2="72.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2b)"/>
  <text x="72.0" y="112.0" text-anchor="end" font-size="10" fill="currentColor">T</text>
  <path d="M10,40 C -12,30 -12,70 10,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-2b)"/>
  <text x="4.0" y="28.0" text-anchor="middle" font-size="10" fill="currentColor">T</text>
  <path d="M360,160 C 384,150 384,190 360,180" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-2b)"/>
  <text x="372.0" y="204.0" text-anchor="middle" font-size="10" fill="currentColor">NT</text>
  </g>
</svg>
<figcaption>2-bit prediction scheme (T: taken, NT: not taken).</figcaption>
</figure>

The 2-bit scheme alone does not speed up the MIPS32 pipeline, since the outcome and the target are both known at the end of ID. To avoid the penalty, the next fetch address must be known by the end of IF, before the instruction is decoded.

The **branch target buffer (BTB)** stores the addresses of known branches and the predicted next PC for each. The PC of the instruction being fetched is compared with the addresses in the BTB. If it matches, the instruction is a branch predicted taken, and the predicted PC is used as the next PC; otherwise fetching proceeds normally.

<figure class="table">
<figcaption>Branch penalties with a BTB (Hennessy & Patterson).</figcaption>

| In BTB? | Prediction | Actual | Penalty (cycles) |
|:-:|:-:|:-:|:-:|
| yes | taken | taken | 0 |
| yes | taken | not taken | 2 |
| no | — | taken | 2 |
| no | — | not taken | 0 |

</figure>

With 90% of the branches found in the BTB, 8% of the predictions incorrect and 75% of the branches taken, the branch penalty is $0.9 \times 0.08 \times 2 + 0.1 \times 0.75 \times 2 = 0.29$ cycles.

**Conditional instructions** remove some branches. `if (X == 0) A = B;` can be written as `CMOVZ R2, R3, R1` instead of `BNEZ R1, L; ADDU R2, R3, R0`, which converts the control dependence into a data dependence.

### Multicycle Operations

Floating-point operations need more than one cycle in EX. Using a slower clock would slow down all other operations, so the EX stage is repeated, with several functional units:

<figure class="fig">
<svg viewBox="0 0 570 258" width="570" role="img" aria-label="MIPS32 pipeline with an integer unit, pipelined FP multiplier and adder, and a non-pipelined divider">
  <defs><marker id="arr-mc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-mcr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="10" y="120" width="50" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="10" y="120" width="50" height="34" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="35.0" y="141.2" text-anchor="middle" font-size="12" fill="currentColor">IF</text>
  <rect x="80" y="120" width="50" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="80" y="120" width="50" height="34" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="105.0" y="141.2" text-anchor="middle" font-size="12" fill="currentColor">ID</text>
  <line x1="60.0" y1="137.0" x2="77.0" y2="137.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mc)"/>
  <rect x="430" y="120" width="56" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="430" y="120" width="56" height="34" rx="3" fill="#a855f7" opacity=".18"/>
  <text x="458.0" y="141.2" text-anchor="middle" font-size="12" fill="currentColor">MEM</text>
  <rect x="506" y="120" width="50" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="506" y="120" width="50" height="34" rx="3" fill="#ef4444" opacity=".18"/>
  <text x="531.0" y="141.2" text-anchor="middle" font-size="12" fill="currentColor">WB</text>
  <line x1="486.0" y1="137.0" x2="503.0" y2="137.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mc)"/>
  <rect x="240" y="20" width="60" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="240" y="20" width="60" height="30" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="270.0" y="38.9" text-anchor="middle" font-size="11" fill="currentColor">EX</text>
  <text x="270.0" y="14.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">integer unit</text>
  <rect x="160" y="76" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="160" y="76" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="176.0" y="92.2" text-anchor="middle" font-size="9" fill="currentColor">M1</text>
  <rect x="196" y="76" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="196" y="76" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="212.0" y="92.2" text-anchor="middle" font-size="9" fill="currentColor">M2</text>
  <rect x="232" y="76" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="232" y="76" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="248.0" y="92.2" text-anchor="middle" font-size="9" fill="currentColor">M3</text>
  <rect x="268" y="76" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="268" y="76" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="284.0" y="92.2" text-anchor="middle" font-size="9" fill="currentColor">M4</text>
  <rect x="304" y="76" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="304" y="76" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="320.0" y="92.2" text-anchor="middle" font-size="9" fill="currentColor">M5</text>
  <rect x="340" y="76" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="76" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="356.0" y="92.2" text-anchor="middle" font-size="9" fill="currentColor">M6</text>
  <rect x="376" y="76" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="376" y="76" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="392.0" y="92.2" text-anchor="middle" font-size="9" fill="currentColor">M7</text>
  <text x="296.0" y="116.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">FP / integer multiply (7 stages)</text>
  <rect x="214" y="144" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="214" y="144" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="230.0" y="160.2" text-anchor="middle" font-size="9" fill="currentColor">A1</text>
  <rect x="250" y="144" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="144" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="266.0" y="160.2" text-anchor="middle" font-size="9" fill="currentColor">A2</text>
  <rect x="286" y="144" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="286" y="144" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="302.0" y="160.2" text-anchor="middle" font-size="9" fill="currentColor">A3</text>
  <rect x="322" y="144" width="32" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="322" y="144" width="32" height="26" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="338.0" y="160.2" text-anchor="middle" font-size="9" fill="currentColor">A4</text>
  <text x="286.0" y="184.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">FP add / subtract (4 stages)</text>
  <rect x="230" y="204" width="80" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="230" y="204" width="80" height="30" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="270.0" y="222.8" text-anchor="middle" font-size="11" fill="currentColor">divider</text>
  <text x="270.0" y="248.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">divider (not pipelined)</text>
  <polyline points="130.0,137.0 145.0,137.0 145.0,35.0 237.0,35.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
  <polyline points="300.0,35.0 415.0,35.0 415.0,137.0 427.0,137.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
  <polyline points="130.0,137.0 145.0,137.0 145.0,89.0 157.0,89.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
  <polyline points="412.0,89.0 415.0,89.0 415.0,137.0 427.0,137.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
  <polyline points="130.0,137.0 145.0,137.0 145.0,157.0 211.0,157.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
  <polyline points="358.0,157.0 415.0,157.0 415.0,137.0 427.0,137.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
  <polyline points="130.0,137.0 145.0,137.0 145.0,219.0 227.0,219.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
  <polyline points="310.0,219.0 415.0,219.0 415.0,137.0 427.0,137.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mc)"/>
</svg>
<figcaption>MIPS32 pipeline with floating-point units (after the NPTEL course <a href="#ref-1">[1]</a> and Hennessy & Patterson).</figcaption>
</figure>

- **Latency:** the number of intervening cycles between an instruction that produces a result and an instruction that uses it.
- **Initiation interval** (repeat interval): the number of cycles that must elapse between issuing two operations of the same type.

Note that "latency" here is not the latency of [reservation tables](#reservation-tables), which is the number of time units between two initiations; that quantity corresponds to the initiation interval.

<figure class="table">
<figcaption>Latencies and initiation intervals.</figcaption>

| Functional unit | Latency | Initiation interval |
|:--|:-:|:-:|
| Integer ALU | 0 | 1 |
| Data memory (integer / FP load) | 1 | 1 |
| FP add / subtract | 3 | 1 |
| FP multiply | 6 | 1 |
| FP divide (not pipelined) | 24 | 25 |

</figure>

Up to 4 FP adds, 7 FP multiplies and 1 FP divide can be outstanding. As a result:

- structural hazards occur on the divider, and when several instructions reach MEM or WB in the same cycle (a `MUL.D`, a `SUB.D` issued 3 cycles after it and an `L.D` issued 3 cycles after that all try to write the FP registers in the same cycle);
- RAW hazards cause longer stalls (an `ADD.D` using the result of `MUL.D` waits for M7);
- instructions complete out of order;
- WAW hazards are possible: if that `L.D` writes the same register as the `SUB.D` and is issued one cycle earlier, it writes the register first, and the final value is wrong.

### Instruction-Level Parallelism

**Instruction-level parallelism (ILP)** is the overlap of independent instructions of one program, so that several are in execution at the same time. Unrelated instructions can be overlapped; related instructions must be separated by the latency between them.

<div class="example">

`for (i = 1000; i > 0; i--) x[i] = x[i] + s;` with these latencies, counted as the number of stall cycles needed between producer and consumer (H&P, Fig. 3.2): FP ALU op to FP ALU op 3, FP ALU op to store 2, load to FP ALU op 1, load to store 0; and one cycle of branch delay.

</div>

```text
Loop: L.D    F0, 0(R1)      ; x[i]
      ADD.D  F4, F0, F2     ; + s
      S.D    F4, 0(R1)
      ADDI   R1, R1, #-8
      BNE    R1, R2, Loop
```

- As written: 9 cycles per iteration (1 stall after the load, 2 after ADD.D, 1 for the branch).
- Scheduled: `ADDI` is moved after the load and the store offset changed to `8(R1)`, giving 7 cycles per iteration.
- Unrolled 4 times, with different registers (F0/F4, F6/F8, F10/F12, F14/F16) and one `ADDI` and `BNE`: 14 instructions and 13 stalls, 27 cycles, i.e. 6.8 cycles per element.
- Unrolled and scheduled (four loads, four adds, four stores): no stalls, 14 cycles, 3.5 cycles per element.

**Loop unrolling** replicates the loop body to reduce the loop overhead per iteration and to expose more instructions for scheduling.

With more than one instruction issued per cycle, the CPI can be less than 1:

- **Superscalar:** the hardware issues a small number (2 to 4) of independent instructions per cycle and checks for conflicts; if the instructions are dependent, only the first is issued. Issuing one integer and one FP instruction together needs little extra hardware, since they use different registers and functional units. In this version the next 3 instructions cannot use the result of a load without stalling, and similarly the one-cycle branch delay now covers 3 instructions.
- **VLIW (very long instruction word):** an instruction word of hundreds of bits specifies several operations, each for a different functional unit, sharing one register file. The compiler identifies the operations that can run together. With two memory units, one FP unit and one integer/branch unit, the loop unrolled 4 times takes 9 cycles, i.e. 2.25 cycles per element: the loads issue in cycles 1–2, the four `ADD.D`s in cycles 3–6, and each `S.D` needs 2 cycles between it and its `ADD.D`, so the stores issue in cycles 6–9. (The course slides show 8 cycles, but their schedule leaves only one cycle between each add and its store. Unrolled 7 times, H&P fill 9 cycles with 7 elements, 1.29 cycles per element.)

#### Dynamic Scheduling

In a statically scheduled pipeline, instructions are issued and executed in program order. If an instruction stalls, no later instruction can proceed, even an independent one:

```text
DIV.D  F0, F2, F4
ADD.D  F10, F0, F8     ; waits for DIV.D
SUB.D  F12, F8, F14    ; independent, but stalls behind ADD.D
```

In **dynamic scheduling** the hardware rearranges the order of execution to reduce stalls, while preserving the data flow and the exception behavior. The ID stage is split into two stages:

1. **Issue:** decode the instruction and check for structural hazards. Instructions are issued in program order.
2. **Read operands:** wait until there are no data hazards, then read the operands. Instructions can bypass each other here, so execution is **out of order**, and so is completion.

Out-of-order execution creates WAR and WAW hazards, which cannot occur in the in-order five-stage pipeline:

```text
DIV.D  F0, F2, F4
ADD.D  F6, F0, F8      ; waits for F0
SUB.D  F8, F10, F14    ; WAR on F8 with ADD.D
MUL.D  F6, F10, F8     ; WAW on F6 with ADD.D
```

If `SUB.D` is executed before `ADD.D` reads F8, `ADD.D` gets the wrong value. If `MUL.D` finishes before `ADD.D`, F6 is left with the value of `ADD.D`.

**Scoreboarding** executes an instruction as soon as its operands are available, which avoids RAW hazards. WAR and WAW hazards are handled by stalling: an instruction is not issued if its destination is the destination of an active instruction (WAW), and a result is not written while an earlier instruction still has to read the old value (WAR). The scoreboard is a central table that records the status of every instruction, functional unit and register.

#### Tomasulo's Algorithm

**Tomasulo's algorithm** also waits for the operands to avoid RAW hazards, but it removes WAR and WAW hazards by **register renaming** in hardware. Renaming changes the destination registers so that an out-of-order write does not affect an instruction that needs an earlier value. With two temporary registers S and T, the sequence above becomes

```text
DIV.D  F0, F2, F4
ADD.D  S, F0, F8
SUB.D  T, F10, F14
MUL.D  F6, F10, T
```

and later uses of F8 must refer to T. The compiler can do this inside a basic block. The hardware can do it across branches, and it can use more names than there are architectural registers.

In Tomasulo's scheme the names are the **reservation stations**. A reservation station is a buffer in front of a functional unit. It holds an issued instruction and either the values of its operands, if they are available, or the names of the reservation stations that will produce them. All results are broadcast on the **common data bus (CDB)**, and every reservation station and register waiting for that result loads it at the same time. Hazard detection is distributed among the reservation stations, and results go directly to the waiting units instead of through the registers.

<figure class="fig">
<svg viewBox="0 0 620 330" width="620" role="img" aria-label="Structure of a floating-point unit using Tomasulo's algorithm">
  <defs><marker id="arr-tom" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-tomr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="30" y="20" width="150" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="105.0" y="44.2" text-anchor="middle" font-size="12" fill="currentColor">Instruction queue</text>
  <rect x="400" y="20" width="170" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="485.0" y="44.2" text-anchor="middle" font-size="12" fill="currentColor">FP registers</text>
  <rect x="20" y="120" width="110" height="66" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="20.0" y1="142.0" x2="130.0" y2="142.0" stroke="currentColor" stroke-width="1"/>
  <line x1="20.0" y1="164.0" x2="130.0" y2="164.0" stroke="currentColor" stroke-width="1"/>
  <rect x="150" y="120" width="90" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="150.0" y1="142.0" x2="240.0" y2="142.0" stroke="currentColor" stroke-width="1"/>
  <rect x="30" y="222" width="200" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="244.2" text-anchor="middle" font-size="12" fill="currentColor">Memory unit</text>
  <rect x="270" y="120" width="130" height="66" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="270.0" y1="142.0" x2="400.0" y2="142.0" stroke="currentColor" stroke-width="1"/>
  <line x1="270.0" y1="164.0" x2="400.0" y2="164.0" stroke="currentColor" stroke-width="1"/>
  <rect x="440" y="120" width="130" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="440.0" y1="142.0" x2="570.0" y2="142.0" stroke="currentColor" stroke-width="1"/>
  <rect x="270" y="222" width="130" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="222" width="130" height="36" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="335.0" y="244.2" text-anchor="middle" font-size="12" fill="currentColor">FP adders</text>
  <rect x="440" y="222" width="130" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="222" width="130" height="36" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="505.0" y="244.2" text-anchor="middle" font-size="12" fill="currentColor">FP multipliers</text>
  <text x="335.0" y="135.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Add1</text>
  <text x="335.0" y="157.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Add2</text>
  <text x="335.0" y="179.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Add3</text>
  <text x="505.0" y="135.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Mult1</text>
  <text x="505.0" y="157.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Mult2</text>
  <text x="195.0" y="135.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Store1</text>
  <text x="195.0" y="157.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Store2</text>
  <text x="75.0" y="135.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Load1</text>
  <text x="75.0" y="157.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Load2</text>
  <text x="75.0" y="179.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">Load3</text>
  <line x1="105.0" y1="60.0" x2="105.0" y2="72.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="75.0" y1="72.0" x2="505.0" y2="72.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="75.0" y1="72.0" x2="75.0" y2="118.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="300.0" y1="72.0" x2="300.0" y2="118.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="470.0" y1="72.0" x2="470.0" y2="118.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <text x="250.0" y="68.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">operation bus</text>
  <line x1="485.0" y1="60.0" x2="485.0" y2="88.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="215.0" y1="88.0" x2="540.0" y2="88.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="215.0" y1="88.0" x2="215.0" y2="118.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="370.0" y1="88.0" x2="370.0" y2="118.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="540.0" y1="88.0" x2="540.0" y2="118.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <text x="548.0" y="84.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">operand</text>
  <text x="548.0" y="96.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">buses</text>
  <line x1="335.0" y1="186.0" x2="335.0" y2="220.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="505.0" y1="164.0" x2="505.0" y2="220.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="75.0" y1="186.0" x2="75.0" y2="220.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="195.0" y1="164.0" x2="195.0" y2="220.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-tom)"/>
  <line x1="20.0" y1="300.0" x2="610.0" y2="300.0" stroke="#ef4444" stroke-width="3.5"/>
  <text x="315.0" y="318.0" text-anchor="middle" font-size="11" fill="#ef4444">common data bus (CDB)</text>
  <line x1="130.0" y1="258.0" x2="130.0" y2="297.0" stroke="#ef4444" stroke-width="1.6" marker-end="url(#arr-tomr)"/>
  <line x1="335.0" y1="258.0" x2="335.0" y2="297.0" stroke="#ef4444" stroke-width="1.6" marker-end="url(#arr-tomr)"/>
  <line x1="505.0" y1="258.0" x2="505.0" y2="297.0" stroke="#ef4444" stroke-width="1.6" marker-end="url(#arr-tomr)"/>
  <polyline points="258.0,297.0 258.0,153.0 268.0,153.0" stroke="#ef4444" stroke-width="1.4" fill="none" marker-end="url(#arr-tomr)"/>
  <polyline points="428.0,297.0 428.0,142.0 438.0,142.0" stroke="#ef4444" stroke-width="1.4" fill="none" marker-end="url(#arr-tomr)"/>
  <polyline points="253.0,297.0 253.0,142.0 242.0,142.0" stroke="#ef4444" stroke-width="1.4" fill="none" marker-end="url(#arr-tomr)"/>
  <polyline points="600.0,300.0 600.0,40.0 573.0,40.0" stroke="#ef4444" stroke-width="1.4" fill="none" marker-end="url(#arr-tomr)"/>
</svg>
<figcaption>Floating-point unit using Tomasulo's algorithm (Hennessy & Patterson). Load1–3 are the load buffers, Store1–2 the store buffers, and Add1–3 and Mult1–2 the reservation stations of the FP adders and multipliers. Results from memory and the FP units go on the CDB.</figcaption>
</figure>

<figure class="table">
<figcaption>Fields of a reservation station and of a register.</figcaption>

| Field | Meaning |
|:--|:--|
| Op | operation to perform on the source operands |
| Qj, Qk | reservation stations that will produce the source operands (0: operand available) |
| Vj, Vk | values of the source operands; for each operand only V or Q is valid |
| A | immediate field, then the effective address, of a load or store |
| Busy | the reservation station and its functional unit are occupied |
| Qi (register) | reservation station whose result is to be stored in the register (0: no pending write) |

</figure>

An instruction goes through three steps, each of which can take any number of cycles:

1. **Issue:** take the next instruction from the instruction queue (FIFO). If a reservation station of the right type is free, issue the instruction to it, with the operand values if they are in the registers, or else the names of the stations that will produce them. If no station is free, there is a structural hazard and the instruction stalls. This step renames the registers.
2. **Execute:** if an operand is not available, monitor the CDB for it. When both operands are available, execute the operation. Waiting for the operands avoids RAW hazards. A load or store first computes its effective address, and loads and stores are kept in program order through this step.
3. **Write result:** put the result on the CDB, from where it goes into the registers, the reservation stations and the store buffers waiting for it.

<div class="example">

Show the reservation stations and register status for the following code when only the first load has completed and written its result (Hennessy & Patterson).

```text
1. L.D    F6, 32(R2)
2. L.D    F2, 44(R3)
3. MUL.D  F0, F2, F4
4. SUB.D  F8, F2, F6
5. DIV.D  F10, F0, F6
6. ADD.D  F6, F8, F2
```

</div>

<figure class="table">
<figcaption>Reservation stations (empty fields omitted). Load2 has computed its address and is waiting for memory.</figcaption>

| Name | Busy | Op | Vj | Vk | Qj | Qk | A |
|:--|:-:|:--|:--|:--|:--|:--|:--|
| Load1 | no | | | | | | |
| Load2 | yes | Load | | | | | 44 + Regs[R3] |
| Add1 | yes | SUB | | Mem[32 + Regs[R2]] | Load2 | | |
| Add2 | yes | ADD | | | Add1 | Load2 | |
| Add3 | no | | | | | | |
| Mult1 | yes | MUL | | Regs[F4] | Load2 | | |
| Mult2 | yes | DIV | | Mem[32 + Regs[R2]] | Mult1 | | |

</figure>

<figure class="table">
<figcaption>Register status.</figcaption>

| Register | F0 | F2 | F4 | F6 | F8 | F10 |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|
| Qi | Mult1 | Load2 | | Add2 | Add1 | Mult2 |

</figure>

`DIV.D` already holds the value of F6 from the first load in Vk, so `ADD.D`, which writes F6, can complete before `DIV.D` starts without a WAR hazard. F6 is renamed to Add2: only the last instruction that writes a register updates it.

<figure class="table">
<figcaption>Scoreboarding and Tomasulo's algorithm.</figcaption>

| | Scoreboarding | Tomasulo |
|:--|:--|:--|
| RAW | wait for the operands | wait for the operands on the CDB |
| WAR | stall the write | renaming |
| WAW | stall the issue | renaming |
| Results passed through | registers | CDB |
| Hazard detection | central (the scoreboard) | distributed (reservation stations) |

</figure>

#### Hardware Speculation

Branches limit dynamic scheduling, since an instruction after a branch cannot execute until the branch is resolved. With **hardware speculation** the processor predicts the branch and executes the instructions on the predicted path as if the prediction were correct. The results must not change the registers or memory until the prediction is known to be correct.

Tomasulo's algorithm is extended with a **reorder buffer (ROB)**, a FIFO queue that holds the results of instructions that have completed but not yet committed. Each entry has the instruction type (branch, store or register operation), the destination (register number or memory address), the value, and a ready bit. The ROB entries replace the reservation stations as the names used for renaming, and the ROB supplies operands to later instructions, as the reservation stations did.

The steps become:

1. **Issue:** an instruction is issued if there is a free reservation station and a free ROB entry. The number of its ROB entry is the tag of its result.
2. **Execute:** as before.
3. **Write result:** put the result, tagged with the ROB entry, on the CDB, into the ROB and the waiting reservation stations.
4. **Commit:** when the instruction at the head of the ROB has its result, write the result to the register (or memory for a store) and remove the entry. If the instruction is a mispredicted branch, the ROB is flushed and execution restarts at the correct successor.

Instructions execute out of order but commit in order. An exception is recorded in the ROB and raised only when the instruction reaches the head. By then every earlier instruction has committed and no later instruction has changed a register or memory, so the processor can stop at that instruction and restart it after the exception is handled, and an exception on a wrong path is never raised.

Modern processors issue several instructions per cycle with this scheme (a dynamically scheduled superscalar processor, e.g. the AMD Ryzen 7 5800H). Instead of keeping values in the ROB, they usually rename the architectural registers into a larger set of physical registers.

## Memory Organization

### Processor–Memory Interaction

The processor is connected to memory by an **address bus** (the location to be accessed), a bidirectional **data bus**, and a **control bus** (READ, WRITE, …). A memory module with $n$ address lines and $m$ data lines has $2^n$ locations of $m$ bits and is a $2^n \times m$ memory. Its RD/$\overline{\text{WR}}$ line selects read (1) or write (0), and the chip select $\overline{\text{CS}}$, when active (0), enables the chip; when $\overline{\text{CS}} = 1$, the data lines are in the high-impedance state.

Classification of memory:

- **Volatile** (data lost when power is off: SRAM and DRAM, static and dynamic random-access memory; DRAM also needs refreshing) and **non-volatile** (ROM or read-only memory, magnetic disk, CD/DVD, flash).
- **Random access** (access time independent of the location: RAM and ROM), **sequential access** (magnetic tape) and **direct (semi-random) access** (magnetic disk: go directly to a track, then sequential).
- **ROM** (written during manufacture or in the laboratory: ROM; PROM, programmable once; EPROM, erasable with ultraviolet light; EEPROM, electrically erasable) and **RAM** (SRAM retains data while power is on; DRAM stores data as charge on capacitors and needs periodic refreshing).

Terms:

- **Access time:** the time from the initiation of a read or write to its completion.
- **Latency:** the delay from the initiation of an operation until the first data is available.
- **Bandwidth:** the maximum data transfer rate, in bytes per second.

<div class="example">

A memory takes 20 ns to service an access to a 32-bit word. Find the latency and the bandwidth. The memory is then changed to accept a new request every 5 ns by overlapping requests.

</div>

The latency is 20 ns and the bandwidth is $32 \text{ bits}/20\text{ ns} = 1.6$ Gbit/s (200 MB/s). With a new request every 5 ns, the latency is still 20 ns, but the bandwidth is $32/5\text{ ns} = 6.4$ Gbit/s (800 MB/s).

#### Organization of a Memory Chip

The memory cells are organized as an array. In an $8 \times 4$ chip, each row of 4 cells is a word, and a $3 \times 8$ decoder selects one of the 8 rows through the word lines. Each cell is connected to two bit lines $b$ and $b'$, and the cells in a column are connected to a sense/write circuit.

<figure class="fig">
<svg viewBox="0 0 470 322" width="470" role="img" aria-label="Organization of an 8 x 4 memory chip">
  <defs><marker id="arr-c8" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="40" width="60" height="200" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="40" width="60" height="200" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="50.0" y="137.5" text-anchor="middle" font-size="10" fill="currentColor">3 × 8</text>
  <text x="50.0" y="149.5" text-anchor="middle" font-size="10" fill="currentColor">decoder</text>
  <text x="10.0" y="30.0" text-anchor="start" font-size="10" fill="currentColor">A₂A₁A₀</text>
  <line x1="80.0" y1="58.0" x2="340.0" y2="58.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="55.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W0</text>
  <rect x="120" y="50" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="50" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="50" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="50" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="80.0" y1="82.0" x2="340.0" y2="82.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="79.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W1</text>
  <rect x="120" y="74" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="74" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="74" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="74" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="80.0" y1="106.0" x2="340.0" y2="106.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="103.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W2</text>
  <rect x="120" y="98" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="98" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="98" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="98" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="80.0" y1="130.0" x2="340.0" y2="130.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="127.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W3</text>
  <rect x="120" y="122" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="122" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="122" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="122" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="80.0" y1="154.0" x2="340.0" y2="154.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="151.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W4</text>
  <rect x="120" y="146" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="146" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="146" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="146" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="80.0" y1="178.0" x2="340.0" y2="178.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="175.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W5</text>
  <rect x="120" y="170" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="170" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="170" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="170" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="80.0" y1="202.0" x2="340.0" y2="202.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="199.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W6</text>
  <rect x="120" y="194" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="194" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="194" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="194" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="80.0" y1="226.0" x2="340.0" y2="226.0" stroke="currentColor" stroke-width="1"/>
  <text x="86.0" y="223.0" text-anchor="start" font-size="8" fill="currentColor" class="dim">W7</text>
  <rect x="120" y="218" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="175" y="218" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="230" y="218" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="285" y="218" width="30" height="16" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="127.0" y1="46.0" x2="127.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <line x1="143.0" y1="46.0" x2="143.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <rect x="113" y="250" width="44" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="267.1" text-anchor="middle" font-size="9" fill="currentColor">S/W</text>
  <line x1="135.0" y1="278.0" x2="135.0" y2="300.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-c8)"/>
  <text x="135.0" y="314.0" text-anchor="middle" font-size="10" fill="currentColor">b0</text>
  <line x1="182.0" y1="46.0" x2="182.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <line x1="198.0" y1="46.0" x2="198.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <rect x="168" y="250" width="44" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190.0" y="267.1" text-anchor="middle" font-size="9" fill="currentColor">S/W</text>
  <line x1="190.0" y1="278.0" x2="190.0" y2="300.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-c8)"/>
  <text x="190.0" y="314.0" text-anchor="middle" font-size="10" fill="currentColor">b1</text>
  <line x1="237.0" y1="46.0" x2="237.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <line x1="253.0" y1="46.0" x2="253.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <rect x="223" y="250" width="44" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="245.0" y="267.1" text-anchor="middle" font-size="9" fill="currentColor">S/W</text>
  <line x1="245.0" y1="278.0" x2="245.0" y2="300.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-c8)"/>
  <text x="245.0" y="314.0" text-anchor="middle" font-size="10" fill="currentColor">b2</text>
  <line x1="292.0" y1="46.0" x2="292.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <line x1="308.0" y1="46.0" x2="308.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <rect x="278" y="250" width="44" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="267.1" text-anchor="middle" font-size="9" fill="currentColor">S/W</text>
  <line x1="300.0" y1="278.0" x2="300.0" y2="300.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-c8)"/>
  <text x="300.0" y="314.0" text-anchor="middle" font-size="10" fill="currentColor">b3</text>
  <text x="390.0" y="266.0" text-anchor="start" font-size="10" fill="currentColor">R/W′, CS′</text>
  <line x1="385.0" y1="262.0" x2="350.0" y2="262.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-c8)"/>
</svg>
<figcaption>Organization of an $8 \times 4$ memory chip (after Hamacher).</figcaption>
</figure>

The external connections are the address lines, the data lines, R/$\overline{\text{W}}$, $\overline{\text{CS}}$, power and ground. An $8 \times 4$ chip needs $3 + 4 + 2 + 2 = 11$, and a $256 \times 16$ chip needs $8 + 16 + 2 + 2 = 28$.

### Static RAM

An **SRAM** cell stores a bit in a latch formed by two cross-connected inverters. The latch is connected to the bit lines $b$ and $b'$ by transistors $T_1$ and $T_2$, which are switched on by the word line.

<figure class="fig">
<svg viewBox="0 0 500 224" width="500" role="img" aria-label="SRAM cell: a latch of two cross-coupled inverters connected to the bit lines through T1 and T2">
  <defs><marker id="arr-sr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="40.0" y1="20.0" x2="40.0" y2="200.0" stroke="currentColor" stroke-width="2"/>
  <line x1="400.0" y1="20.0" x2="400.0" y2="200.0" stroke="currentColor" stroke-width="2"/>
  <text x="40.0" y="216.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">b</text>
  <text x="400.0" y="216.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">b′</text>
  <line x1="20.0" y1="40.0" x2="420.0" y2="40.0" stroke="currentColor" stroke-width="1.5"/>
  <text x="425.0" y="44.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">word line</text>
  <rect x="90" y="90" width="30" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="105.0" y="108.5" text-anchor="middle" font-size="10" fill="currentColor">T₁</text>
  <line x1="105.0" y1="40.0" x2="105.0" y2="90.0" stroke="currentColor" stroke-width="1.2"/>
  <rect x="330" y="90" width="30" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="345.0" y="108.5" text-anchor="middle" font-size="10" fill="currentColor">T₂</text>
  <line x1="345.0" y1="40.0" x2="345.0" y2="90.0" stroke="currentColor" stroke-width="1.2"/>
  <line x1="40.0" y1="105.0" x2="90.0" y2="105.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="360.0" y1="105.0" x2="400.0" y2="105.0" stroke="currentColor" stroke-width="1.5"/>
  <polygon points="190,75 190,115 230,95" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="234" cy="95" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polygon points="250,135 250,175 210,155" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="206" cy="155" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="120.0,105.0 160.0,105.0 160.0,95.0 190.0,95.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="238.0,95.0 290.0,95.0 290.0,105.0 330.0,105.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="290.0,105.0 290.0,155.0 250.0,155.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="202.0,155.0 160.0,155.0 160.0,105.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150.0" y="98.0" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">X</text>
  <text x="300.0" y="98.0" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">Y</text>
  <text x="220.0" y="196.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">latch (2 inverters = 4 transistors)</text>
</svg>
<figcaption>SRAM cell (after Hamacher). With CMOS inverters (complementary metal–oxide–semiconductor: each inverter is a pair of n-type and p-type MOS transistors) the cell has 6 transistors.</figcaption>
</figure>

- **Read:** the word line is activated, $T_1$ and $T_2$ are switched on, and the stored value appears on $b$ (its complement on $b'$), where the sense/write circuit detects it.
- **Write:** the sense/write circuit sets $b$ and $b'$ to the value and its complement, and the word line is activated.
- To retain the state, the word line is grounded, which switches $T_1$ and $T_2$ off.
- In state 0, $X$ is low and $Y$ is high; in state 1, $X$ is high and $Y$ is low.

SRAM is fast, needs no refresh circuitry, and is volatile. It costs more (6 transistors per bit) and has limited capacity, so it is used for cache memories. A CMOS SRAM cell draws current only while it is being accessed, but SRAM cells are larger and consume more power than DRAM cells.

### Dynamic RAM

A **DRAM** cell stores a bit as charge on a capacitor, with one transistor. The charge leaks, so the cell must be refreshed periodically, every few milliseconds.

<figure class="fig">
<svg viewBox="0 0 330 230" width="330" role="img" aria-label="DRAM cell: one transistor and one capacitor">
  <defs><marker id="arr-dr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="60.0" y1="20.0" x2="60.0" y2="170.0" stroke="currentColor" stroke-width="2"/>
  <text x="52.0" y="182.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">bit line</text>
  <line x1="20.0" y1="50.0" x2="240.0" y2="50.0" stroke="currentColor" stroke-width="1.5"/>
  <text x="245.0" y="54.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">word line</text>
  <rect x="110" y="80" width="34" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="127.0" y="98.8" text-anchor="middle" font-size="11" fill="currentColor">T</text>
  <line x1="127.0" y1="50.0" x2="127.0" y2="80.0" stroke="currentColor" stroke-width="1.2"/>
  <line x1="60.0" y1="95.0" x2="110.0" y2="95.0" stroke="currentColor" stroke-width="1.5"/>
  <polyline points="144.0,95.0 190.0,95.0 190.0,115.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="172.0" y1="115.0" x2="208.0" y2="115.0" stroke="currentColor" stroke-width="2"/>
  <line x1="172.0" y1="125.0" x2="208.0" y2="125.0" stroke="currentColor" stroke-width="2"/>
  <polyline points="190.0,125.0 190.0,145.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="178.0" y1="145.0" x2="202.0" y2="145.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="183.0" y1="150.0" x2="197.0" y2="150.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="188.0" y1="155.0" x2="192.0" y2="155.0" stroke="currentColor" stroke-width="1.5"/>
  <text x="222.0" y="124.0" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">C</text>
  <rect x="20" y="196" width="80" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="212.2" text-anchor="middle" font-size="9" fill="currentColor">sense amp</text>
  <line x1="60.0" y1="170.0" x2="60.0" y2="193.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dr)"/>
</svg>
<figcaption>One-transistor DRAM cell.</figcaption>
</figure>

- **Read:** the word line switches the transistor on, and a sense amplifier on the bit line detects whether the charge is above a threshold (1) or below (0).
- **Write:** the transistor is switched on, and the voltage on the bit line charges or discharges the capacitor.

DRAM needs less hardware than SRAM, so it is cheaper and much denser, and is used for main memory. Its access time is longer than that of SRAM.

#### Asynchronous DRAM

The address lines are multiplexed. The high-order half of the address (the row address) is loaded into the row address latch by the row address strobe $\overline{\text{RAS}}$, and the low-order half (the column address) into the column address latch by the column address strobe $\overline{\text{CAS}}$. Both strobes are active low.

<figure class="fig">
<svg viewBox="0 0 560 270" width="560" role="img" aria-label="Internal organization of a DRAM chip with multiplexed row and column addresses">
  <defs><marker id="arr-dc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="60" width="80" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="77.7" text-anchor="middle" font-size="9" fill="currentColor">row address</text>
  <text x="60.0" y="88.7" text-anchor="middle" font-size="9" fill="currentColor">latch</text>
  <rect x="130" y="60" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="165.0" y="77.7" text-anchor="middle" font-size="9" fill="currentColor">row</text>
  <text x="165.0" y="88.7" text-anchor="middle" font-size="9" fill="currentColor">decoder</text>
  <rect x="230" y="30" width="200" height="120" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="230" y="30" width="200" height="120" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="330.0" y="87.3" text-anchor="middle" font-size="11" fill="currentColor">cell array</text>
  <text x="330.0" y="100.3" text-anchor="middle" font-size="11" fill="currentColor">(r rows × c columns)</text>
  <rect x="230" y="165" width="200" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330.0" y="182.2" text-anchor="middle" font-size="9" fill="currentColor">sense / write circuits</text>
  <rect x="230" y="210" width="200" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330.0" y="227.2" text-anchor="middle" font-size="9" fill="currentColor">column decoder</text>
  <rect x="20" y="210" width="80" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="227.2" text-anchor="middle" font-size="9" fill="currentColor">column latch</text>
  <line x1="100.0" y1="80.0" x2="127.0" y2="80.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc)"/>
  <line x1="200.0" y1="80.0" x2="227.0" y2="80.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc)"/>
  <line x1="100.0" y1="224.0" x2="227.0" y2="224.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc)"/>
  <line x1="330.0" y1="210.0" x2="330.0" y2="196.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc)"/>
  <line x1="330.0" y1="150.0" x2="330.0" y2="162.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc)"/>
  <line x1="430.0" y1="179.0" x2="470.0" y2="179.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc)"/>
  <text x="476.0" y="183.0" text-anchor="start" font-size="10" fill="currentColor">Dₘ₋₁ … D₀</text>
  <text x="60.0" y="30.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">multiplexed address</text>
  <line x1="60.0" y1="36.0" x2="60.0" y2="57.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc)"/>
  <polyline points="60.0,36.0 5.0,36.0 5.0,224.0 17.0,224.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dc)"/>
  <line x1="60.0" y1="120.0" x2="60.0" y2="103.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-dc)"/>
  <text x="60.0" y="132.0" text-anchor="middle" font-size="10" fill="#ef4444">RAS′</text>
  <line x1="60.0" y1="252.0" x2="60.0" y2="241.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-dc)"/>
  <text x="60.0" y="266.0" text-anchor="middle" font-size="10" fill="#ef4444">CAS′</text>
</svg>
<figcaption>Internal organization of a DRAM chip (after Hamacher).</figcaption>
</figure>

If the cell array has $r$ rows and $c$ columns, the row address has $x = \log_2 r$ bits and the column address $y = \log_2 c$ bits. On a read, all the cells of the selected row are read and refreshed; the column decoder then selects a group of $m$ sense/write circuits, which are connected to the data lines.

<div class="example">

A 1 Gbit DRAM chip with a 32-bit data bus has its cells organized as $2^{15}$ rows and $2^{15}$ columns.

</div>

The memory is organized as $2^{15} \times (2^{10} \times 2^5)$: $2^{15}$ rows, each of $2^{10}$ words of 32 bits. The address has 25 bits: 15 for the row ($A_{24}$–$A_{10}$, a $15 \times 32768$ row decoder) and 10 for the column ($A_9$–$A_0$, a $10 \times 1024$ column decoder).

**Fast page mode:** a latch is connected at the output of the sense amplifier of each column. Once a row is selected, consecutive bytes of the row are transferred by applying consecutive column addresses with successive $\overline{\text{CAS}}$ signals, without applying the row address again. This allows fast transfer of blocks of data.

#### Synchronous DRAM

In an **SDRAM** the operations are synchronized with a clock. The structure is the same as that of an asynchronous DRAM, but:

- the address and data connections are buffered by registers, and the output of each sense amplifier is connected to a latch;
- a mode register sets the operating mode;
- a column address counter generates successive column addresses internally, so no external $\overline{\text{CAS}}$ pulses are needed;
- a refresh counter provides built-in refresh.

In **burst mode**, after the column address is applied, data from successive columns is transferred in successive clock cycles. All operations are triggered on the rising edge of the clock.

<figure class="table">
<figcaption>Types of SDRAM.</figcaption>

| Type | Words transferred per internal (memory-array) clock cycle |
|:--|:--|
| SDR (single data rate) | 1, on the rising edge |
| DDR (double data rate) | 2, on both edges |
| DDR2 | 4 |
| DDR3 | 8 |

</figure>

A **DIMM** (dual in-line memory module) carries several DRAM chips on a circuit board, with a 64-bit data path. For example, DDR3-1600 has an internal clock of 200 MHz, a bus clock of 800 MHz and a transfer rate of $800\text{ MHz} \times 2 \times 8\text{ B} = 12.8$ GB/s.

**Refresh overhead.** A DRAM cannot respond to read or write requests while a refresh is in progress; such requests wait until the refresh cycle completes. The time lost is small [[2]](#ref-2):

$$\text{refresh overhead} = \frac{\text{refresh cycles} \times \text{time per refresh cycle}}{\text{refresh period}}$$

For example, if each row must be refreshed once every 64 ms, the minimum time between two row accesses is 50 ns, and all rows are refreshed in 8K (8192) refresh cycles, refreshing takes $8192 \times 50$ ns $= 0.41$ ms, an overhead of $0.41/64 = 0.0064$, under 1%.

### Memory Interfacing

#### Larger Memories from Smaller Chips

To build a memory of $M \times N$ bits from chips of $m \times n$ bits:

- **Number of chips** $= \dfrac{M}{m} \times \dfrac{N}{n}$ (e.g. a $2\text{M} \times 32$ memory from $512\text{K} \times 8$ chips needs $4 \times 4 = 16$ chips [[2]](#ref-2)).
- Chips placed side by side widen the word ($N/n$ chips share the address lines); chips stacked widen the address space ($M/m$ rows of chips).
- The extra $\log_2 (M/m)$ high-order address bits go to a decoder that drives the chip selects.

<div class="example">

Four $1\text{G} \times 8$ memory chips (30 address lines, 8 data lines) are connected to a processor with a 32-bit address and 8 data lines.

</div>

The low-order 30 address lines $A_{29}$–$A_0$ go to all the chips, and the high-order lines $A_{31} A_{30}$ go to a $2 \times 4$ decoder that selects one of the chips.

<figure class="fig">
<svg viewBox="0 0 660 252" width="660" role="img" aria-label="Four 1 G x 8 modules selected by the high-order address bits">
  <defs><marker id="arr-memhi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="10" y="90" width="90" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55.0" y="123.8" text-anchor="middle" font-size="11" fill="currentColor">processor</text>
  <rect x="150" y="165" width="80" height="56" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="165" width="80" height="56" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="190.0" y="190.5" text-anchor="middle" font-size="10" fill="currentColor">2 × 4</text>
  <text x="190.0" y="202.5" text-anchor="middle" font-size="10" fill="currentColor">decoder</text>
  <rect x="270" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="310.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M0</text>
  <text x="310.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,174.0 310.0,174.0 310.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memhi)"/>
  <text x="315.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS0′</text>
  <rect x="365" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="365" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="405.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M1</text>
  <text x="405.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,186.0 405.0,186.0 405.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memhi)"/>
  <text x="410.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS1′</text>
  <rect x="460" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="460" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="500.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M2</text>
  <text x="500.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,198.0 500.0,198.0 500.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memhi)"/>
  <text x="505.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS2′</text>
  <rect x="555" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="555" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="595.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M3</text>
  <text x="595.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,210.0 595.0,210.0 595.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memhi)"/>
  <text x="600.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS3′</text>
  <polyline points="55.0,150.0 55.0,193.0 147.0,193.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-memhi)"/>
  <text x="62.0" y="186.0" text-anchor="start" font-size="10" fill="#ef4444">A₃₁A₃₀</text>
  <polyline points="100.0,105.0 240.0,105.0 240.0,20.0 612.0,20.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="14.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">A₂₉–A₀ to all modules</text>
  <line x1="310.0" y1="20.0" x2="310.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memhi)"/>
  <circle cx="310" cy="20" r="2.5" fill="currentColor"/>
  <line x1="405.0" y1="20.0" x2="405.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memhi)"/>
  <circle cx="405" cy="20" r="2.5" fill="currentColor"/>
  <line x1="500.0" y1="20.0" x2="500.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memhi)"/>
  <circle cx="500" cy="20" r="2.5" fill="currentColor"/>
  <line x1="595.0" y1="20.0" x2="595.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memhi)"/>
  <circle cx="595" cy="20" r="2.5" fill="currentColor"/>
  <text x="10.0" y="244.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">M0: 0x00000000–0x3FFFFFFF, M1: 0x40000000–0x7FFFFFFF, … (consecutive bytes in one module)</text>
</svg>
<figcaption>Four modules selected by the high-order address bits.</figcaption>
</figure>

<figure class="table">
<figcaption>Address ranges of the modules.</figcaption>

| Module | $A_{31} A_{30}$ | Address range |
|:-:|:-:|:--|
| M0 | 00 | 0x00000000 – 0x3FFFFFFF |
| M1 | 01 | 0x40000000 – 0x7FFFFFFF |
| M2 | 10 | 0x80000000 – 0xBFFFFFFF |
| M3 | 11 | 0xC0000000 – 0xFFFFFFFF |

</figure>

Consecutive bytes are in the same module, so a 32-bit word needs four sequential memory accesses.

#### Memory Interleaving

In an **interleaved** memory the low-order address lines $A_1 A_0$ select the module, and the high-order lines $A_{31}$–$A_2$ go to all the modules. Consecutive addresses are in consecutive modules:

- M0: 0, 4, 8, 12, …
- M1: 1, 5, 9, 13, …
- M2: 2, 6, 10, 14, …
- M3: 3, 7, 11, 15, …

<figure class="fig">
<svg viewBox="0 0 660 252" width="660" role="img" aria-label="Interleaved memory: modules selected by the low-order address bits">
  <defs><marker id="arr-memlo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="10" y="90" width="90" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55.0" y="123.8" text-anchor="middle" font-size="11" fill="currentColor">processor</text>
  <rect x="150" y="165" width="80" height="56" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="165" width="80" height="56" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="190.0" y="190.5" text-anchor="middle" font-size="10" fill="currentColor">2 × 4</text>
  <text x="190.0" y="202.5" text-anchor="middle" font-size="10" fill="currentColor">decoder</text>
  <rect x="270" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="310.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M0</text>
  <text x="310.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,174.0 310.0,174.0 310.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memlo)"/>
  <text x="315.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS0′</text>
  <rect x="365" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="365" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="405.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M1</text>
  <text x="405.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,186.0 405.0,186.0 405.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memlo)"/>
  <text x="410.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS1′</text>
  <rect x="460" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="460" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="500.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M2</text>
  <text x="500.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,198.0 500.0,198.0 500.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memlo)"/>
  <text x="505.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS2′</text>
  <rect x="555" y="40" width="80" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="555" y="40" width="80" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="595.0" y="62.5" text-anchor="middle" font-size="10" fill="currentColor">M3</text>
  <text x="595.0" y="74.5" text-anchor="middle" font-size="10" fill="currentColor">1G × 8</text>
  <polyline points="230.0,210.0 595.0,210.0 595.0,93.0" stroke="currentColor" stroke-width="1" fill="none" marker-end="url(#arr-memlo)"/>
  <text x="600.0" y="108.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">CS3′</text>
  <polyline points="55.0,150.0 55.0,193.0 147.0,193.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-memlo)"/>
  <text x="62.0" y="186.0" text-anchor="start" font-size="10" fill="#ef4444">A₁A₀</text>
  <polyline points="100.0,105.0 240.0,105.0 240.0,20.0 612.0,20.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="14.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">A₃₁–A₂ to all modules</text>
  <line x1="310.0" y1="20.0" x2="310.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memlo)"/>
  <circle cx="310" cy="20" r="2.5" fill="currentColor"/>
  <line x1="405.0" y1="20.0" x2="405.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memlo)"/>
  <circle cx="405" cy="20" r="2.5" fill="currentColor"/>
  <line x1="500.0" y1="20.0" x2="500.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memlo)"/>
  <circle cx="500" cy="20" r="2.5" fill="currentColor"/>
  <line x1="595.0" y1="20.0" x2="595.0" y2="37.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-memlo)"/>
  <circle cx="595" cy="20" r="2.5" fill="currentColor"/>
  <text x="10.0" y="244.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">M0: 0, 4, 8, …; M1: 1, 5, 9, …; M2: 2, 6, 10, …; M3: 3, 7, 11, …</text>
</svg>
<figcaption>Interleaved memory: the modules are selected by the low-order address bits.</figcaption>
</figure>

If all four modules are enabled together, with a 32-bit data bus ($D_{31}$–$D_0$), the four bytes of a word are transferred in one memory cycle. This is the reason for word alignment in MIPS32: a word starting at an address divisible by 4 has its bytes (0, 1, 2, 3), (4, 5, 6, 7), … in four different modules. A misaligned word such as (1, 2, 3, 4) still has its bytes in four different modules (M1, M2, M3, M0), but byte 4 is in the next row: it needs a different $A_{31}$–$A_2$, which all the modules share, so the word needs two memory cycles. (The course slides say two bytes fall in the same module; they do not.)

## Memory Hierarchy and Cache Memory

### Memory Hierarchy

Fast memory technology is more expensive per bit than slower memory.

- **SRAM:** very fast but expensive (6 transistors per bit), with limited packing density.
- **DRAM:** slower than SRAM but much cheaper (1 transistor per bit); requires periodic refreshing.
- **Flash:** non-volatile (floating-gate MOS transistors); slower than DRAM, with higher density and lower cost per bit.
- **Magnetic disk:** very low cost per bit, but much slower than DRAM and flash, since it has mechanical moving parts.

So the memory system is organized as a **hierarchy**: a small amount of fast memory, a larger amount of medium-speed memory, and a large amount of slow memory. Each level holds a subset of the data in the level below it, and the whole address space is in the largest, slowest level. Moving away from the processor, the size increases, the cost per bit decreases and the speed decreases.

<figure class="fig">
<svg viewBox="0 0 660 222" width="660" role="img" aria-label="Memory hierarchy from registers to disk">
  <defs><marker id="arr-mh" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="240.0" y="14" width="120" height="30" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="240.0" y="14" width="120" height="30" rx="2" fill="#3b82f6" opacity="0.30000000000000004"/>
  <text x="300.0" y="33.2" text-anchor="middle" font-size="12" fill="currentColor">Registers</text>
  <rect x="210.0" y="48" width="180" height="30" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="210.0" y="48" width="180" height="30" rx="2" fill="#3b82f6" opacity="0.26"/>
  <text x="300.0" y="67.2" text-anchor="middle" font-size="12" fill="currentColor">L1 cache (I + D)</text>
  <rect x="180.0" y="82" width="240" height="30" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180.0" y="82" width="240" height="30" rx="2" fill="#3b82f6" opacity="0.22"/>
  <text x="300.0" y="101.2" text-anchor="middle" font-size="12" fill="currentColor">L2 cache</text>
  <rect x="150.0" y="116" width="300" height="30" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150.0" y="116" width="300" height="30" rx="2" fill="#3b82f6" opacity="0.18"/>
  <text x="300.0" y="135.2" text-anchor="middle" font-size="12" fill="currentColor">L3 cache</text>
  <rect x="120.0" y="150" width="360" height="30" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="120.0" y="150" width="360" height="30" rx="2" fill="#f59e0b" opacity="0.14"/>
  <text x="300.0" y="169.2" text-anchor="middle" font-size="12" fill="currentColor">Main memory</text>
  <rect x="90.0" y="184" width="420" height="30" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="90.0" y="184" width="420" height="30" rx="2" fill="#f59e0b" opacity="0.1"/>
  <text x="300.0" y="203.2" text-anchor="middle" font-size="12" fill="currentColor">Disk / flash</text>
  <line x1="540" y1="30" x2="540" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mh)"/>
  <text x="550.0" y="112.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">larger, cheaper,</text>
  <text x="550.0" y="127.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">slower</text>
  <line x1="66" y1="200" x2="66" y2="30" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-mh)"/>
  <text x="58.0" y="120.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">faster</text>
</svg>
<figcaption>The memory hierarchy.</figcaption>
</figure>

<figure class="table">
<figcaption>Typical access times and capacities.</figcaption>

| Level | Access time | Capacity | Location |
|:--|:-:|:-:|:-:|
| Registers | 300–500 ps | 500–1000 B | on chip |
| L1 cache | 1–2 ns | 16–64 KB | on chip |
| L2 cache | 5–20 ns | 256 KB – 2 MB | on chip |
| L3 cache | 20–50 ns | 1–32 MB | on or off chip |
| Main memory | 50–100 ns | 1–16 GB | |
| Magnetic disk | 5–50 ms | 100 GB – 16 TB | |

</figure>

The processor is much faster than main memory, and the gap has grown with time.

- Memory latency **reduction**: faster DRAM cells, a wider memory bus, multiple memory banks, a memory controller integrated with the processor.
- Memory latency **hiding**: a hierarchy of SRAM cache memories, and prefetching instructions and data before they are needed.

Pipelining assumes that memory operates at processor speed, which main memory cannot do. The **cache** is the hardware that makes this possible: a small, fast memory that provides the memory objects referenced by the processor directly, most of the time.

A computer has two hierarchies:

- **Cache / main memory** (2 to 4 levels), managed by hardware, since a block transfer takes tens of cycles. Its objective is a fast average memory access.
- **Main memory / secondary memory**, managed by the OS, since a transfer takes thousands of cycles. Its objective is a large memory space (virtual memory).

For example, in the AMD Ryzen 7 5800H (8 Zen 3 cores) each core has its own 32 KB 8-way L1 instruction and data caches (4 cycles) and a 512 KB 8-way L2 cache (12 cycles), and the cores share a 16 MB 16-way L3 cache (about 46 cycles). All caches use 64 B blocks.

<figure class="fig">
<img src="/images/computer-systems/cpuz-5800h.png" alt="CPU-Z window for the AMD Ryzen 7 5800H showing its cache sizes and associativity" width="601">
<figcaption>CPU-Z on a Ryzen 7 5800H: the Cache panel lists the per-core L1 and L2 caches and the shared L3.</figcaption>
</figure>

### Locality of Reference

Programs tend to reuse the instructions and data they used recently. As a rule of thumb, 90% of the execution time of a program is spent in 10% of the code (the 90/10 rule), because of loops, procedures calling each other, and arrays accessed sequentially.

- **Temporal locality:** an item that is referenced tends to be referenced again soon (the instructions of a loop).
- **Spatial locality:** items near a referenced item tend to be referenced soon (consecutive instructions, elements of an array).

### Performance of a Memory Hierarchy

Consider two levels $M_1$ (e.g. cache) and $M_2$ (e.g. main memory), with cost per bit $c_i$ and capacity $S_i$.

$$\text{Average cost per bit } c = \frac{c_1 S_1 + c_2 S_2}{S_1 + S_2}$$

For $c$ to approach $c_2$ we need $S_1 \ll S_2$.

The **hit ratio** $H$ is the probability that an address generated by the CPU refers to $M_1$. If $N_1$ and $N_2$ references go to $M_1$ and $M_2$, then $H = N_1/(N_1 + N_2)$; $1 - H$ is the **miss ratio**. With access times $t_{A1}$, $t_{A2}$ and miss penalty $t_{\text{miss}}$:

$$t_A = H\,t_{A1} + (1 - H)\,t_{\text{miss}}$$

<figure class="fig">
<svg viewBox="0 0 600 214" width="600" role="img" aria-label="Hit and miss paths of a two-level memory hierarchy and their access times">
  <defs><marker id="arr-hp" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="30" width="90" height="64" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="65.0" y="66.2" text-anchor="middle" font-size="12" fill="currentColor">CPU</text>
  <rect x="250" y="30" width="110" height="64" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="30" width="110" height="64" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="305.0" y="56.0" text-anchor="middle" font-size="12" fill="currentColor">M<tspan baseline-shift="sub" font-size="9">1</tspan> (cache)</text>
  <text x="305.0" y="78.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">t<tspan baseline-shift="sub" font-size="8">A1</tspan></text>
  <rect x="480" y="30" width="110" height="64" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="30" width="110" height="64" rx="3" fill="#f59e0b" opacity=".14"/>
  <text x="535.0" y="56.0" text-anchor="middle" font-size="12" fill="currentColor">M<tspan baseline-shift="sub" font-size="9">2</tspan> (main)</text>
  <text x="535.0" y="78.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">t<tspan baseline-shift="sub" font-size="8">A2</tspan></text>
  <line x1="110" y1="48" x2="248" y2="48" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hp)"/>
  <text x="180.0" y="40.0" text-anchor="middle" font-size="11" fill="currentColor">address</text>
  <line x1="250" y1="76" x2="112" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hp)"/>
  <text x="180.0" y="92.0" text-anchor="middle" font-size="11" fill="currentColor">hit (H): word</text>
  <line x1="360" y1="48" x2="478" y2="48" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hp)"/>
  <text x="420.0" y="40.0" text-anchor="middle" font-size="11" fill="currentColor">miss (1 − H)</text>
  <line x1="480" y1="76" x2="362" y2="76" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-hp)"/>
  <text x="420.0" y="92.0" text-anchor="middle" font-size="11" fill="currentColor">word / block</text>
  <text x="100.0" y="144.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">hit, prob. H</text>
  <rect x="110" y="126" width="50" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="110" y="126" width="50" height="28" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="135.0" y="144.0" text-anchor="middle" font-size="11" fill="currentColor">t<tspan baseline-shift="sub" font-size="8">A1</tspan></text>
  <text x="100.0" y="182.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">miss, prob. 1 − H</text>
  <rect x="110" y="164" width="350" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="110" y="164" width="350" height="28" rx="3" fill="#ef4444" opacity=".18"/>
  <text x="285.0" y="182.0" text-anchor="middle" font-size="11" fill="currentColor">t<tspan baseline-shift="sub" font-size="8">miss</tspan> (e.g. t<tspan baseline-shift="sub" font-size="8">A2</tspan>)</text>
  <text x="480.0" y="158.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">t<tspan baseline-shift="sub" font-size="8">A</tspan> is the average</text>
  <text x="480.0" y="176.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">of the two times,</text>
  <text x="480.0" y="192.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">weighted by H, 1 − H</text>
</svg>
<figcaption>A reference is served by $M_1$ in time $t_{A1}$ with probability $H$; otherwise it costs $t_{\text{miss}}$.</figcaption>
</figure>

The miss penalty can be estimated in different ways:

1. The word is accessed directly from $M_2$: $t_{\text{miss}} = t_{A2}$.
2. The block containing the word is transferred to $M_1$ (time $t_B$), and the word is then accessed in $M_1$: $t_{\text{miss}} = t_B + t_{A1}$.
3. Including the time $t_{\text{hit}}$ to check for a hit: $t_{\text{miss}} = t_{\text{hit}} + t_B + t_{A1}$.

Two cases of the word-access model are used in problems:

- **Simultaneous (parallel) access:** $M_1$ and $M_2$ are searched together, and a miss costs only $t_{A2}$:
$$t_A = H\,t_{A1} + (1 - H)\,t_{A2}$$
- **Hierarchical (sequential) access:** $M_2$ is accessed only after $M_1$ misses, so a miss costs $t_{A1} + t_{A2}$. This is the form hit time + miss rate × miss penalty of H&P, with hit time $t_{A1}$ and miss penalty $t_{A2}$ [[4]](#ref-4):
$$t_A = H\,t_{A1} + (1 - H)\,(t_{A1} + t_{A2}) = t_{A1} + (1 - H)\,t_{A2}$$

For example, with $H = 0.9$, $t_{A1} = 10$ ns and $t_{A2} = 100$ ns these give 19 ns and 20 ns.

With $r = t_{A2}/t_{A1}$ and $t_{\text{miss}} = t_{A2}$, the access efficiency and the speedup due to the hierarchy are

$$e = \frac{t_{A1}}{t_A} = \frac{1}{H + (1 - H)\,r}, \qquad S = \frac{t_{A2}}{t_A} = \frac{1}{H/r + (1 - H)}$$

The speedup also follows from Amdahl's law, with $F = H$ and speedup $r$.

<div class="example">

The cache is 6 times faster than main memory and can be used 90% of the time. Find the speedup.

</div>

$$S = \frac{1}{0.9/6 + 0.1} = \frac{1}{0.25} = 4$$

<figure class="table">
<figcaption>Terminology.</figcaption>

| Term | Meaning |
|:--|:--|
| Block (line) | smallest unit of information transferred between two levels |
| Hit rate | fraction of memory accesses found in the upper level |
| Hit time | time to access the upper level, including the time to determine hit or miss |
| Miss rate | fraction of memory accesses not found in the upper level |
| Miss penalty | time to replace a block in the upper level and transfer the missed block |

</figure>

<div class="example">

Level 1 has separate instruction and data caches. The clock cycle is 2 ns, the cache access time (including hit detection) is 1 cycle and the miss penalty is 15 cycles. 1% of instruction fetches and 8% of data references miss, and 20% of memory accesses are for data. Find the average access time.

</div>

A miss takes $1 + 15 = 16$ cycles. The average number of cycles per access is

$$0.8\,(0.99 \times 1 + 0.01 \times 16) + 0.2\,(0.92 \times 1 + 0.08 \times 16) = 0.92 + 0.44 = 1.36$$

so $t_A = 1.36 \times 2 = 2.72$ ns.

For three levels (L1, L2 and main memory), a miss in L1 goes to L2:

$$t_A = H_{L1}\,t_{L1} + (1 - H_{L1})\,\big[H_{L2}\,t_{L2} + (1 - H_{L2})\,t_{\text{miss2}}\big]$$

where $H_{L2}$ is the hit ratio of L2 for the accesses that reach it, and $t_{\text{miss2}}$ is the penalty when the data is in neither cache.

### Cache Organization

The cache is divided into **blocks** (lines) of typically 8 to 256 bytes. When the CPU accesses a word, the hardware first checks whether it is in the cache. On a **hit** the word is read from the cache; on a **miss** the block containing the word is brought from main memory into the cache.

<figure class="fig">
<svg viewBox="0 0 590 260" width="590" role="img" aria-label="A cache: lookup logic with the cache directory, and the cache RAM">
  <defs><marker id="arr-cd" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <ellipse cx="70" cy="110" rx="50" ry="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="70.0" y="114.2" text-anchor="middle" font-size="12" fill="currentColor">CPU</text>
  <rect x="170" y="20" width="380" height="180" rx="14" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="360.0" y="190.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">cache controller</text>
  <rect x="190" y="40" width="170" height="130" rx="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="190" y="40" width="170" height="130" rx="10" fill="#3b82f6" opacity=".18"/>
  <text x="275.0" y="62.0" text-anchor="middle" font-size="12" fill="currentColor">lookup logic</text>
  <rect x="210" y="80" width="130" height="70" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="275.0" y="110.0" text-anchor="middle" font-size="12" fill="currentColor">cache</text>
  <text x="275.0" y="126.0" text-anchor="middle" font-size="12" fill="currentColor">directory</text>
  <rect x="400" y="50" width="120" height="110" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="50" width="120" height="110" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="460.0" y="100.0" text-anchor="middle" font-size="12" fill="currentColor">cache</text>
  <text x="460.0" y="116.0" text-anchor="middle" font-size="12" fill="currentColor">RAM</text>
  <line x1="120" y1="100" x2="187" y2="100" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-cd)"/>
  <text x="152.0" y="92.0" text-anchor="middle" font-size="11" fill="currentColor">addr</text>
  <polyline points="460,160 460,214 70,214 70,143" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-cd)"/>
  <text x="265.0" y="228.0" text-anchor="middle" font-size="11" fill="currentColor">data</text>
  <text x="275.0" y="250.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">directory: table of “addresses I have”</text>
  <text x="470.0" y="250.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">RAM: fast memory holding the blocks</text>
</svg>
<figcaption>Cache design: the cache RAM holds the blocks, and the lookup logic uses the cache directory (the table of addresses present) to decide whether an address is in the cache.</figcaption>
</figure>

#### Fast Lookup

The lookup logic has to find an address $A$ among thousands of addresses in the cache directory, and the search must be fast.

- Linear search can take thousands of comparisons, and binary search tens.
- Hash search typically takes one comparison, independent of the number of entries. *Hashing* uses a table indexed by a hash function.

A simple hash function selects some bits of $A$:

<figure class="fig">
<svg viewBox="0 0 640 120" width="640" role="img" aria-label="Which address bits to use for indexing the cache">
  <defs><marker id="arr-wb" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="60" y="20" width="480" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="20" width="200" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="20" width="200" height="34" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="160.0" y="41.2" text-anchor="middle" font-size="12" fill="currentColor">high-order bits</text>
  <rect x="260" y="20" width="180" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="20" width="180" height="34" rx="2" fill="#22c55e" opacity=".18"/>
  <text x="350.0" y="41.2" text-anchor="middle" font-size="12" fill="currentColor">middle bits</text>
  <rect x="440" y="20" width="100" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="20" width="100" height="34" rx="2" fill="#ef4444" opacity=".18"/>
  <text x="490.0" y="41.2" text-anchor="middle" font-size="12" fill="currentColor">low-order bits</text>
  <text x="160.0" y="80.0" text-anchor="middle" font-size="11" fill="#ef4444">small programs: all the same</text>
  <text x="160.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">→ many collisions</text>
  <text x="350.0" y="80.0" text-anchor="middle" font-size="11" fill="#22c55e">good choice: the index</text>
  <text x="490.0" y="80.0" text-anchor="middle" font-size="11" fill="#ef4444">differ between neighbours:</text>
  <text x="490.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">breaks up a block (no spatial locality)</text>
  <text x="490.0" y="110.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">→ used as the offset</text>
</svg>
<figcaption>For a small program the high-order bits are the same for most addresses, giving many collisions. The low-order bits differ between neighbouring addresses and would put them apart, losing spatial locality. So the middle bits are used.</figcaption>
</figure>

The low-order bits select the byte within the block (the **offset**), the middle bits select the entry in the directory (the **index**), and the high-order bits are stored in the directory as the **tag**, which is compared to check that the entry holds the requested block.

<figure class="fig">
<svg viewBox="0 0 610 72" width="610" role="img" aria-label="Address fields seen by the cache: tag, index and block offset">
  <defs><marker id="arr-af" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="60" y="14" width="230" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.0" y="33.5" text-anchor="middle" font-size="13" fill="currentColor">tag</text>
  <text x="175.0" y="62.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">stored in the directory</text>
  <rect x="290" y="14" width="150" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="290" y="14" width="150" height="30" rx="0" fill="#3b82f6" opacity=".18"/>
  <text x="365.0" y="33.5" text-anchor="middle" font-size="13" fill="currentColor">index</text>
  <text x="365.0" y="62.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">selects the entry</text>
  <rect x="440" y="14" width="110" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="495.0" y="33.5" text-anchor="middle" font-size="13" fill="currentColor">block offset</text>
  <text x="495.0" y="62.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">byte within the block</text>
  <text x="60.0" y="9.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">high-order</text>
  <text x="550.0" y="9.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">low-order</text>
</svg>
<figcaption>The cache hardware's view of an address.</figcaption>
</figure>

A block serves the same purpose in cache memory as a page in virtual memory: it reduces the size of the translation table, and it exploits spatial locality. The cache directory has one entry for each block, as the page table has one entry for each virtual page. Main memory is also organized in blocks.

#### Four Questions of Cache Organization

1. **Block placement:** where can a block be placed in the cache? (direct mapped, set associative)
2. **Block identification:** how is a block found in the cache? (tag, valid bit, tag-checking hardware)
3. **Block replacement:** which block is replaced on a miss? (LRU, FIFO, random)
4. **Write strategy:** when is main memory updated on a write hit, and what happens on a write miss?

### Block Placement

#### Direct Mapping

<div class="definition">

In a *direct-mapped* cache of $N$ blocks, memory block $M$ is placed in cache block $M \bmod N$.

</div>

<figure class="fig">
<svg viewBox="0 0 600 324" width="600" role="img" aria-label="Direct mapping of 16 memory blocks onto 8 cache blocks">
  <defs><marker id="arr-dm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="40" y="60" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="40" y="60" width="120" height="18" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="34.0" y="73.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="40" y="78" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34.0" y="91.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="40" y="96" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34.0" y="109.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="40" y="114" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34.0" y="127.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">3</text>
  <rect x="40" y="132" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34.0" y="145.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">4</text>
  <rect x="40" y="150" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34.0" y="163.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">5</text>
  <rect x="40" y="168" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="40" y="168" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="34.0" y="181.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">6</text>
  <rect x="40" y="186" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34.0" y="199.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">7</text>
  <text x="100.0" y="52.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">cache (8 blocks)</text>
  <rect x="360" y="14" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="360" y="14" width="120" height="18" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="486.0" y="27.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="360" y="32" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="45.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="360" y="50" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="63.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="360" y="68" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="81.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">3</text>
  <rect x="360" y="86" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="99.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">4</text>
  <rect x="360" y="104" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="117.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">5</text>
  <rect x="360" y="122" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="360" y="122" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="486.0" y="135.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">6</text>
  <rect x="360" y="140" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="153.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">7</text>
  <rect x="360" y="158" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="360" y="158" width="120" height="18" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="486.0" y="171.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">8</text>
  <rect x="360" y="176" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="189.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">9</text>
  <rect x="360" y="194" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="207.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">10</text>
  <rect x="360" y="212" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="225.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">11</text>
  <rect x="360" y="230" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="243.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">12</text>
  <rect x="360" y="248" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="261.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">13</text>
  <rect x="360" y="266" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="360" y="266" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="486.0" y="279.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">14</text>
  <rect x="360" y="284" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.0" y="297.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">15</text>
  <text x="420.0" y="318.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">main memory (16 blocks)</text>
  <line x1="360" y1="23" x2="163" y2="65" stroke="#3b82f6" stroke-width="1.3" marker-end="url(#arr-dm)"/>
  <line x1="360" y1="167" x2="163" y2="73" stroke="#3b82f6" stroke-width="1.3" marker-end="url(#arr-dm)"/>
  <line x1="360" y1="131" x2="163" y2="173" stroke="#ef4444" stroke-width="1.3" marker-end="url(#arr-dm)"/>
  <line x1="360" y1="275" x2="163" y2="181" stroke="#ef4444" stroke-width="1.3" marker-end="url(#arr-dm)"/>
  <text x="510.0" y="135.0" text-anchor="start" font-size="10" fill="#ef4444">6 mod 8 = 6</text>
  <text x="510.0" y="279.0" text-anchor="start" font-size="10" fill="#ef4444">14 mod 8 = 6</text>
</svg>
<figcaption>Direct mapping of 16 memory blocks onto an 8-block cache. Blocks 6 and 14 map to cache block 6, and blocks 0 and 8 to cache block 0.</figcaption>
</figure>

<div class="example">

A 32-bit address, a 16 KB cache and 32 B blocks. Find the widths of the tag, index and offset.

</div>

- Number of cache blocks $= 16\text{ KB}/32\text{ B} = 512$, so the index (which cache block) is $\log_2 512 = 9$ bits.
- The offset (which byte in the block) is $\log_2 32 = 5$ bits.
- The tag (which memory block is in this cache block) is $32 - 9 - 5 = 18$ bits.

<figure class="fig">
<svg viewBox="0 0 510 276" width="510" role="img" aria-label="Lookup in a direct-mapped cache: index selects the entry, the tag is compared and ANDed with the valid bit">
  <defs><marker id="arr-dmh" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="14" width="150" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="30.9" text-anchor="middle" font-size="11" fill="currentColor">tag (18)</text>
  <rect x="170" y="14" width="90" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="30.9" text-anchor="middle" font-size="11" fill="currentColor">index (9)</text>
  <rect x="260" y="14" width="60" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="290.0" y="30.9" text-anchor="middle" font-size="11" fill="currentColor">offset (5)</text>
  <rect x="160" y="70" width="60" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="220" y="70" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="242" y="70" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="160" y="84" width="60" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="220" y="84" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="242" y="84" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="160" y="98" width="60" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="220" y="98" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="242" y="98" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="160" y="112" width="60" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="220" y="112" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="242" y="112" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="160" y="126" width="60" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="220" y="126" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="242" y="126" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="160" y="140" width="60" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="220" y="140" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="242" y="140" width="22" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="160" y="140" width="104" height="14" fill="#ef4444" opacity=".25"/>
  <text x="190.0" y="151.0" text-anchor="middle" font-size="9" fill="currentColor">tag</text>
  <text x="231.0" y="151.0" text-anchor="middle" font-size="9" fill="currentColor">V</text>
  <text x="253.0" y="151.0" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <text x="212.0" y="64.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">directory</text>
  <rect x="330" y="70" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="370" y="70" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="410" y="70" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="450" y="70" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="330" y="84" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="370" y="84" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="410" y="84" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="450" y="84" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="330" y="98" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="370" y="98" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="410" y="98" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="450" y="98" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="330" y="112" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="370" y="112" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="410" y="112" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="450" y="112" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="330" y="126" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="370" y="126" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="410" y="126" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="450" y="126" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="330" y="140" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="370" y="140" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="410" y="140" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="450" y="140" width="40" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="330" y="140" width="160" height="14" fill="#ef4444" opacity=".25"/>
  <text x="410.0" y="64.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">data</text>
  <polyline points="215,40 215,52 145,52 145,147 157,147" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-dmh)"/>
  <text x="140.0" y="100.0" text-anchor="end" font-size="10" fill="#ef4444">index</text>
  <line x1="264" y1="147" x2="327" y2="147" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-dmh)"/>
  <circle cx="190" cy="200" r="15" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190.0" y="204.0" text-anchor="middle" font-size="13" fill="currentColor">=</text>
  <line x1="190" y1="154" x2="190" y2="182" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dmh)"/>
  <polyline points="60,40 60,200 172,200" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmh)"/>
  <text x="66.0" y="192.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">tag</text>
  <rect x="250" y="238" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="275.0" y="254.8" text-anchor="middle" font-size="11" fill="currentColor">AND</text>
  <polyline points="231,154 231,245 247,245" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmh)"/>
  <text x="237.0" y="200.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">valid</text>
  <polyline points="190,215 190,257 247,257" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmh)"/>
  <line x1="300" y1="251" x2="350" y2="251" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dmh)"/>
  <text x="356.0" y="255.0" text-anchor="start" font-size="12" fill="currentColor">hit</text>
  <line x1="410" y1="154" x2="410" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dmh)"/>
  <text x="410.0" y="214.0" text-anchor="middle" font-size="11" fill="currentColor">data</text>
</svg>
<figcaption>Accessing a block in a direct-mapped cache. The index selects an entry, and there is a hit if its tag equals the address tag and the valid bit is set.</figcaption>
</figure>

The index is the low-order bits of the block number $M$ (that is, $M \bmod N$), and the tag is the remaining high-order bits. So consecutive memory blocks go to consecutive cache blocks, and two memory blocks compete for the same cache block only if they are a multiple of $N$ blocks (the cache size) apart, like blocks 6 and 14 above. The tag tells such blocks apart.

The problem with direct mapping: if a program alternately accesses $A, B, A, B, \dots$ and $A$ and $B$ map to the same cache block, every access is a miss, even if the rest of the cache is empty.

#### Set-Associative Mapping

<div class="definition">

In a *set-associative* cache the blocks are divided into $S$ sets. Memory block $M$ is placed in set $M \bmod S$, in any block of that set. If each set has $k$ blocks, the cache is *$k$-way set associative*.

</div>

<figure class="fig">
<svg viewBox="0 0 600 324" width="600" role="img" aria-label="2-way set-associative placement: memory blocks 3, 7, 11 and 15 can go in either way of set 3">
  <defs><marker id="arr-sa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="90" y="60" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="84.0" y="73.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="68.0" y="82.0" text-anchor="end" font-size="10" fill="currentColor">set 0</text>
  <line x1="72" y1="60" x2="210" y2="60" stroke="currentColor" stroke-width="2.2"/>
  <rect x="90" y="78" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="84.0" y="91.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">1</text>
  <rect x="90" y="96" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="84.0" y="109.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">2</text>
  <text x="68.0" y="118.0" text-anchor="end" font-size="10" fill="currentColor">set 1</text>
  <line x1="72" y1="96" x2="210" y2="96" stroke="currentColor" stroke-width="2.2"/>
  <rect x="90" y="114" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="84.0" y="127.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">3</text>
  <rect x="90" y="132" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="84.0" y="145.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">4</text>
  <text x="68.0" y="154.0" text-anchor="end" font-size="10" fill="currentColor">set 2</text>
  <line x1="72" y1="132" x2="210" y2="132" stroke="currentColor" stroke-width="2.2"/>
  <rect x="90" y="150" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="84.0" y="163.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">5</text>
  <rect x="90" y="168" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="90" y="168" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="84.0" y="181.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">6</text>
  <text x="68.0" y="190.0" text-anchor="end" font-size="10" fill="currentColor">set 3</text>
  <line x1="72" y1="168" x2="210" y2="168" stroke="currentColor" stroke-width="2.2"/>
  <rect x="90" y="186" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="90" y="186" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="84.0" y="199.0" text-anchor="end" font-size="9" fill="currentColor" class="dim">7</text>
  <line x1="72" y1="204" x2="210" y2="204" stroke="currentColor" stroke-width="2.2"/>
  <text x="150.0" y="52.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">cache: 4 sets × 2 ways</text>
  <rect x="400" y="14" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="27.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="400" y="32" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="45.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="400" y="50" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="63.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="400" y="68" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="68" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="526.0" y="81.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">3</text>
  <rect x="400" y="86" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="99.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">4</text>
  <rect x="400" y="104" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="117.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">5</text>
  <rect x="400" y="122" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="135.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">6</text>
  <rect x="400" y="140" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="140" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="526.0" y="153.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">7</text>
  <rect x="400" y="158" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="171.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">8</text>
  <rect x="400" y="176" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="189.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">9</text>
  <rect x="400" y="194" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="207.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">10</text>
  <rect x="400" y="212" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="212" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="526.0" y="225.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">11</text>
  <rect x="400" y="230" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="243.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">12</text>
  <rect x="400" y="248" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="261.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">13</text>
  <rect x="400" y="266" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="526.0" y="279.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">14</text>
  <rect x="400" y="284" width="120" height="18" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="284" width="120" height="18" rx="0" fill="#ef4444" opacity=".3"/>
  <text x="526.0" y="297.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">15</text>
  <text x="460.0" y="318.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">main memory (16 blocks)</text>
  <line x1="400" y1="77" x2="213" y2="174" stroke="#ef4444" stroke-width="1.3" marker-end="url(#arr-sa)"/>
  <line x1="400" y1="149" x2="213" y2="182" stroke="#ef4444" stroke-width="1.3" marker-end="url(#arr-sa)"/>
  <line x1="400" y1="221" x2="213" y2="190" stroke="#ef4444" stroke-width="1.3" marker-end="url(#arr-sa)"/>
  <line x1="400" y1="293" x2="213" y2="198" stroke="#ef4444" stroke-width="1.3" marker-end="url(#arr-sa)"/>
  <text x="150.0" y="226.0" text-anchor="middle" font-size="10" fill="#ef4444">blocks 3, 7, 11, 15: each mod 4 = 3</text>
</svg>
<figcaption>A 2-way set-associative cache with 8 blocks in 4 sets.</figcaption>
</figure>

The index field selects a set ($\log_2 S$ bits), and all the blocks in the set are checked in parallel:

<figure class="fig">
<svg viewBox="0 0 630 391" width="630" role="img" aria-label="Lookup in a 2-way set-associative cache: both tags of the set are compared in parallel">
  <defs><marker id="arr-2w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="14" width="130" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="85.0" y="30.9" text-anchor="middle" font-size="11" fill="currentColor">tag</text>
  <rect x="150" y="14" width="80" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190.0" y="30.9" text-anchor="middle" font-size="11" fill="currentColor">index</text>
  <rect x="230" y="14" width="60" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="30.9" text-anchor="middle" font-size="11" fill="currentColor">offset</text>
  <rect x="200" y="70" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="70" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="70" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="84" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="84" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="84" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="98" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="98" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="98" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="112" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="112" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="112" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="126" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="126" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="126" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="140" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="140" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="140" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="140" width="90" height="14" fill="#ef4444" opacity=".25"/>
  <text x="225.0" y="151.0" text-anchor="middle" font-size="9" fill="currentColor">tag</text>
  <text x="260.0" y="151.0" text-anchor="middle" font-size="9" fill="currentColor">V</text>
  <text x="280.0" y="151.0" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="340" y="70" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="70" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="70" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="70" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="84" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="84" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="84" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="84" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="98" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="98" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="98" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="98" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="112" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="112" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="112" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="112" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="126" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="126" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="126" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="126" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="140" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="140" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="140" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="140" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="140" width="144" height="14" fill="#ef4444" opacity=".25"/>
  <text x="245.0" y="64.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">way 0: tags</text>
  <text x="412.0" y="64.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">way 0: data</text>
  <rect x="200" y="245" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="245" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="245" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="259" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="259" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="259" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="273" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="273" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="273" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="287" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="287" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="287" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="301" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="301" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="301" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="315" width="50" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="250" y="315" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="270" y="315" width="20" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="200" y="315" width="90" height="14" fill="#ef4444" opacity=".25"/>
  <text x="225.0" y="326.0" text-anchor="middle" font-size="9" fill="currentColor">tag</text>
  <text x="260.0" y="326.0" text-anchor="middle" font-size="9" fill="currentColor">V</text>
  <text x="280.0" y="326.0" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="340" y="245" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="245" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="245" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="245" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="259" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="259" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="259" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="259" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="273" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="273" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="273" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="273" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="287" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="287" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="287" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="287" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="301" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="301" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="301" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="301" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="315" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="376" y="315" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="412" y="315" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="448" y="315" width="36" height="14" stroke="currentColor" stroke-width="1" fill="none"/>
  <rect x="340" y="315" width="144" height="14" fill="#ef4444" opacity=".25"/>
  <text x="245.0" y="239.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">way 1: tags</text>
  <text x="412.0" y="239.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">way 1: data</text>
  <polyline points="190,40 190,52 180,52 180,322 197,322" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-2w)"/>
  <line x1="180" y1="147" x2="197" y2="147" stroke="#ef4444" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <text x="174.0" y="110.0" text-anchor="end" font-size="10" fill="#ef4444">index</text>
  <circle cx="225" cy="186" r="15" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="190.0" text-anchor="middle" font-size="13" fill="currentColor">=</text>
  <line x1="225" y1="154" x2="225" y2="168" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <circle cx="225" cy="361" r="15" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="365.0" text-anchor="middle" font-size="13" fill="currentColor">=</text>
  <line x1="225" y1="329" x2="225" y2="343" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <polyline points="60,40 60,361 207,361" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-2w)"/>
  <line x1="60" y1="186" x2="207" y2="186" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <text x="66.0" y="180.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">tag</text>
  <circle cx="315" cy="361" r="16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="315.0" y="365.0" text-anchor="middle" font-size="10" fill="currentColor">OR</text>
  <polyline points="240,186 315,186 315,342" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-2w)"/>
  <line x1="240" y1="361" x2="296" y2="361" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <line x1="331" y1="361" x2="370" y2="361" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <text x="376.0" y="365.0" text-anchor="start" font-size="12" fill="currentColor">hit</text>
  <rect x="520" y="137" width="24" height="195" rx="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="532.0" y="237.5" text-anchor="middle" font-size="7" fill="currentColor">MUX</text>
  <line x1="484" y1="147" x2="517" y2="147" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <line x1="484" y1="322" x2="517" y2="322" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <line x1="544" y1="234.5" x2="580" y2="234.5" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-2w)"/>
  <text x="584.0" y="238.5" text-anchor="start" font-size="11" fill="currentColor">data</text>
</svg>
<figcaption>Lookup in a 2-way set-associative cache. The index selects a set, both tags are compared in parallel, the results are ORed to give the hit signal, and the multiplexer selects the data of the matching way.</figcaption>
</figure>

- A direct-mapped cache is 1-way set associative ($S = N$).
- A fully associative cache has a single set ($S = 1$), so a block can be placed anywhere and there are no index bits. The tag is compared with all the tags in the cache, which needs a large associative memory (high cost, not scalable), but any replacement policy can be used.
- Typical values are 2, 4 or 8 ways. A set-associative cache needs several small associative memories, only one of which is used at a time.
- **Hardware for a hit.** With $k$-way set-associative mapping the address tag is compared only with the $k$ tags of one set, whereas a fully associative cache compares it with the tag of every line [[3]](#ref-3). The tag memory, the comparators and the data memory are replicated $k$ times, and a $k$:1 multiplexer selects the data of the way that hit [[4]](#ref-4). Each comparator is as wide as the tag. The multiplexer adds to the hit time: in an example of H&P (a 128 KB cache with 64 B blocks), the clock of the 2-way set-associative version is assumed 1.35 times longer than that of the direct-mapped one to accommodate it.

<figure class="table">
<figcaption>Address fields for a 24-bit word address, a cache of 256 blocks of 32 words (8K words), and a main memory of 16M words (512K blocks).</figcaption>

| Mapping | Tag | Index / set | Word |
|:--|:-:|:-:|:-:|
| Direct | 11 | 8 (256 blocks) | 5 |
| 4-way set associative | 13 | 6 (64 sets) | 5 |
| Fully associative | 19 | — | 5 |

</figure>

In general, with block size $B$, $N$ cache blocks and $k$ ways:

$$\text{offset} = \log_2 B, \qquad \text{index} = \log_2 \frac{N}{k}, \qquad \text{tag} = \text{address bits} - \text{index} - \text{offset}$$

Doubling the associativity moves one bit from the index to the tag. The tag directory has $N \times (\text{tag} + \text{valid} + \text{dirty} + \text{replacement bits})$ bits.

### Block Identification

Each cache block has a tag. The tags of all the blocks where the requested block may be are compared with the tag field of the address, in parallel.

- Direct mapping: one comparison.
- $k$-way set associative: $k$ comparisons, in the selected set.
- Fully associative: a comparison with every tag.

A **valid bit** with each tag indicates whether the block contains valid data. If it is not set, the tag need not be matched.

### Block Replacement

- With direct mapping there is no choice, since the placement is unique.
- With set-associative mapping, one block in the set must be selected:
  - **FIFO:** the block that has been in the set longest;
  - **LRU:** the block that has not been used for the longest time;
  - **Random:** a randomly chosen block.

For LRU the hardware keeps track of usage in the cache directory; a 2-way cache needs 1 bit per set. In a 4-way cache, a 2-bit counter can be kept with each block:

- On a hit, the counter of the referenced block is set to 0, the counters lower than its original value are incremented, and the others are unchanged.
- On a miss, if the set is not full, the counter of the new block is set to 0 and all the others are incremented.
- On a miss, if the set is full, the block with counter 3 is replaced, its counter is set to 0, and the other three are incremented.

### Write Policies

Reads dominate cache accesses: all instruction fetches are reads, and most instructions do not write to memory. A read can be done while the tag is compared, and the data is discarded on a miss. A write takes longer: only part of the block (1 to 8 bytes) is changed, so it is a read-modify-write, and it cannot begin until the tag check shows a hit.

#### Write Hit

**Write through:** the data is written both to the cache and to main memory.

- Cache and main memory are consistent; main memory has the latest data, which is needed for I/O and multiprocessors.
- A read miss does not cause a write to memory.
- Multiple writes to the same block cause high memory traffic, and a write has to wait for memory.

A **write buffer** is used to reduce the stall time: the CPU writes into the buffer, and the buffer writes to memory.

**Write back:** the data is written only to the cache. A modified block is written to memory only when it is replaced.

- A **dirty (modified) bit** is kept for each block; a clean block is not written back on replacement.
- Writes are done at cache speed, and several writes to a block need only one write to memory, so less memory bandwidth is used.
- The cache and memory copies are not always the same.

#### Write Miss

- **Write allocate:** the block is loaded into the cache, and the write is then done as a write hit.
- **No-write allocate:** the block is written directly in main memory and is not loaded into the cache.

The usual combinations are:

- write back with write allocate, so that later writes to the block are done in the cache;
- write through with no-write allocate, since later writes have to go to memory anyway.

<figure class="table">
<figcaption>Miss penalties ($t_{MM}$ is the main-memory access time).</figcaption>

| Cache | Operation | Penalty |
|:--|:--|:--|
| Write through | write hit, no write buffer | $t_{MM}$ |
| Write through | write hit, perfect write buffer | 0 |
| Write back | write hit | 0 |
| Write back + write allocate | miss, replaced block clean | $t_{MM}$ |
| Write back + write allocate | miss, replaced block dirty | $2\,t_{MM}$ |

</figure>

With a dirty replaced block, the old block is written to memory and then the new block is read, so the penalty is $2\,t_{MM}$.

### Types of Cache Misses

1. **Compulsory miss** (cold-start miss): the first access to a block is a miss, unless prefetching is used. It occurs even in an infinite cache. It can be reduced by a larger block size, which reduces the number of memory blocks.
2. **Capacity miss:** a block is replaced because the cache cannot hold all the blocks the program needs, and is accessed again later. It would be avoided with a larger cache. To decide whether a miss is a capacity miss, the cache is assumed to be fully associative.
3. **Conflict miss:** in a direct-mapped or set-associative cache, a block is replaced because several blocks map to the same set, and is accessed again later. It would not occur in a fully associative cache with LRU. Conflict misses increase from fully associative to set associative to direct mapped, and are reduced by higher associativity.

<div class="example">

Physical memory is 1 MB and the cache is 8 KB, direct mapped, with 32 B blocks. Classify the misses for the block sequence 2, 216, 100, 256, 2048, 728, 256, 216.

</div>

The physical address is 20 bits: offset $\log_2 32 = 5$, index $\log_2 (8\text{ KB}/32\text{ B}) = 8$, and tag $20 - 8 - 5 = 7$ bits, since $1\text{ MB}/8\text{ KB} = 128$ memory blocks map to each cache block. Memory block $M$ goes to cache block $M \bmod 256$.

<figure class="table">
<figcaption>Classification of the accesses.</figcaption>

| Block | Cache block | Result |
|:-:|:-:|:--|
| 2 | 2 | compulsory miss |
| 216 | 216 | compulsory miss |
| 100 | 100 | compulsory miss |
| 256 | 0 | compulsory miss |
| 2048 | 0 | compulsory miss (replaces 256) |
| 728 | 216 | compulsory miss (replaces 216) |
| 256 | 0 | conflict miss |
| 216 | 216 | conflict miss |

</figure>

The first six are first accesses to their blocks. The last two blocks were in the cache and were replaced because of a conflict.

### Cache and Programming

For the analysis, the program is viewed close to machine code, to see the loads and stores.

<div class="example">

A data cache is 16 KB, direct mapped, write back, with 32 B blocks (tag 18, index 9, offset 5 bits). Find the hit ratio of the loop below, assuming `i` and `sum` are in registers and the cache is initially empty.

</div>

```c
double A[2048], sum = 0.0;
for (i = 0; i < 2048; i++) sum = sum + A[i];
```

The reference sequence is load `A[0]`, `A[1]`, …, `A[2047]`. Let the base address of `A` be `0xA000`. An element is 8 B, so 4 consecutive elements fit in a 32 B block.

<figure class="table">
<figcaption>Accesses to the array.</figcaption>

| Element | Address | Result |
|:--|:-:|:--|
| A[0] | 0xA000 | miss (compulsory) |
| A[1]–A[3] | 0xA008–0xA018 | hit |
| A[4] | 0xA020 | miss (compulsory) |
| A[5]–A[7] | 0xA028–0xA038 | hit |
| ⋮ | ⋮ | ⋮ |
| A[2044] | 0xDFE0 | miss (compulsory) |
| A[2045]–A[2047] | 0xDFE8–0xDFF8 | hit |

</figure>

Each block gives one compulsory miss and three hits, so the hit ratio is 75%.

**Two-dimensional arrays.** In C an array `x[i][j]` is stored in **row-major** order: `x[i][j]` and `x[i][j+1]` are adjacent. Nested loops that run down a column skip through memory and use one word of each block before it is replaced; exchanging the loops (**loop interchange**) accesses all the words of a block before moving to the next [[4]](#ref-4):

<div class="code-pair">

```c
/* Before: strides of 100 words */
for (j = 0; j < 100; j++)
    for (i = 0; i < 5000; i++)
        x[i][j] = 2 * x[i][j];
```

```c
/* After: consecutive words */
for (i = 0; i < 5000; i++)
    for (j = 0; j < 100; j++)
        x[i][j] = 2 * x[i][j];
```

</div>

Assuming the array does not fit in the cache, the interchange reduces misses by improving spatial locality, without changing the number of instructions executed.

### Cache Performance

$$\text{effective } CPI = CPI_{\text{base}} + \text{memory stall cycles per instruction}$$

<div class="example">

The base CPI is 1.1, the instruction mix is ALU 50%, load 15%, store 15%, branch 20%, the miss rate is 1.5% and the miss penalty is 50 cycles. Find the effective CPI for a unified write-through, no-write-allocate L1 cache with (a) no write buffer, (b) a perfect write buffer, (c) a write buffer that eliminates 85% of the write stalls.

</div>

There are $1 + 0.15 + 0.15 = 1.3$ memory accesses per instruction: $1.15$ reads (instruction fetch and load) and $0.15$ writes.

- (a) All writes stall: $50 \times (1.15 \times 0.015 + 0.15) = 8.36$, so $CPI = 9.46$.
- (b) Only read misses stall: $50 \times 1.15 \times 0.015 = 0.86$, so $CPI = 1.96$.
- (c) $50 \times (1.15 \times 0.015 + 0.15 \times 0.15) = 1.99$, so $CPI = 3.09$.

For a write-back, write-allocate cache in which 10% of the blocks are dirty, a miss costs 50 cycles for a clean block and 100 for a dirty one:

$$\text{stalls per access} = 0.015\,(0.9 \times 50 + 0.1 \times 100) = 0.825, \qquad CPI = 1.1 + 1.3 \times 0.825 = 2.17$$

### Improving Cache Performance

$$\text{AMAT} = \text{hit time} + \text{miss rate} \times \text{miss penalty}$$

The techniques reduce one of these three terms.

Reducing the miss rate:

1. **Larger block size.** Reduces compulsory misses. But the miss penalty increases, and since there are fewer blocks, conflict and capacity misses may increase. High latency and high bandwidth of the lower level favour large blocks; low latency and low bandwidth favour small ones. For example, the ARM Cortex-A8 and A9 described in H&P and the Ryzen 7 5800H all use 64 B blocks.
2. **Larger cache.** Reduces capacity misses, but increases the hit time, the cost and the power.
3. **Higher associativity.** Reduces conflict misses, but increases the hit time and the power. As a rule of thumb, an 8-way cache is as effective as a fully associative one, and a direct-mapped cache of size $N$ has about the same miss rate as a 2-way cache of size $N/2$.

Reducing the miss penalty:

4. **Multi-level caches.** The L1 cache is small enough to match the clock of the processor, and the L2 cache is large enough to capture many of the accesses that would go to main memory.

$$\text{AMAT} = \text{HitTime}_{L1} + \text{MissRate}_{L1} \times \big(\text{HitTime}_{L2} + \text{MissRate}_{L2} \times \text{MissPenalty}_{L2}\big)$$

   - The **local miss rate** of a cache is the number of its misses divided by the number of accesses to it: $\text{MissRate}_{L1}$, $\text{MissRate}_{L2}$.
   - The **global miss rate** is the number of its misses divided by the total number of memory accesses by the processor: $\text{MissRate}_{L1}$ for L1, and $\text{MissRate}_{L1} \times \text{MissRate}_{L2}$ for L2.
   - The local miss rate of L2 is large, since L1 takes most of the accesses, so the global miss rate is the more useful measure.

5. **Priority to read misses over writes.** The write buffer may hold the updated value of a location needed on a read miss. Instead of waiting until the buffer is empty, the read miss checks the buffer for a conflict and continues if there is none.

Reducing the hit time:

6. **Avoiding address translation during cache indexing** (next section).

<div class="example">

In 1000 memory references there are 60 misses in L1 and 15 misses in L2. $\text{HitTime}_{L1} = 1$, $\text{HitTime}_{L2} = 12$ and $\text{MissPenalty}_{L2} = 180$ cycles. Find the miss rates and the AMAT (average memory access time).

</div>

$\text{MissRate}_{L1} = 60/1000 = 6\%$ (local and global). For L2, the local miss rate is $15/60 = 25\%$ and the global miss rate is $15/1000 = 1.5\%$.

$$\text{AMAT} = 1 + 0.06\,(12 + 0.25 \times 180) = 1 + 0.06 \times 57 = 4.42 \text{ cycles}$$

- **Multi-level inclusion:** the data in L1 is always present in L2, so consistency between I/O and the caches can be checked in L2 alone.
- **Multi-level exclusion:** the data in L1 is never in L2; a miss in L1 swaps blocks between L1 and L2. This avoids wasting L2 space when L2 is only slightly larger than L1.

> **Note.** In `SW $t1, 512($zero)`; `LW $t2, 1024($zero)`; `LW $t3, 512($zero)`, suppose 512 and 1024 map to the same block of a direct-mapped write-through cache, and the 4-word write buffer is not checked on a read miss. The stored value may still be in the write buffer when the last load misses and reads memory, so `$t3` may differ from `$t1`.

Other optimizations (Hennessy & Patterson):

- small and simple L1 caches, and way prediction, to reduce the hit time;
- pipelined and multi-banked caches, to increase the bandwidth;
- critical word first and early restart, to reduce the miss penalty;
- compiler optimizations, to reduce the miss rate;
- prefetching of instructions and data.

### Caches and Address Translation

Every memory access needs a translation from virtual to physical address (by the memory management unit, MMU, and its translation lookaside buffer, TLB; see Part II), and the cache can be accessed before or after it.

<figure class="fig">
<svg viewBox="0 0 640 368" width="640" role="img" aria-label="Physically addressed, virtually addressed and virtually indexed physically tagged caches">
  <defs><marker id="arr-vt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20.0" y="22.0" text-anchor="start" font-size="12" fill="currentColor">(a) physically addressed (PIPT)</text>
  <line x1="20" y1="55" x2="77" y2="55" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vt)"/>
  <text x="48.0" y="48.0" text-anchor="middle" font-size="11" fill="currentColor">VA</text>
  <ellipse cx="130" cy="55" rx="50" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="59.2" text-anchor="middle" font-size="12" fill="currentColor">MMU</text>
  <line x1="180" y1="55" x2="257" y2="55" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vt)"/>
  <text x="218.0" y="48.0" text-anchor="middle" font-size="11" fill="currentColor">PA</text>
  <ellipse cx="310" cy="55" rx="50" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="59.2" text-anchor="middle" font-size="12" fill="currentColor">Cache</text>
  <text x="380.0" y="59.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">translate first: hit time includes the MMU</text>
  <text x="20.0" y="122.0" text-anchor="start" font-size="12" fill="currentColor">(b) virtually addressed (VIVT)</text>
  <line x1="20" y1="155" x2="77" y2="155" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vt)"/>
  <text x="48.0" y="148.0" text-anchor="middle" font-size="11" fill="currentColor">VA</text>
  <ellipse cx="130" cy="155" rx="50" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="159.2" text-anchor="middle" font-size="12" fill="currentColor">Cache</text>
  <line x1="180" y1="155" x2="257" y2="155" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-vt)"/>
  <text x="218.0" y="148.0" text-anchor="middle" font-size="11" fill="currentColor">VA</text>
  <text x="218.0" y="174.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">only on a miss</text>
  <ellipse cx="310" cy="155" rx="50" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="159.2" text-anchor="middle" font-size="12" fill="currentColor">MMU</text>
  <text x="380.0" y="159.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">no translation on a hit</text>
  <text x="20.0" y="220.0" text-anchor="start" font-size="12" fill="currentColor">(c) virtually indexed, physically tagged (VIPT)</text>
  <line x1="20" y1="281" x2="60" y2="281" stroke="currentColor" stroke-width="1.5"/>
  <line x1="60" y1="250" x2="60" y2="312" stroke="currentColor" stroke-width="1.5"/>
  <line x1="60" y1="250" x2="97" y2="250" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vt)"/>
  <line x1="60" y1="312" x2="97" y2="312" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-vt)"/>
  <text x="36.0" y="274.0" text-anchor="middle" font-size="11" fill="currentColor">VA</text>
  <ellipse cx="150" cy="250" rx="50" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150.0" y="254.2" text-anchor="middle" font-size="12" fill="currentColor">MMU</text>
  <ellipse cx="150" cy="312" rx="50" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150.0" y="316.2" text-anchor="middle" font-size="12" fill="currentColor">Cache</text>
  <polyline points="200,250 230,250 230,312 203,312" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-vt)"/>
  <text x="238.0" y="280.0" text-anchor="start" font-size="11" fill="currentColor">PA: tag compare</text>
  <text x="120.0" y="352.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">index with VA bits while the MMU translates</text>
  <text x="380.0" y="284.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">overlapped: typical for L1 caches</text>
</svg>
<figcaption>Cache and address translation.</figcaption>
</figure>

**Physically addressed cache (PIPT).** The address is translated first, and the cache is indexed and tagged with the physical address. The hit time is higher, since every access goes through the MMU.

**Virtually addressed cache (VIVT).** The cache is indexed and tagged with the virtual address, and the MMU is used only on a miss. The problems are:

- **Homonyms:** the same virtual address in different processes refers to different data. Either the cache is flushed on a context switch, or the process id is included in each cache directory entry.
- **Synonyms:** different virtual addresses that translate to the same physical address can give more than one copy of a block in the cache.
- Page-level protection is not possible, and I/O (which uses physical addresses) complicates the design.

**Virtually indexed, physically tagged cache (VIPT).** The cache is indexed with virtual-address bits while the MMU translates, and the tag is compared with the physical address. This is typical of L1 caches. If the index and offset bits are all within the page offset, they are the same in the virtual and the physical address, and there are no synonyms:

$$\text{index bits} + \text{offset bits} \le \text{page-offset bits} \quad\Longleftrightarrow\quad \frac{\text{cache size}}{\text{associativity}} \le \text{page size}$$

<div class="example">

16 KB pages, 32-bit addresses, and a 64 KB direct-mapped cache with 32 B blocks.

</div>

- PIPT: the virtual page number (18 bits) is translated, and the physical address is split into tag 16, index 11 ($64\text{ KB}/32\text{ B} = 2048$ blocks) and offset 5 bits.
- VIPT: the page offset is $\log_2 16\text{K} = 14$ bits, but the index and offset need $11 + 5 = 16$ bits, so 2 index bits come from the virtual page number. Two virtual addresses for the same physical page that differ in these bits are placed in different sets (synonyms). A 4-way cache (16 KB per way) would avoid this.

<figure class="fig">
<svg viewBox="0 0 700 154" width="700" role="img" aria-label="In a 64 KB direct-mapped cache with 16 KB pages, two index bits lie above the page offset">
  <defs><marker id="arr-vb" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="80.0" y="38.0" text-anchor="end" font-size="12" fill="currentColor">VA</text>
  <rect x="90" y="20" width="324" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="252.0" y="36.9" text-anchor="middle" font-size="11" fill="currentColor">virtual page number (18)</text>
  <rect x="414" y="20" width="252" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="414" y="20" width="252" height="26" rx="0" fill="#22c55e" opacity=".25"/>
  <text x="540.0" y="36.9" text-anchor="middle" font-size="11" fill="currentColor">page offset (14)</text>
  <text x="80.0" y="98.0" text-anchor="end" font-size="12" fill="currentColor">cache</text>
  <rect x="90" y="80" width="288" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="234.0" y="96.8" text-anchor="middle" font-size="11" fill="currentColor">tag (16)</text>
  <rect x="378" y="80" width="198" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="378" y="80" width="198" height="26" rx="0" fill="#3b82f6" opacity=".25"/>
  <text x="477.0" y="96.8" text-anchor="middle" font-size="11" fill="currentColor">index (11)</text>
  <rect x="576" y="80" width="90" height="26" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="621.0" y="96.8" text-anchor="middle" font-size="11" fill="currentColor">offset (5)</text>
  <rect x="378" y="80" width="36" height="26" fill="#ef4444" opacity=".45"/>
  <rect x="378" y="20" width="36" height="26" fill="#ef4444" opacity=".45"/>
  <line x1="378" y1="46" x2="378" y2="80" stroke="#ef4444" stroke-width="1" stroke-dasharray="4 3"/>
  <line x1="414" y1="46" x2="414" y2="80" stroke="#ef4444" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="396.0" y="128.0" text-anchor="middle" font-size="11" fill="#ef4444">2 index bits come from the VPN</text>
  <text x="396.0" y="143.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">→ synonyms can sit in different sets</text>
</svg>
<figcaption>VIPT example: two index bits (red) are above the page offset.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 660 652" width="660" role="img" aria-label="Flow of an address through the TLB, page table and cache">
  <defs><marker id="arr-flow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="210.0" y="12.0" width="220" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="320.0" y="29.0" text-anchor="middle" font-size="12" fill="currentColor">CPU generates virtual address</text>
  <text x="320.0" y="43.0" text-anchor="middle" font-size="12" fill="currentColor">(page p, offset d)</text>
  <polygon points="320,74 420,112 320,150 220,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="320.0" y="109.0" text-anchor="middle" font-size="11" fill="currentColor">entry for p</text>
  <text x="320.0" y="123.0" text-anchor="middle" font-size="11" fill="currentColor">in TLB?</text>
  <rect x="50.0" y="168.0" width="180" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="183.0" text-anchor="middle" font-size="12" fill="currentColor">use p to index</text>
  <text x="140.0" y="197.0" text-anchor="middle" font-size="12" fill="currentColor">the page table</text>
  <polygon points="140,224 235,262 140,300 45,262" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="259.0" text-anchor="middle" font-size="11" fill="currentColor">p valid in</text>
  <text x="140.0" y="273.0" text-anchor="middle" font-size="11" fill="currentColor">page table?</text>
  <rect x="270.0" y="246.0" width="110" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="325.0" y="266.0" text-anchor="middle" font-size="12" fill="currentColor">update TLB</text>
  <polygon points="505,224 590,262 505,300 420,262" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="505.0" y="259.0" text-anchor="middle" font-size="11" fill="currentColor">block in</text>
  <text x="505.0" y="273.0" text-anchor="middle" font-size="11" fill="currentColor">cache?</text>
  <rect x="430.0" y="324.0" width="150" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="505.0" y="344.0" text-anchor="middle" font-size="12" fill="currentColor">load block into cache</text>
  <rect x="430.0" y="393.0" width="150" height="34" rx="3" stroke="#22c55e" stroke-width="1.5" fill="none"/>
  <text x="505.0" y="414.0" text-anchor="middle" font-size="12" fill="currentColor">access data</text>
  <polygon points="140,333 225,369 140,405 55,369" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="366.0" text-anchor="middle" font-size="11" fill="currentColor">memory</text>
  <text x="140.0" y="380.0" text-anchor="middle" font-size="11" fill="currentColor">full?</text>
  <rect x="40.0" y="430.0" width="200" height="38" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="446.0" text-anchor="middle" font-size="12" fill="currentColor">choose victim page;</text>
  <text x="140.0" y="460.0" text-anchor="middle" font-size="12" fill="currentColor">write back if dirty</text>
  <rect x="40.0" y="498.0" width="200" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="513.0" text-anchor="middle" font-size="12" fill="currentColor">read page p from disk</text>
  <text x="140.0" y="527.0" text-anchor="middle" font-size="12" fill="currentColor">into the frame</text>
  <rect x="50.0" y="561.0" width="180" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="580.0" text-anchor="middle" font-size="12" fill="currentColor">update page table</text>
  <rect x="50.0" y="615.0" width="180" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="634.0" text-anchor="middle" font-size="12" fill="currentColor">update TLB</text>
  <polyline points="320,52 320,71" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <polyline points="420,112 505,112 505,221" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="428.0" y="104.0" text-anchor="start" font-size="11" fill="#22c55e">yes (TLB hit): frame known</text>
  <polyline points="220,112 140,112 140,165" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="212.0" y="104.0" text-anchor="end" font-size="11" fill="#ef4444">no (TLB miss)</text>
  <polyline points="140,204 140,221" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <polyline points="235,262 267,262" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="250.0" y="254.0" text-anchor="middle" font-size="11" fill="currentColor">yes</text>
  <polyline points="380,262 417,262" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <polyline points="590,262 612,262 612,410 583,410" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="616.0" y="254.0" text-anchor="start" font-size="11" fill="currentColor">yes</text>
  <polyline points="505,303 505,321" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="512.0" y="316.0" text-anchor="start" font-size="11" fill="currentColor">no</text>
  <polyline points="505,356 505,390" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <polyline points="505,427 505,446 640,446 640,32 433,32" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="636.0" y="440.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">next access</text>
  <polyline points="140,300 140,330" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="148.0" y="316.0" text-anchor="start" font-size="11" fill="#ef4444">no: page fault</text>
  <polyline points="140,405 140,427" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="148.0" y="420.0" text-anchor="start" font-size="11" fill="currentColor">yes</text>
  <polyline points="225,369 262,369 262,516 243,516" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="232.0" y="361.0" text-anchor="start" font-size="11" fill="currentColor">no</text>
  <polyline points="140,468 140,495" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <polyline points="140,534 140,558" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <polyline points="140,591 140,612" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <polyline points="50,630 18,630 18,32 207,32" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-flow)"/>
  <text x="26.0" y="26.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">restart</text>
</svg>
<figcaption>Flow of a memory reference through the TLB, page table and cache (also in Part II).</figcaption>
</figure>

## Input/Output Organization

### Secondary Storage

The organization of a magnetic disk (platters, tracks, sectors, cylinders), the disk access time and disk scheduling are covered in [Part II](/posts/computer-systems-2/#mass-storage-structure). The sector is the smallest unit that can be read or written.

> **Note.** One track passes under the head in one **full** rotation, not in the average rotational delay. At 7200 rpm a rotation takes 60/7200 s = 8.33 ms, so a track of 32 KB gives 32 KB / 8.33 ms ≈ 3,840 KB/s.

#### Solid-State Drives

A **solid-state drive (SSD)**, or flash drive, is non-volatile, uses little power, is faster than a hard disk, and allows random access. Data is written in blocks (an erase followed by a write).

A flash cell is a **floating-gate MOSFET** (metal–oxide–semiconductor field-effect transistor): a MOS transistor whose gate is electrically isolated by an insulator, so the charge on it remains for a long time. The charge is controlled by the voltage on the control gate, and its presence or absence represents 0 or 1. To read a bit, a voltage $V_{\text{read}}$ is applied to the control gate and the drain current is measured: a programmed cell needs a higher control-gate voltage to conduct, so it gives (almost) no current.

In NAND flash, a page is read or written, and a block (a set of pages) is erased; a block must be erased before it is written. A cell can be erased and written only a limited number of times (typically about $10^5$), so **wear leveling** distributes the writes evenly over the whole array.

### I/O Interface

Interfacing I/O devices is more complex than interfacing memory:

- There is a wide variety of peripherals (keyboard, mouse, disk, camera, printer, scanner).
- Their speeds vary widely, and the data transfer rate can be regular or irregular.
- The size of the data blocks transferred at a time varies widely, from a few bytes to kilobytes.
- They are slower than the processor and memory.

So a programmable **I/O interface** or **I/O module** is used. It interfaces to the processor and memory on one side, and to one or more I/O devices on the other.

<figure class="fig">
<svg viewBox="0 0 560 232" width="560" role="img" aria-label="Processor, memory and an I/O module on the system bus, with I/O devices attached to the module">
  <defs><marker id="arr-iosys" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="90" y="15" width="130" height="45" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="90" y="15" width="130" height="45" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="155.0" y="41.82" text-anchor="middle" font-size="12" fill="currentColor">processor</text>
  <rect x="340" y="15" width="130" height="45" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="15" width="130" height="45" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="405.0" y="41.82" text-anchor="middle" font-size="12" fill="currentColor">memory</text>
  <polygon points="155,60 163,68 159,68 159,81 163,81 155,89 147,81 151,81 151,68 147,68" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polygon points="405,60 413,68 409,68 409,81 413,81 405,89 397,81 401,81 401,68 397,68" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polygon points="30,95 42,85 42,90 518,90 518,85 530,95 518,105 518,100 42,100 42,105" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polygon points="280,101 288,109 284,109 284,122 288,122 280,130 272,122 276,122 276,109 272,109" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="215" y="130" width="130" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="280.0" y="150.96" text-anchor="middle" font-size="11" fill="currentColor">I/O module</text>
  <rect x="80" y="192" width="100" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="80" y="192" width="100" height="34" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="130.0" y="212.6" text-anchor="middle" font-size="10" fill="currentColor">I/O device</text>
  <rect x="230" y="192" width="100" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="230" y="192" width="100" height="34" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="280.0" y="212.6" text-anchor="middle" font-size="10" fill="currentColor">I/O device</text>
  <rect x="380" y="192" width="100" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="380" y="192" width="100" height="34" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="430.0" y="212.6" text-anchor="middle" font-size="10" fill="currentColor">I/O device</text>
  <polyline points="280,164 280,191" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iosys)" marker-start="url(#arr-iosys)"/>
  <polyline points="240,164 240,178 130,178 130,191" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iosys)" marker-start="url(#arr-iosys)"/>
  <polyline points="320,164 320,178 430,178 430,191" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iosys)" marker-start="url(#arr-iosys)"/>
</svg>
<figcaption>An I/O module connects to the processor and memory on one side and to the devices on the other.</figcaption>
</figure>

In a typical device interface, the control logic operates the device according to the control signals from the I/O module and returns status signals to it, and a buffer holds the data being transferred [[3]](#ref-3).

<figure class="fig">
<svg viewBox="0 0 500 240" width="500" role="img" aria-label="Typical I/O device interface: control logic, buffer and the device">
  <defs><marker id="arr-dev" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="40" y="55" width="420" height="175" rx="14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>
  <text x="85" y="14" text-anchor="middle" font-size="10" fill="currentColor">control signals</text>
  <text x="85" y="27" text-anchor="middle" font-size="10" fill="currentColor">from I/O module</text>
  <text x="195" y="14" text-anchor="middle" font-size="10" fill="currentColor">status signals</text>
  <text x="195" y="27" text-anchor="middle" font-size="10" fill="currentColor">to I/O module</text>
  <text x="365" y="27" text-anchor="middle" font-size="10" fill="currentColor">data transfer</text>
  <rect x="60" y="80" width="160" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="108.96" text-anchor="middle" font-size="11" fill="currentColor">control logic</text>
  <rect x="310" y="80" width="110" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="310" y="80" width="110" height="50" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="365.0" y="108.96" text-anchor="middle" font-size="11" fill="currentColor">buffer</text>
  <rect x="280" y="170" width="170" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="170" width="170" height="44" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="365.0" y="195.96" text-anchor="middle" font-size="11" fill="currentColor">I/O device</text>
  <polyline points="85,33 85,79" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dev)"/>
  <polyline points="195,79 195,33" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dev)"/>
  <polyline points="365,33 365,79" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dev)" marker-start="url(#arr-dev)"/>
  <polyline points="220,105 309,105" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dev)"/>
  <polyline points="365,130 365,169" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dev)" marker-start="url(#arr-dev)"/>
</svg>
<figcaption>Typical I/O device interface (after Stallings, Fig. 7.2 <a href="#ref-3">[3]</a>).</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 610 240" width="610" role="img" aria-label="I/O module schematic: registers and I/O logic between the system bus and the device interfaces">
  <defs><marker id="arr-iom" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-iom-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <polyline points="12,45 12,205" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <polyline points="12,45 20,45" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <polyline points="12,205 20,205" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <text x="12" y="224" text-anchor="start" font-size="10" fill="#ef4444">system bus</text>
  <text x="24" y="79" text-anchor="start" font-size="10" fill="currentColor" class="dim">data lines</text>
  <text x="24" y="159" text-anchor="start" font-size="10" fill="currentColor" class="dim">address lines</text>
  <text x="24" y="189" text-anchor="start" font-size="10" fill="currentColor" class="dim">control lines</text>
  <rect x="130" y="45" width="130" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="130" y="45" width="130" height="34" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="195.0" y="65.96" text-anchor="middle" font-size="11" fill="currentColor">data registers</text>
  <rect x="130" y="92" width="130" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="130" y="92" width="130" height="34" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="195.0" y="112.96" text-anchor="middle" font-size="11" fill="currentColor">status / control</text>
  <rect x="130" y="145" width="130" height="70" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="195.0" y="178.0" text-anchor="middle" font-size="11" fill="currentColor">input/output</text>
  <text x="195.0" y="192.0" text-anchor="middle" font-size="11" fill="currentColor">logic</text>
  <polyline points="100,85 24,85" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <circle cx="100" cy="85" r="2.6" fill="currentColor"/>
  <polyline points="100,85 100,62 129,62" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <polyline points="100,85 100,109 129,109" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <polyline points="24,165 129,165" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <polyline points="24,195 129,195" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <polyline points="261,62 296,62 296,170 261,170" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-iom-r)" marker-start="url(#arr-iom-r)"/>
  <polyline points="261,109 280,109 280,158 261,158" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-iom-r)" marker-start="url(#arr-iom-r)"/>
  <rect x="370" y="45" width="120" height="70" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="45" width="120" height="70" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="430.0" y="78.0" text-anchor="middle" font-size="10" fill="currentColor">I/O device</text>
  <text x="430.0" y="91.0" text-anchor="middle" font-size="10" fill="currentColor">interface</text>
  <polyline points="490,59 545,59" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)" marker-start="url(#arr-iom)"/>
  <text x="550" y="63" text-anchor="start" font-size="10" fill="currentColor" class="dim">data</text>
  <polyline points="545,80 491,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <text x="550" y="84" text-anchor="start" font-size="10" fill="currentColor" class="dim">status</text>
  <polyline points="490,101 544,101" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <text x="550" y="105" text-anchor="start" font-size="10" fill="currentColor" class="dim">control</text>
  <rect x="370" y="145" width="120" height="70" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="145" width="120" height="70" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="430.0" y="178.0" text-anchor="middle" font-size="10" fill="currentColor">I/O device</text>
  <text x="430.0" y="191.0" text-anchor="middle" font-size="10" fill="currentColor">interface</text>
  <polyline points="490,159 545,159" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)" marker-start="url(#arr-iom)"/>
  <text x="550" y="163" text-anchor="start" font-size="10" fill="currentColor" class="dim">data</text>
  <polyline points="545,180 491,180" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <text x="550" y="184" text-anchor="start" font-size="10" fill="currentColor" class="dim">status</text>
  <polyline points="490,201 544,201" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)"/>
  <text x="550" y="205" text-anchor="start" font-size="10" fill="currentColor" class="dim">control</text>
  <polyline points="261,190 369,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)" marker-start="url(#arr-iom)"/>
  <polyline points="261,180 330,180 330,80 369,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iom)" marker-start="url(#arr-iom)"/>
</svg>
<figcaption>I/O module schematic (after the NPTEL course <a href="#ref-1">[1]</a> and Stallings, Fig. 7.3 <a href="#ref-3">[3]</a>).</figcaption>
</figure>

Typical steps of an input operation:

1. The processor asks the I/O module for the status of the device.
2. The I/O module returns the status.
3. If the device is ready, the processor requests the data transfer.
4. The I/O module gets the data from the device.
5. The I/O module transfers the data to the processor.
6. The processor stores the data in memory.

Devices are connected through input and output ports:

- An **output port** is a PIPO (parallel-in parallel-out) register that is enabled when a particular output device address is given. Its inputs are connected to the data bus and its outputs to the device.
- An **input port** is a parallel tristate bus driver that is enabled when a particular input device address is given. Its outputs are connected to the data bus and its inputs to the device.

<figure class="fig">
<svg viewBox="0 0 640 186" width="640" role="img" aria-label="Input and output ports selected by an address decoder and connected to the data bus">
  <defs><marker id="arr-pt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-pt-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <text x="120" y="26" text-anchor="end" font-size="10" fill="#ef4444">data bus</text>
  <polyline points="128,22 630,22" stroke="#ef4444" stroke-width="2" fill="none"/>
  <rect x="55" y="118" width="95" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="102.5" y="146.0" text-anchor="middle" font-size="11" fill="currentColor">address</text>
  <text x="102.5" y="160.0" text-anchor="middle" font-size="11" fill="currentColor">decoder</text>
  <text x="4" y="142" text-anchor="start" font-size="10" fill="currentColor">I/O</text>
  <text x="4" y="170" text-anchor="start" font-size="10" fill="currentColor">addr.</text>
  <polyline points="4,150 54,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pt)"/>
  <rect x="130" y="62" width="56" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="83.6" text-anchor="middle" font-size="10" fill="currentColor">port</text>
  <polyline points="158,22 158,61" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-pt-r)" marker-start="url(#arr-pt-r)"/>
  <polyline points="150,133 158,133 158,99" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pt)"/>
  <text x="164" y="113" text-anchor="start" font-size="10" fill="currentColor" class="dim">En</text>
  <polyline points="186,80 209,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pt)" marker-start="url(#arr-pt)"/>
  <rect x="210" y="62" width="74" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="210" y="62" width="74" height="36" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="247.0" y="78.0" text-anchor="middle" font-size="9" fill="currentColor">I/O device</text>
  <text x="247.0" y="90.0" text-anchor="middle" font-size="9" fill="currentColor">1</text>
  <rect x="300" y="62" width="56" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="328.0" y="83.6" text-anchor="middle" font-size="10" fill="currentColor">port</text>
  <polyline points="328,22 328,61" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-pt-r)" marker-start="url(#arr-pt-r)"/>
  <polyline points="150,150 328,150 328,99" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pt)"/>
  <text x="334" y="113" text-anchor="start" font-size="10" fill="currentColor" class="dim">En</text>
  <polyline points="356,80 379,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pt)" marker-start="url(#arr-pt)"/>
  <rect x="380" y="62" width="74" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="380" y="62" width="74" height="36" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="417.0" y="78.0" text-anchor="middle" font-size="9" fill="currentColor">I/O device</text>
  <text x="417.0" y="90.0" text-anchor="middle" font-size="9" fill="currentColor">2</text>
  <rect x="470" y="62" width="56" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="498.0" y="83.6" text-anchor="middle" font-size="10" fill="currentColor">port</text>
  <polyline points="498,22 498,61" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-pt-r)" marker-start="url(#arr-pt-r)"/>
  <polyline points="150,167 498,167 498,99" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pt)"/>
  <text x="504" y="113" text-anchor="start" font-size="10" fill="currentColor" class="dim">En</text>
  <polyline points="526,80 549,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pt)" marker-start="url(#arr-pt)"/>
  <rect x="550" y="62" width="74" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="550" y="62" width="74" height="36" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="587.0" y="78.0" text-anchor="middle" font-size="9" fill="currentColor">I/O device</text>
  <text x="587.0" y="90.0" text-anchor="middle" font-size="9" fill="currentColor">3</text>
</svg>
<figcaption>Ports connected to the data bus and enabled by the address decoder.</figcaption>
</figure>

#### Memory-Mapped and I/O-Mapped Interfacing

**Memory-mapped I/O:** the same address decoder selects memory and I/O ports, and part of the memory address space is occupied by I/O devices. All the data transfer instructions for memory can be used for I/O. The processor needs no separate I/O instructions, and does not have to specify whether an address is a memory or an I/O address.

As an example, take a 16-bit address. A decoder on $A_{15} A_{14}$ selects three 16 KB memory modules with outputs 0 to 2, 48 KB in all. Output 3 enables a second decoder on $A_{13} A_{12}$, which selects ports A to D. The lower 12 bits are not decoded, so each port responds to a range of 4 K addresses.

<figure class="fig">
<svg viewBox="0 0 660 338" width="660" role="img" aria-label="Memory-mapped I/O: one 2-to-4 decoder selects three 16 KB memory modules and, through its last output, a second decoder for four ports">
  <defs><marker id="arr-mmd" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="10" y="15" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="10" y="15" width="70" height="40" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="45.0" y="39.32" text-anchor="middle" font-size="12" fill="currentColor">CPU</text>
  <polygon points="41,55 49,55 49,80 53,80 45,88 37,80 41,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60" y="80" text-anchor="start" font-size="10" fill="currentColor">A<tspan dy="3" font-size="8">15</tspan> – A<tspan dy="3" font-size="8">0</tspan></text>
  <text x="46" y="128" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">15</tspan></text>
  <text x="46" y="168" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">14</tspan></text>
  <polyline points="50,124 99,124" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <polyline points="50,164 99,164" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <rect x="100" y="98" width="80" height="100" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="151.96" text-anchor="middle" font-size="11" fill="currentColor">decoder</text>
  <text x="176" y="113" text-anchor="end" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="176" y="138" text-anchor="end" font-size="9" fill="currentColor" class="dim">1</text>
  <text x="176" y="163" text-anchor="end" font-size="9" fill="currentColor" class="dim">2</text>
  <text x="176" y="188" text-anchor="end" font-size="9" fill="currentColor" class="dim">3</text>
  <polyline points="180,110 215,110 215,38 334,38" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="322" y="33" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="18" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="18" width="70" height="40" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="370.0" y="41.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">0</tspan></text>
  <text x="413" y="42" text-anchor="start" font-size="10" fill="currentColor" class="dim">16 KB</text>
  <polyline points="180,135 235,135 235,93 334,93" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="322" y="88" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="73" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="73" width="70" height="40" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="370.0" y="96.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">1</tspan></text>
  <text x="413" y="97" text-anchor="start" font-size="10" fill="currentColor" class="dim">16 KB</text>
  <polyline points="180,160 255,160 255,148 334,148" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="322" y="143" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="128" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="128" width="70" height="40" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="370.0" y="151.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">2</tspan></text>
  <text x="413" y="152" text-anchor="start" font-size="10" fill="currentColor" class="dim">16 KB</text>
  <polyline points="452,18 460,18 460,168 452,168" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <text x="468" y="97" text-anchor="start" font-size="10" fill="#ef4444">48 KB</text>
  <polyline points="180,185 215,185 215,219" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="221" y="208" text-anchor="start" font-size="10" fill="#ef4444">I/O</text>
  <text x="209" y="212" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="170" y="220" width="90" height="110" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="278.96" text-anchor="middle" font-size="11" fill="currentColor">decoder</text>
  <text x="116" y="259" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">13</tspan></text>
  <text x="116" y="299" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">12</tspan></text>
  <polyline points="120,255 169,255" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <polyline points="120,295 169,295" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <polyline points="260,237 334,237" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="322" y="233" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="227" width="34" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="227" width="34" height="20" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="352.0" y="240.6" text-anchor="middle" font-size="10" fill="currentColor">A</text>
  <polyline points="260,262 334,262" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="322" y="258" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="252" width="34" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="252" width="34" height="20" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="352.0" y="265.6" text-anchor="middle" font-size="10" fill="currentColor">B</text>
  <polyline points="260,287 334,287" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="322" y="283" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="277" width="34" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="277" width="34" height="20" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="352.0" y="290.6" text-anchor="middle" font-size="10" fill="currentColor">C</text>
  <polyline points="260,312 334,312" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mmd)"/>
  <text x="322" y="308" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="302" width="34" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="302" width="34" height="20" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="352.0" y="315.6" text-anchor="middle" font-size="10" fill="currentColor">D</text>
  <polyline points="377,227 385,227 385,322 377,322" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <text x="392" y="278" text-anchor="start" font-size="10" fill="#ef4444">ports</text>
  <text x="450" y="232" text-anchor="start" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">15</tspan> A<tspan dy="3" font-size="8">14</tspan> A<tspan dy="3" font-size="8">13</tspan> A<tspan dy="3" font-size="8">12</tspan></text>
  <text x="453" y="254" text-anchor="start" font-size="10" fill="currentColor">1 1 0 0</text>
  <text x="508" y="254" text-anchor="start" font-size="10" fill="currentColor">⇒ A</text>
  <text x="545" y="254" text-anchor="start" font-size="10" fill="currentColor" class="dim">C000–CFFF</text>
  <text x="453" y="276" text-anchor="start" font-size="10" fill="currentColor">1 1 0 1</text>
  <text x="508" y="276" text-anchor="start" font-size="10" fill="currentColor">⇒ B</text>
  <text x="545" y="276" text-anchor="start" font-size="10" fill="currentColor" class="dim">D000–DFFF</text>
  <text x="453" y="298" text-anchor="start" font-size="10" fill="currentColor">1 1 1 0</text>
  <text x="508" y="298" text-anchor="start" font-size="10" fill="currentColor">⇒ C</text>
  <text x="545" y="298" text-anchor="start" font-size="10" fill="currentColor" class="dim">E000–EFFF</text>
  <text x="453" y="320" text-anchor="start" font-size="10" fill="currentColor">1 1 1 1</text>
  <text x="508" y="320" text-anchor="start" font-size="10" fill="currentColor">⇒ D</text>
  <text x="545" y="320" text-anchor="start" font-size="10" fill="currentColor" class="dim">F000–FFFF</text>
</svg>
<figcaption>Memory-mapped I/O: the same decoder selects memory and the I/O ports.</figcaption>
</figure>

**I/O-mapped I/O:** there are separate instructions for I/O data transfer (IN and OUT), and a processor signal identifies whether an address refers to a memory location or an I/O device. Separate address decoders select memory and I/O ports, and the complete memory address space can be used.

In the example below, $\text{IO}/\overline{\text{M}} = 0$ enables the memory decoder (for LD and SD), and $\text{IO}/\overline{\text{M}} = 1$ enables the I/O decoder through the inverter (for IN and OUT). All four 16 KB modules can now be used, 64 KB in all.

<figure class="fig">
<svg viewBox="0 0 560 352" width="560" role="img" aria-label="I/O-mapped interfacing: the IO/M signal enables either the memory decoder or, through an inverter, the I/O decoder">
  <defs><marker id="arr-iod" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="50" y="49" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">15</tspan></text>
  <text x="50" y="89" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">14</tspan></text>
  <polyline points="54,45 99,45" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <polyline points="54,85 99,85" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <rect x="100" y="25" width="100" height="90" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150.0" y="68.0" text-anchor="middle" font-size="11" fill="currentColor">memory</text>
  <text x="150.0" y="82.0" text-anchor="middle" font-size="11" fill="currentColor">decoder</text>
  <polyline points="200,38 334,38" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="33" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="20" width="70" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="20" width="70" height="36" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="370.0" y="41.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">0</tspan></text>
  <text x="413" y="42" text-anchor="start" font-size="10" fill="currentColor" class="dim">16 KB</text>
  <polyline points="200,58 290,58 290,83 334,83" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="78" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="65" width="70" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="65" width="70" height="36" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="370.0" y="86.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">1</tspan></text>
  <text x="413" y="87" text-anchor="start" font-size="10" fill="currentColor" class="dim">16 KB</text>
  <polyline points="200,78 270,78 270,128 334,128" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="123" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="110" width="70" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="110" width="70" height="36" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="370.0" y="131.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">2</tspan></text>
  <text x="413" y="132" text-anchor="start" font-size="10" fill="currentColor" class="dim">16 KB</text>
  <polyline points="200,98 250,98 250,173 334,173" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="168" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="155" width="70" height="36" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="155" width="70" height="36" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="370.0" y="176.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">3</tspan></text>
  <text x="413" y="177" text-anchor="start" font-size="10" fill="currentColor" class="dim">16 KB</text>
  <polyline points="452,20 460,20 460,191 452,191" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <text x="468" y="96" text-anchor="start" font-size="10" fill="#ef4444">64 KB</text>
  <text x="468" y="112" text-anchor="start" font-size="10" fill="currentColor" class="dim">LD, SD</text>
  <circle cx="150" cy="119" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="150,123 150,180" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="150" cy="150" r="2.6" fill="currentColor"/>
  <polyline points="60,150 150,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="56" y="154" text-anchor="end" font-size="11" fill="#ef4444">IO/M̄</text>
  <polygon points="138,180 162,180 150,196" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="150" cy="200" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="150,204 150,220" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="150" cy="224" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50" y="257" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">15</tspan></text>
  <text x="50" y="297" text-anchor="end" font-size="10" fill="#ef4444">A<tspan dy="3" font-size="8">14</tspan></text>
  <polyline points="54,253 99,253" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <polyline points="54,293 99,293" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <rect x="100" y="228" width="100" height="90" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150.0" y="271.0" text-anchor="middle" font-size="11" fill="currentColor">I/O</text>
  <text x="150.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">decoder</text>
  <polyline points="200,241 334,241" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="237" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="230" width="40" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="230" width="40" height="22" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="355.0" y="244.6" text-anchor="middle" font-size="10" fill="currentColor">A</text>
  <polyline points="200,261 290,261 290,272 334,272" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="268" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="261" width="40" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="261" width="40" height="22" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="355.0" y="275.6" text-anchor="middle" font-size="10" fill="currentColor">B</text>
  <polyline points="200,281 270,281 270,303 334,303" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="299" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="292" width="40" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="292" width="40" height="22" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="355.0" y="306.6" text-anchor="middle" font-size="10" fill="currentColor">C</text>
  <polyline points="200,301 250,301 250,334 334,334" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-iod)"/>
  <text x="322" y="330" text-anchor="end" font-size="9" fill="currentColor" class="dim">En</text>
  <rect x="335" y="323" width="40" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="323" width="40" height="22" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="355.0" y="337.6" text-anchor="middle" font-size="10" fill="currentColor">D</text>
  <text x="390" y="291" text-anchor="start" font-size="10" fill="currentColor" class="dim">IN, OUT</text>
</svg>
<figcaption>I/O-mapped interfacing: separate decoders, and the IO/M̄ signal enables one of them.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 540 216" width="540" role="img" aria-label="Address spaces in memory-mapped and I/O-mapped interfacing">
  <defs></defs>
  <text x="135" y="16" text-anchor="middle" font-size="11" fill="currentColor">(a) memory-mapped I/O</text>
  <rect x="85" y="28" width="100" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="85" y="28" width="100" height="36" rx="0" fill="#22c55e" opacity=".18"/>
  <text x="135.0" y="49.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">0</tspan></text>
  <text x="79" y="38" text-anchor="end" font-size="9" fill="currentColor" class="dim">0000</text>
  <rect x="85" y="64" width="100" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="85" y="64" width="100" height="36" rx="0" fill="#22c55e" opacity=".18"/>
  <text x="135.0" y="85.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">1</tspan></text>
  <text x="79" y="74" text-anchor="end" font-size="9" fill="currentColor" class="dim">4000</text>
  <rect x="85" y="100" width="100" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="85" y="100" width="100" height="36" rx="0" fill="#22c55e" opacity=".18"/>
  <text x="135.0" y="121.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">2</tspan></text>
  <text x="79" y="110" text-anchor="end" font-size="9" fill="currentColor" class="dim">8000</text>
  <rect x="85" y="136" width="100" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="85" y="136" width="100" height="36" rx="0" fill="#f59e0b" opacity=".18"/>
  <text x="135.0" y="157.96" text-anchor="middle" font-size="11" fill="currentColor">I/O</text>
  <text x="79" y="146" text-anchor="end" font-size="9" fill="currentColor" class="dim">C000</text>
  <text x="79" y="172" text-anchor="end" font-size="9" fill="currentColor" class="dim">FFFF</text>
  <text x="135" y="190" text-anchor="middle" font-size="10" fill="currentColor" class="dim">one address space,</text>
  <text x="135" y="204" text-anchor="middle" font-size="10" fill="currentColor" class="dim">I/O as an extension of the memory space</text>
  <text x="400" y="16" text-anchor="middle" font-size="11" fill="currentColor">(b) I/O-mapped I/O</text>
  <rect x="310" y="28" width="90" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="310" y="28" width="90" height="36" rx="0" fill="#22c55e" opacity=".18"/>
  <text x="355.0" y="49.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">0</tspan></text>
  <text x="304" y="38" text-anchor="end" font-size="9" fill="currentColor" class="dim">0000</text>
  <rect x="310" y="64" width="90" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="310" y="64" width="90" height="36" rx="0" fill="#22c55e" opacity=".18"/>
  <text x="355.0" y="85.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">1</tspan></text>
  <text x="304" y="74" text-anchor="end" font-size="9" fill="currentColor" class="dim">4000</text>
  <rect x="310" y="100" width="90" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="310" y="100" width="90" height="36" rx="0" fill="#22c55e" opacity=".18"/>
  <text x="355.0" y="121.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">2</tspan></text>
  <text x="304" y="110" text-anchor="end" font-size="9" fill="currentColor" class="dim">8000</text>
  <rect x="310" y="136" width="90" height="36" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="310" y="136" width="90" height="36" rx="0" fill="#22c55e" opacity=".18"/>
  <text x="355.0" y="157.96" text-anchor="middle" font-size="11" fill="currentColor">M<tspan dy="3" font-size="8">3</tspan></text>
  <text x="304" y="146" text-anchor="end" font-size="9" fill="currentColor" class="dim">C000</text>
  <text x="304" y="172" text-anchor="end" font-size="9" fill="currentColor" class="dim">FFFF</text>
  <rect x="430" y="28" width="80" height="72" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="430" y="28" width="80" height="72" rx="0" fill="#f59e0b" opacity=".18"/>
  <text x="470.0" y="67.96" text-anchor="middle" font-size="11" fill="currentColor">I/O ports</text>
  <text x="400" y="190" text-anchor="middle" font-size="10" fill="currentColor" class="dim">separate spaces, IN / OUT</text>
  <text x="400" y="204" text-anchor="middle" font-size="10" fill="currentColor" class="dim">and an IO/M̄ signal</text>
</svg>
<figcaption>Address spaces of the two examples above.</figcaption>
</figure>

### Data Transfer Techniques

1. **Programmed I/O:** the CPU executes a program that transfers the data between the device and memory. It can be synchronous, asynchronous or interrupt-driven.
2. **Direct memory access (DMA):** an external controller transfers the data directly between the device and memory, without CPU intervention.

#### Synchronous Transfer

The device transfers data at a fixed rate known to the CPU. The CPU initiates the I/O operation and transfers successive bytes or words after giving fixed time delays.

<figure class="fig">
<svg viewBox="0 0 470 274" width="470" role="img" aria-label="Flowchart of synchronous data transfer">
  <defs><marker id="arr-syn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="110" y="10" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="28.6" text-anchor="middle" font-size="10" fill="currentColor">initiate data transfer</text>
  <rect x="110" y="62" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="110" y="62" width="190" height="30" rx="3" fill="#ef4444" opacity=".18"/>
  <text x="205.0" y="80.6" text-anchor="middle" font-size="10" fill="currentColor">time delay</text>
  <rect x="110" y="114" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="132.6" text-anchor="middle" font-size="10" fill="currentColor">read word from I/O module</text>
  <rect x="110" y="166" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="184.6" text-anchor="middle" font-size="10" fill="currentColor">write word into memory</text>
  <polyline points="205,40 205,61" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-syn)"/>
  <polyline points="205,92 205,113" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-syn)"/>
  <polyline points="205,144 205,165" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-syn)"/>
  <polyline points="205,196 205,215" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-syn)"/>
  <polygon points="205,216 260,240 205,264 150,240" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205" y="244" text-anchor="middle" font-size="10" fill="currentColor">done?</text>
  <polyline points="150,240 60,240 60,77 109,77" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-syn)"/>
  <text x="70" y="234" text-anchor="start" font-size="9" fill="currentColor">no</text>
  <polyline points="260,240 312,240" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-syn)"/>
  <text x="270" y="234" text-anchor="start" font-size="9" fill="currentColor">yes</text>
  <text x="316" y="244" text-anchor="start" font-size="10" fill="currentColor" class="dim">data transfer complete</text>
  <text x="308" y="81" text-anchor="start" font-size="10" fill="#ef4444">← CPU lies idle</text>
</svg>
<figcaption>Synchronous data transfer from an input device.</figcaption>
</figure>

- The CPU lies idle during the delays.
- Not many devices have strictly synchronous characteristics.
- Errors may occur if the device and the processor get out of synchronization.
- A large number of words cannot be transferred in one go.
- The transfer speed depends not only on the speed of the device and memory, but also on the execution time of the code.

#### Asynchronous Transfer

The CPU does not know when the I/O module will be ready to transfer the next word, so it checks the status of the module to find out. This is called **handshaking**.

<figure class="fig">
<svg viewBox="0 0 490 340" width="490" role="img" aria-label="Flowchart of asynchronous data transfer, with the status-checking loop">
  <defs><marker id="arr-asy" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-asy-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="110" y="10" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="28.6" text-anchor="middle" font-size="10" fill="currentColor">initiate data transfer</text>
  <rect x="110" y="62" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="80.6" text-anchor="middle" font-size="10" fill="currentColor">read status of I/O module</text>
  <polygon points="205,114 260,138 205,162 150,138" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205" y="142" text-anchor="middle" font-size="10" fill="currentColor">ready?</text>
  <rect x="110" y="184" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="202.6" text-anchor="middle" font-size="10" fill="currentColor">read word from I/O module</text>
  <rect x="110" y="236" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="254.6" text-anchor="middle" font-size="10" fill="currentColor">write word into memory</text>
  <polygon points="205,282 260,306 205,330 150,306" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205" y="310" text-anchor="middle" font-size="10" fill="currentColor">done?</text>
  <polyline points="205,40 205,61" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-asy)"/>
  <polyline points="205,92 205,113" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-asy)"/>
  <polyline points="205,162 205,183" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-asy)"/>
  <text x="213" y="172" text-anchor="start" font-size="9" fill="currentColor">yes</text>
  <polyline points="205,214 205,235" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-asy)"/>
  <polyline points="205,266 205,281" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-asy)"/>
  <polyline points="260,138 330,138 330,77 301,77" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-asy-r)"/>
  <text x="270" y="132" text-anchor="start" font-size="9" fill="currentColor">no</text>
  <polyline points="150,306 60,306 60,77 109,77" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-asy)"/>
  <text x="70" y="300" text-anchor="start" font-size="9" fill="currentColor">no</text>
  <polyline points="260,306 312,306" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-asy)"/>
  <text x="270" y="300" text-anchor="start" font-size="9" fill="currentColor">yes</text>
  <text x="316" y="310" text-anchor="start" font-size="10" fill="currentColor" class="dim">data transfer complete</text>
  <text x="338" y="96" text-anchor="start" font-size="10" fill="#ef4444">lot of CPU time</text>
  <text x="338" y="109" text-anchor="start" font-size="10" fill="#ef4444">is wasted in</text>
  <text x="338" y="122" text-anchor="start" font-size="10" fill="#ef4444">this loop</text>
</svg>
<figcaption>Asynchronous data transfer (handshaking).</figcaption>
</figure>

- While checking, the CPU cannot do anything else, which wastes CPU time for slow devices such as a keyboard or mouse.
- It is not suitable for high-speed devices with large blocks, since the CPU is tied up for the whole transfer.
- The transfer speed also depends on the execution time of the code.

An example is **serial data transfer** using start and stop bits. The devices are asynchronous at the level of bytes, but synchronous at the level of bits within a byte. The line is at 1 when idle. The receiver waits for a start bit (0), then reads the 8 data bits after known bit delays, least significant bit first, and the stop bit (1) separates the bytes [[2]](#ref-2).

<figure class="fig">
<svg viewBox="0 0 570 196" width="570" role="img" aria-label="Asynchronous serial transfer: one frame with start and stop bits, and successive frames with gaps between them">
  <defs></defs>
  <rect x="4" y="22" width="56" height="56" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="32.0" y="53.24" text-anchor="middle" font-size="9" fill="currentColor">sender</text>
  <rect x="508" y="22" width="60" height="56" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="538.0" y="53.24" text-anchor="middle" font-size="9" fill="currentColor">receiver</text>
  <text x="82.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">idle</text>
  <text x="119.5" y="92" text-anchor="middle" font-size="9" fill="#ef4444">start</text>
  <polyline points="101,22 101,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="156.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b0</text>
  <polyline points="138,22 138,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="193.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b1</text>
  <polyline points="175,22 175,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="230.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b2</text>
  <polyline points="212,22 212,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="267.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b3</text>
  <polyline points="249,22 249,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="304.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b4</text>
  <polyline points="286,22 286,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="341.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b5</text>
  <polyline points="323,22 323,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="378.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b6</text>
  <polyline points="360,22 360,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="415.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">b7</text>
  <polyline points="397,22 397,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="452.5" y="92" text-anchor="middle" font-size="9" fill="#ef4444">stop</text>
  <polyline points="434,22 434,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <text x="489.5" y="92" text-anchor="middle" font-size="9" fill="currentColor" class="dim">idle</text>
  <polyline points="471,22 471,78" stroke="currentColor" stroke-width="0.6" fill="none" stroke-dasharray="5 4"/>
  <polyline points="64,30 101,30 101,70 138,70 138,30 175,30 175,30 212,30 212,70 249,70 249,30 286,30 286,70 323,70 323,70 360,70 360,30 397,30 397,70 434,70 434,30 471,30 471,30 508,30" stroke="currentColor" stroke-width="2" fill="none"/>
  <polyline points="20,122 90,122 90,160 234,160 234,122 262,122 262,160 406,160 406,122 450,122 450,160 568,160 568,122" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="116" y="122" width="118" height="38" fill="#ef4444" opacity=".18"/>
  <text x="175.0" y="145" text-anchor="middle" font-size="9" fill="currentColor">data</text>
  <text x="103" y="172" text-anchor="middle" font-size="8" fill="#ef4444">start</text>
  <polyline points="116,122 116,160" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <rect x="288" y="122" width="118" height="38" fill="#ef4444" opacity=".18"/>
  <text x="347.0" y="145" text-anchor="middle" font-size="9" fill="currentColor">data</text>
  <text x="275" y="172" text-anchor="middle" font-size="8" fill="#ef4444">start</text>
  <polyline points="288,122 288,160" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <rect x="476" y="122" width="92" height="38" fill="#ef4444" opacity=".18"/>
  <text x="522.0" y="145" text-anchor="middle" font-size="9" fill="currentColor">data</text>
  <text x="463" y="172" text-anchor="middle" font-size="8" fill="#ef4444">start</text>
  <polyline points="476,122 476,160" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <text x="248" y="117" text-anchor="middle" font-size="8" fill="#ef4444">stop</text>
  <text x="428" y="117" text-anchor="middle" font-size="8" fill="#ef4444">stop</text>
  <text x="285" y="190" text-anchor="middle" font-size="10" fill="currentColor" class="dim">successive bytes: the gap between frames can have any length</text>
</svg>
<figcaption>Asynchronous serial transfer: one frame, and a stream of frames.</figcaption>
</figure>

#### Interrupt-Driven Transfer

The CPU initiates the transfer and proceeds to perform some other task. When the I/O module is ready, it informs the CPU by activating a signal called the **interrupt request (INTR)**. The CPU suspends its task, services the request (carries out the transfer), and returns to the task. The part of the program that is activated by the request is the **interrupt handler** or **interrupt service routine (ISR)**.

<figure class="fig">
<svg viewBox="0 0 540 304" width="540" role="img" aria-label="Flowchart of interrupt-driven data transfer, with the part that forms the interrupt service routine">
  <defs><marker id="arr-int" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-int-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="110" y="10" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="28.6" text-anchor="middle" font-size="10" fill="currentColor">initiate data transfer</text>
  <rect x="110" y="62" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="110" y="62" width="190" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="205.0" y="80.6" text-anchor="middle" font-size="10" fill="currentColor">perform some other task</text>
  <polyline points="205,40 205,61" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-int)"/>
  <rect x="60" y="116" width="330" height="178" rx="8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>
  <text x="382" y="134" text-anchor="end" font-size="11" fill="currentColor" class="dim">ISR</text>
  <polyline points="205,92 205,133" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-int-r)"/>
  <text x="213" y="110" text-anchor="start" font-size="10" fill="#ef4444">interrupt request</text>
  <rect x="110" y="134" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="152.6" text-anchor="middle" font-size="10" fill="currentColor">read word from I/O module</text>
  <rect x="110" y="186" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="204.6" text-anchor="middle" font-size="10" fill="currentColor">write word into memory</text>
  <polyline points="205,164 205,185" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-int)"/>
  <polyline points="205,216 205,235" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-int)"/>
  <polygon points="205,236 260,260 205,284 150,260" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205" y="264" text-anchor="middle" font-size="10" fill="currentColor">done?</text>
  <polyline points="150,260 30,260 30,77 109,77" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-int-r)" stroke-dasharray="5 4"/>
  <text x="70" y="254" text-anchor="start" font-size="9" fill="#ef4444">no: resume</text>
  <polyline points="260,260 412,260" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-int)"/>
  <text x="270" y="254" text-anchor="start" font-size="9" fill="currentColor">yes</text>
  <text x="416" y="257" text-anchor="start" font-size="10" fill="currentColor" class="dim">data transfer</text>
  <text x="416" y="270" text-anchor="start" font-size="10" fill="currentColor" class="dim">complete</text>
</svg>
<figcaption>Interrupt-driven data transfer.</figcaption>
</figure>

CPU time is not wasted in checking the status of the I/O module. It is needed only for the transfer itself, plus some overhead for transferring and returning control.

An ISR differs from a normal function:

- A function is called from well-defined places in the calling program, so only the relevant registers need to be saved on entry and restored before return.
- An ISR can be invoked from anywhere in the executing program, depending on when the request arrives. So potentially all the registers used in the ISR must be saved and restored.

### Interrupt Handling

When an interrupt request arrives:

1. At the end of the current instruction, the PC and the **program status word (PSW)**, which holds the status flags and other processor status information, are saved on the stack automatically.
2. The interrupt is acknowledged and the interrupt vector is obtained, based on which control transfers to the appropriate ISR. Different devices may have different ISRs.
3. After handling the interrupt, the ISR executes a special **return from interrupt (RTI)** instruction, which restores the PSW and returns control to the saved PC. A normal RETURN does not restore the PSW.

An instruction cycle has several machine cycles, five in MIPS32. The interrupt is acknowledged only at the end of the last one.

<figure class="fig">
<svg viewBox="0 0 560 116" width="560" role="img" aria-label="An interrupt is acknowledged only after the last machine cycle of an instruction">
  <defs><marker id="arr-ack-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#22c55e"/></marker><marker id="arr-ack-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="60" y="42" width="80" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="60.96" text-anchor="middle" font-size="11" fill="currentColor">IF</text>
  <rect x="140" y="42" width="80" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="180.0" y="60.96" text-anchor="middle" font-size="11" fill="currentColor">ID</text>
  <rect x="220" y="42" width="80" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="60.96" text-anchor="middle" font-size="11" fill="currentColor">EX</text>
  <rect x="300" y="42" width="80" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="340.0" y="60.96" text-anchor="middle" font-size="11" fill="currentColor">MEM</text>
  <rect x="380" y="42" width="80" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="420.0" y="60.96" text-anchor="middle" font-size="11" fill="currentColor">WB</text>
  <text x="460" y="14" text-anchor="middle" font-size="10" fill="#22c55e">interrupt acknowledged here</text>
  <polyline points="460,20 460,41" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-ack-g)"/>
  <polyline points="140,92 140,73" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-ack-r)"/>
  <polyline points="220,92 220,73" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-ack-r)"/>
  <polyline points="300,92 300,73" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-ack-r)"/>
  <polyline points="380,92 380,73" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-ack-r)"/>
  <text x="260" y="108" text-anchor="middle" font-size="10" fill="#ef4444">interrupt not acknowledged here</text>
</svg>
<figcaption>Where an interrupt is acknowledged in an instruction cycle.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 600 266" width="600" role="img" aria-label="General interrupt processing: the hardware steps followed by the software steps">
  <defs><marker id="arr-gip" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="150" y="16" text-anchor="middle" font-size="11" fill="#3b82f6">by hardware</text>
  <text x="450" y="16" text-anchor="middle" font-size="11" fill="#22c55e">by software</text>
  <rect x="20" y="28" width="260" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="28" width="260" height="32" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="150.0" y="47.6" text-anchor="middle" font-size="10" fill="currentColor">device controller issues an interrupt</text>
  <polyline points="150,60 150,75" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
  <rect x="20" y="76" width="260" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="76" width="260" height="32" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="150.0" y="95.6" text-anchor="middle" font-size="10" fill="currentColor">CPU finishes execution of current instruction</text>
  <polyline points="150,108 150,123" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
  <rect x="20" y="124" width="260" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="124" width="260" height="32" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="150.0" y="143.6" text-anchor="middle" font-size="10" fill="currentColor">CPU acknowledges the interrupt</text>
  <polyline points="150,156 150,171" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
  <rect x="20" y="172" width="260" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="172" width="260" height="32" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="150.0" y="191.6" text-anchor="middle" font-size="10" fill="currentColor">CPU pushes PSW and PC on the stack</text>
  <polyline points="150,204 150,219" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
  <rect x="20" y="220" width="260" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="220" width="260" height="32" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="150.0" y="239.6" text-anchor="middle" font-size="10" fill="currentColor">CPU loads new PC value based on the interrupt</text>
  <rect x="330" y="28" width="250" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="28" width="250" height="32" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="455.0" y="47.6" text-anchor="middle" font-size="10" fill="currentColor">save remainder of process state information</text>
  <polyline points="455,60 455,75" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
  <rect x="330" y="76" width="250" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="76" width="250" height="32" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="455.0" y="95.6" text-anchor="middle" font-size="10" fill="currentColor">process interrupt request</text>
  <polyline points="455,108 455,123" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
  <rect x="330" y="124" width="250" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="124" width="250" height="32" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="455.0" y="143.6" text-anchor="middle" font-size="10" fill="currentColor">restore process state information</text>
  <polyline points="455,156 455,171" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
  <rect x="330" y="172" width="250" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="172" width="250" height="32" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="455.0" y="191.6" text-anchor="middle" font-size="10" fill="currentColor">restore old PSW and PC</text>
  <polyline points="280,236 305,236 305,44 329,44" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-gip)"/>
</svg>
<figcaption>General interrupt processing (after Stallings, Fig. 7.6 <a href="#ref-3">[3]</a>).</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 440 170" width="440" role="img" aria-label="The ISR can be entered from any point of the program, depending on when the interrupt arrives">
  <defs><marker id="arr-isr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-isr-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <text x="150" y="14" text-anchor="middle" font-size="11" fill="currentColor">program</text>
  <rect x="100" y="22" width="100" height="136" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="114,34 186,34" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,46 186,46" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,58 186,58" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,70 186,70" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,82 186,82" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,94 186,94" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,106 186,106" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,118 186,118" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,130 186,130" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="114,142 186,142" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <text x="330" y="50" text-anchor="middle" font-size="11" fill="currentColor">ISR</text>
  <rect x="280" y="58" width="100" height="64" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="294,70 366,70" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="294,82 366,82" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="294,94 366,94" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="294,106 366,106" stroke="currentColor" stroke-width="0.8" fill="none"/>
  <polyline points="70,52 99,52" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-isr-r)"/>
  <text x="66" y="56" text-anchor="end" font-size="9" fill="#ef4444">interrupt</text>
  <polyline points="70,118 99,118" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-isr-r)"/>
  <text x="66" y="122" text-anchor="end" font-size="9" fill="#ef4444">interrupt</text>
  <polyline points="200,52 279,66" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-isr)" stroke-dasharray="5 4"/>
  <polyline points="280,114 201,64" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-isr)" stroke-dasharray="5 4"/>
  <polyline points="200,118 279,76" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-isr)" stroke-dasharray="5 4"/>
  <polyline points="280,118 201,130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-isr)" stroke-dasharray="5 4"/>
</svg>
<figcaption>An interrupt can arrive anywhere in the program; the ISR returns to the point of interruption.</figcaption>
</figure>

The signals between the device controller and the CPU work as follows:

1. The device controller sends INTR to the CPU.
2. The CPU finishes the current instruction and sends back **interrupt acknowledge (INTA)**.
3. The device controller sends the **interrupt vector** (or number) over the data bus.
4. The CPU reads the vector and identifies the device, and so the correct ISR.

<figure class="fig">
<svg viewBox="0 0 470 196" width="470" role="img" aria-label="Device controller and CPU with interrupt request, interrupt acknowledge and the interrupt vector on the data bus">
  <defs><marker id="arr-ia" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="25" y="25" width="120" height="64" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="25" y="25" width="120" height="64" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="85.0" y="55.0" text-anchor="middle" font-size="11" fill="currentColor">device</text>
  <text x="85.0" y="69.0" text-anchor="middle" font-size="11" fill="currentColor">controller</text>
  <rect x="335" y="25" width="100" height="64" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="335" y="25" width="100" height="64" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="385.0" y="61.68" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <text x="240" y="37" text-anchor="middle" font-size="10" fill="#ef4444">interrupt request (INTR)</text>
  <polyline points="145,43 334,43" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ia)"/>
  <text x="240" y="69" text-anchor="middle" font-size="10" fill="#22c55e">interrupt acknowledge (INTA)</text>
  <polyline points="335,75 146,75" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ia)"/>
  <polygon points="81,89 89,89 89,139 93,139 85,147 77,139 81,139" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="97" y="120" text-anchor="start" font-size="10" fill="currentColor">interrupt vector</text>
  <polygon points="385,89 393,97 389,97 389,139 393,139 385,147 377,139 381,139 381,97 377,97" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polygon points="15,153 27,143 27,148 443,148 443,143 455,153 443,163 443,158 27,158 27,163" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235" y="186" text-anchor="middle" font-size="10" fill="currentColor" class="dim">data bus</text>
</svg>
<figcaption>Interrupt request, acknowledge and vector.</figcaption>
</figure>

The vector is put on the data bus through a tristate buffer enabled by INTA.

<figure class="fig">
<svg viewBox="0 0 420 136" width="420" role="img" aria-label="The interrupt vector reaches the data bus through a tristate buffer enabled by INTA">
  <defs><marker id="arr-tri" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-tri-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#22c55e"/></marker></defs>
  <text x="150" y="14" text-anchor="middle" font-size="10" fill="currentColor">interrupt vector</text>
  <polyline points="150,20 150,41" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-tri)"/>
  <rect x="90" y="42" width="120" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150.0" y="62.6" text-anchor="middle" font-size="10" fill="currentColor">tristate buffer</text>
  <polyline points="310,59 211,59" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-tri-g)"/>
  <text x="260" y="52" text-anchor="middle" font-size="10" fill="#22c55e">INTA</text>
  <polyline points="150,76 150,111" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-tri)"/>
  <polygon points="30,117 42,107 42,112 378,112 378,107 390,117 378,127 378,122 42,122 42,127" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="390" y="98" text-anchor="end" font-size="10" fill="currentColor" class="dim">data bus</text>
</svg>
<figcaption>The tristate buffer is enabled when INTA is active.</figcaption>
</figure>

#### Handling Multiple Devices

With several devices capable of generating interrupts, four questions arise: how the CPU identifies the interrupting device, how it finds the starting address of the ISR, whether nesting is allowed, and how simultaneous requests are handled.

##### Device Identification

Suppose the devices share a common request line, $\text{INTR} = \text{INTR}_1 + \text{INTR}_2 + \dots + \text{INTR}_n$. Each device can have a status bit showing whether it has interrupted, and the CPU can **poll** the status bits to find out which one did.

<figure class="fig">
<svg viewBox="0 0 470 176" width="470" role="img" aria-label="Polling the status bits of the devices to find out which one has interrupted">
  <defs><marker id="arr-pol" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="52" width="90" height="84" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="52" width="90" height="84" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="65.0" y="98.68" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <text x="225" y="14" text-anchor="middle" font-size="10" fill="currentColor" class="dim">whether interrupted</text>
  <rect x="205" y="24" width="40" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="42.96" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <rect x="320" y="27" width="100" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="320" y="27" width="100" height="24" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="370.0" y="42.6" text-anchor="middle" font-size="10" fill="currentColor">device 1</text>
  <polyline points="320,39 246,39" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pol)"/>
  <polyline points="110,94 204,39" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pol)"/>
  <rect x="205" y="54" width="40" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="72.96" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <rect x="320" y="57" width="100" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="320" y="57" width="100" height="24" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="370.0" y="72.6" text-anchor="middle" font-size="10" fill="currentColor">device 2</text>
  <polyline points="320,69 246,69" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pol)"/>
  <polyline points="110,94 204,69" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pol)"/>
  <rect x="205" y="84" width="40" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="102.96" text-anchor="middle" font-size="11" fill="currentColor">⋮</text>
  <text x="370" y="103" text-anchor="middle" font-size="10" fill="currentColor">⋮</text>
  <rect x="205" y="114" width="40" height="30" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="132.96" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <rect x="320" y="117" width="100" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="320" y="117" width="100" height="24" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="370.0" y="132.6" text-anchor="middle" font-size="10" fill="currentColor">device N</text>
  <polyline points="320,129 246,129" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pol)"/>
  <polyline points="110,94 204,129" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pol)"/>
  <text x="150" y="160" text-anchor="middle" font-size="10" fill="#ef4444">polling</text>
</svg>
<figcaption>Polling the status bits.</figcaption>
</figure>

A better alternative is the interrupt vector: the interrupting device sends a special identifying code on the data bus on receiving INTA.

##### Starting Address of the ISR

For a processor with several request inputs, the ISR address can be fixed for each input, but this lacks flexibility. With vectors, the device identifies itself and the CPU looks up the ISR address in a table. The **interrupt latency**, the delay from the request to the start of the ISR, is somewhat increased, since the CPU does not jump to the ISR immediately.

##### Nesting

Suppose device D0 has interrupted and the CPU is executing its ISR, and in the meantime device D1 interrupts. There are two possibilities:

1. D1 interrupts the ISR for D0 and gets processed first, and then the ISR for D0 is resumed. This creates a problem for multi-level nesting.
2. The interrupt system is disabled automatically whenever an interrupt is acknowledged, so that handling of nested interrupts is not required.

<figure class="fig">
<svg viewBox="0 0 500 216" width="500" role="img" aria-label="Nested interrupts: the ISR for D1 runs inside the ISR for D0">
  <defs><marker id="arr-nest" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="110" y="14" text-anchor="middle" font-size="11" fill="currentColor">program</text>
  <text x="250" y="30" text-anchor="middle" font-size="11" fill="currentColor">ISR D0</text>
  <text x="390" y="62" text-anchor="middle" font-size="11" fill="currentColor">ISR D1</text>
  <polyline points="110,22 110,56" stroke="currentColor" stroke-width="2" fill="none"/>
  <polyline points="110,176 110,208" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#arr-nest)"/>
  <polyline points="110,56 110,176" stroke="currentColor" stroke-width="2" fill="none"/>
  <polyline points="250,38 250,88" stroke="currentColor" stroke-width="2" fill="none"/>
  <polyline points="250,112 250,152" stroke="currentColor" stroke-width="2" fill="none"/>
  <polyline points="390,70 390,128" stroke="currentColor" stroke-width="2" fill="none"/>
  <text x="102" y="60" text-anchor="end" font-size="10" fill="#ef4444">D0 interrupts</text>
  <text x="242" y="92" text-anchor="end" font-size="10" fill="#ef4444">D1 interrupts</text>
  <polyline points="112,56 248,38" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-nest)" stroke-dasharray="5 4"/>
  <polyline points="252,88 388,70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-nest)" stroke-dasharray="5 4"/>
  <polyline points="388,128 252,112" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-nest)" stroke-dasharray="5 4"/>
  <polyline points="248,152 112,176" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-nest)" stroke-dasharray="5 4"/>
</svg>
<figcaption>Nested interrupts: D1 interrupts the ISR for D0.</figcaption>
</figure>

Typical instruction sets have **EI** (enable interrupt) and **DI** (disable interrupt) instructions. In the second case the ISR executes EI just before RTI, and some ISAs combine the two into one instruction. DI is also used by the operating system to run code atomically, such as the semaphore wait and signal operations.

ISRs are typically short, so with the second approach the delay to a second request is often acceptable. Otherwise, some devices are given higher priorities (e.g. a timer that maintains a real-time clock), and a higher-priority interrupt may interrupt the ISR of a lower-priority one.

##### Simultaneous Requests

The CPU needs a mechanism by which only one request is serviced, while the others are delayed or ignored. If it has several request lines, it can use a priority scheme and accept the request with the highest priority.

<figure class="fig">
<svg viewBox="0 0 520 162" width="520" role="img" aria-label="CPU with a separate pair of INTR and INTA lines for each device">
  <defs><marker id="arr-ml" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="25" y="12" width="470" height="38" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="25" y="12" width="470" height="38" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="260.0" y="35.68" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <rect x="40" y="118" width="110" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="40" y="118" width="110" height="34" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="95.0" y="138.6" text-anchor="middle" font-size="10" fill="currentColor">device 1</text>
  <polyline points="73,118 73,51" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ml)"/>
  <polyline points="117,50 117,117" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ml)"/>
  <text x="68" y="88" text-anchor="end" font-size="10" fill="#ef4444">INTR<tspan dy="3" font-size="8">1</tspan></text>
  <text x="122" y="88" text-anchor="start" font-size="10" fill="#22c55e">INTA<tspan dy="3" font-size="8">1</tspan></text>
  <rect x="185" y="118" width="110" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="185" y="118" width="110" height="34" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="240.0" y="138.6" text-anchor="middle" font-size="10" fill="currentColor">device 2</text>
  <polyline points="218,118 218,51" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ml)"/>
  <polyline points="262,50 262,117" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ml)"/>
  <text x="213" y="88" text-anchor="end" font-size="10" fill="#ef4444">INTR<tspan dy="3" font-size="8">2</tspan></text>
  <text x="267" y="88" text-anchor="start" font-size="10" fill="#22c55e">INTA<tspan dy="3" font-size="8">2</tspan></text>
  <rect x="370" y="118" width="110" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="118" width="110" height="34" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="425.0" y="138.6" text-anchor="middle" font-size="10" fill="currentColor">device n</text>
  <polyline points="403,118 403,51" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ml)"/>
  <polyline points="447,50 447,117" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ml)"/>
  <text x="398" y="88" text-anchor="end" font-size="10" fill="#ef4444">INTR<tspan dy="3" font-size="8">n</tspan></text>
  <text x="452" y="88" text-anchor="start" font-size="10" fill="#22c55e">INTA<tspan dy="3" font-size="8">n</tspan></text>
  <text x="335" y="139" text-anchor="middle" font-size="13" fill="currentColor">· · ·</text>
</svg>
<figcaption>Multiple interrupt request lines: line <em>i</em> has higher priority than line <em>j</em> if <em>i</em> &lt; <em>j</em>.</figcaption>
</figure>

With polling, priority is assigned automatically by the order in which the devices are polled.

Priority can also be set by **daisy chaining**: the INTR line is common to all devices, but INTA propagates serially through them. A device that receives INTA passes it on only if it has not interrupted. Otherwise it stops the propagation and puts its identifying code on the data bus. So the device electrically closest to the CPU has the highest priority.

<figure class="fig">
<svg viewBox="0 0 560 136" width="560" role="img" aria-label="Daisy chain: INTR is shared and INTA is passed from device to device">
  <defs><marker id="arr-dc2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="40" width="70" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="40" width="70" height="60" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="55.0" y="74.5" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <rect x="160" y="40" width="90" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="205.0" y="73.8" text-anchor="middle" font-size="11" fill="currentColor">device 1</text>
  <rect x="300" y="40" width="90" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="345.0" y="73.8" text-anchor="middle" font-size="11" fill="currentColor">device 2</text>
  <rect x="440" y="40" width="90" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="485.0" y="73.8" text-anchor="middle" font-size="11" fill="currentColor">device n</text>
  <polyline points="205.0,37.0 205.0,20.0 55.0,20.0 55.0,37.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dc2)"/>
  <text x="130.0" y="14.0" text-anchor="middle" font-size="10" fill="#ef4444">INTR (shared)</text>
  <line x1="345.0" y1="37.0" x2="345.0" y2="20.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="485.0" y1="37.0" x2="485.0" y2="20.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="205.0" y1="20.0" x2="485.0" y2="20.0" stroke="currentColor" stroke-width="1.5"/>
  <line x1="90.0" y1="85.0" x2="157.0" y2="85.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc2)"/>
  <text x="124.0" y="79.0" text-anchor="middle" font-size="10" fill="#22c55e">INTA</text>
  <line x1="250.0" y1="85.0" x2="297.0" y2="85.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc2)"/>
  <line x1="390.0" y1="85.0" x2="437.0" y2="85.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dc2)"/>
  <text x="300.0" y="126.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">INTA passes through each device that has not interrupted</text>
</svg>
<figcaption>Daisy chain.</figcaption>
</figure>

#### Priority Interrupt Controller

When several devices can interrupt the CPU, a common solution is a **priority interrupt controller**, which interacts with the CPU on one side and the devices on the other.

<figure class="fig">
<svg viewBox="0 0 460 156" width="460" role="img" aria-label="Priority interrupt controller between the CPU and several devices">
  <defs><marker id="arr-pc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="40" width="70" height="80" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="40" width="70" height="80" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="55.0" y="84.5" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <rect x="170" y="30" width="110" height="100" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="170" y="30" width="110" height="100" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="225.0" y="71.5" text-anchor="middle" font-size="10" fill="currentColor">priority</text>
  <text x="225.0" y="83.5" text-anchor="middle" font-size="10" fill="currentColor">interrupt</text>
  <text x="225.0" y="95.5" text-anchor="middle" font-size="10" fill="currentColor">controller</text>
  <line x1="167.0" y1="60.0" x2="93.0" y2="60.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-pc)"/>
  <text x="130.0" y="54.0" text-anchor="middle" font-size="10" fill="currentColor">INTR</text>
  <line x1="93.0" y1="90.0" x2="167.0" y2="90.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-pc)"/>
  <text x="130.0" y="84.0" text-anchor="middle" font-size="10" fill="currentColor">INTA</text>
  <rect x="360" y="30" width="80" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="44.5" text-anchor="middle" font-size="10" fill="currentColor">device 0</text>
  <line x1="357.0" y1="38.0" x2="283.0" y2="38.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <line x1="283.0" y1="45.0" x2="357.0" y2="45.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <rect x="360" y="57" width="80" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="71.5" text-anchor="middle" font-size="10" fill="currentColor">device 1</text>
  <line x1="357.0" y1="65.0" x2="283.0" y2="65.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <line x1="283.0" y1="72.0" x2="357.0" y2="72.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <rect x="360" y="84" width="80" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="98.5" text-anchor="middle" font-size="10" fill="currentColor">device 2</text>
  <line x1="357.0" y1="92.0" x2="283.0" y2="92.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <line x1="283.0" y1="99.0" x2="357.0" y2="99.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <rect x="360" y="111" width="80" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="125.5" text-anchor="middle" font-size="10" fill="currentColor">device 3</text>
  <line x1="357.0" y1="119.0" x2="283.0" y2="119.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <line x1="283.0" y1="126.0" x2="357.0" y2="126.0" stroke="currentColor" stroke-width="1" marker-end="url(#arr-pc)"/>
  <text x="320.0" y="146.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">INTRᵢ / INTAᵢ (device 0 highest)</text>
</svg>
<figcaption>Priority interrupt controller.</figcaption>
</figure>

The INTR line to the CPU is active when any device activates its request line, $\text{INTR} = \text{INTR}_0 + \text{INTR}_1 + \dots + \text{INTR}_n$. When the CPU sends back INTA, the controller sends the corresponding acknowledge to the interrupting device and puts its vector on the data bus.

<figure class="fig">
<svg viewBox="0 0 640 196" width="640" role="img" aria-label="The interrupt controller ORs the request lines; on INTA it acknowledges the requesting device and puts its vector on the data bus">
  <defs><marker id="arr-pd" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="66" y="56" text-anchor="end" font-size="10" fill="currentColor">INTR<tspan dy="3" font-size="8">0</tspan></text>
  <polyline points="70,52 118,52" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="66" y="72" text-anchor="end" font-size="10" fill="currentColor">INTR<tspan dy="3" font-size="8">1</tspan></text>
  <polyline points="70,68 122,68" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="66" y="112" text-anchor="end" font-size="10" fill="currentColor">INTR<tspan dy="3" font-size="8">n</tspan></text>
  <polyline points="70,108 118,108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="52" y="92" text-anchor="middle" font-size="10" fill="currentColor">⋮</text>
  <path d="M110,40 Q136,80 110,120 Q170,120 200,80 Q170,40 110,40 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="200,80 258,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pd)"/>
  <text x="228" y="73" text-anchor="middle" font-size="10" fill="currentColor">INTR</text>
  <text x="135" y="150" text-anchor="middle" font-size="10" fill="currentColor" class="dim">(a) common request line</text>
  <rect x="380" y="25" width="130" height="96" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="380" y="25" width="130" height="96" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="445" y="48" text-anchor="middle" font-size="10" fill="currentColor">interrupt</text>
  <text x="445" y="60" text-anchor="middle" font-size="10" fill="currentColor">controller</text>
  <circle cx="415" cy="90" r="12" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="415" y="93.5" text-anchor="middle" font-size="9" fill="currentColor">IV</text>
  <circle cx="445" cy="90" r="12" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="445" y="93.5" text-anchor="middle" font-size="9" fill="currentColor">IV</text>
  <circle cx="475" cy="90" r="12" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="475" y="93.5" text-anchor="middle" font-size="9" fill="currentColor">IV</text>
  <polyline points="380,50 321,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pd)"/>
  <text x="350" y="44" text-anchor="middle" font-size="10" fill="currentColor">INTR</text>
  <polyline points="320,90 379,90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pd)"/>
  <text x="350" y="84" text-anchor="middle" font-size="10" fill="currentColor">INTA</text>
  <polyline points="570,50 511,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pd)"/>
  <text x="540" y="44" text-anchor="middle" font-size="10" fill="currentColor">INTR<tspan dy="3" font-size="8">2</tspan></text>
  <polyline points="510,90 569,90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pd)"/>
  <text x="540" y="84" text-anchor="middle" font-size="10" fill="currentColor">INTA<tspan dy="3" font-size="8">2</tspan></text>
  <polygon points="441,121 449,121 449,146 453,146 445,154 437,146 441,146" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polygon points="320,160 332,150 332,155 558,155 558,150 570,160 558,170 558,165 332,165 332,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="576" y="164" text-anchor="start" font-size="10" fill="currentColor" class="dim">data bus</text>
  <text x="445" y="190" text-anchor="middle" font-size="10" fill="currentColor" class="dim">(b) device 2 requests</text>
</svg>
<figcaption>(a) INTR is the OR of the device requests. (b) The controller answers INTA with the matching acknowledge and interrupt vector (IV).</figcaption>
</figure>

The controller is programmable: the vectors of the various interrupts can be specified. When more than one request is active at a time, a priority mechanism is used (e.g. $\text{INTR}_0$ is the highest, followed by $\text{INTR}_1$).

#### Types of Interrupts

<figure class="fig">
<svg viewBox="0 0 560 170" width="560" role="img" aria-label="Types of interrupts">
  <defs><marker id="arr-ti" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="220" y="10" width="100" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="270.0" y="28.9" text-anchor="middle" font-size="11" fill="currentColor">interrupt</text>
  <rect x="90" y="70" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="90" y="70" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="150.0" y="88.8" text-anchor="middle" font-size="11" fill="currentColor">hardware</text>
  <rect x="330" y="70" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="70" width="120" height="30" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="390.0" y="88.8" text-anchor="middle" font-size="11" fill="currentColor">software</text>
  <polyline points="270.0,40.0 270.0,55.0 150.0,55.0 150.0,67.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ti)"/>
  <polyline points="270.0,55.0 390.0,55.0 390.0,67.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ti)"/>
  <rect x="20" y="130" width="115" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="77.5" y="148.5" text-anchor="middle" font-size="10" fill="currentColor">maskable</text>
  <polyline points="150.0,100.0 150.0,115.0 77.0,115.0 77.0,127.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ti)"/>
  <rect x="150" y="130" width="115" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="207.5" y="148.5" text-anchor="middle" font-size="10" fill="currentColor">non-maskable</text>
  <polyline points="150.0,100.0 150.0,115.0 207.0,115.0 207.0,127.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ti)"/>
  <rect x="290" y="130" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350.0" y="148.5" text-anchor="middle" font-size="10" fill="currentColor">trap (system call)</text>
  <polyline points="390.0,100.0 390.0,115.0 350.0,115.0 350.0,127.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ti)"/>
  <rect x="420" y="130" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="480.0" y="148.5" text-anchor="middle" font-size="10" fill="currentColor">exception</text>
  <polyline points="390.0,100.0 390.0,115.0 480.0,115.0 480.0,127.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ti)"/>
</svg>
<figcaption>Types of interrupts.</figcaption>
</figure>

- **Hardware interrupt:** the signal comes from a device external to the CPU (keyboard, mouse, timer).
  - **Maskable:** can be masked or delayed when a higher-priority request arrives. Processor instructions can selectively mask and unmask the request lines.
  - **Non-maskable:** cannot be delayed and must be handled immediately (power failure).
- **Software interrupt:** caused by executing an instruction, not by external inputs.
  - **Trap:** a special instruction that requests a service from the operating system, also called a system call.
  - **Exception:** an unplanned interrupt generated from within the system while a program executes (invalid opcode, division by zero, page fault, invalid memory access).

#### Cases That Make Interrupt Handling Difficult

For some interrupts, the current instruction cannot be finished. A special RETURN instruction is then needed, which returns and restarts the interrupted instruction. Examples are a **page fault** (the location being accessed is not in main memory) and an **arithmetic exception** (e.g. division by zero).

#### Exceptions and Interrupts in the Pipeline

So far an interrupt has been acknowledged at the end of the current instruction. In a pipeline there is no single current instruction: several are executing at once, and some interrupts (such as a page fault) force an instruction to be aborted before it completes and restarted later.

<figure class="table">
<figcaption>Exceptions in the MIPS32 pipeline stages.</figcaption>

| Stage | Possible exceptions |
|:--|:--|
| IF | page fault, misaligned memory access, memory protection violation |
| ID | illegal opcode |
| EX | arithmetic exception |
| MEM | page fault, misaligned memory access, memory protection violation |
| WB | none |

</figure>

When an interrupt occurs, the state is saved as follows: a TRAP instruction is forced into the pipeline at the next IF; all writes by the faulting instruction and the ones after it are disabled until the TRAP is taken; and the interrupt handler saves the PC of the faulting instruction. The RFE instruction reloads the PCs and restarts the interrupted instructions.

<div class="definition">

A pipeline has *precise interrupts* if it can be stopped so that the instructions before the faulting instruction complete, and the instructions after it can be restarted from scratch.

</div>

Precise interrupts are needed for page faults and IEEE arithmetic. Interrupts may occur out of order: a later instruction can cause an instruction page fault in IF (cycle 2) before an earlier one causes a data page fault in MEM (cycle 4). The hardware therefore records each interrupt in a status vector that is carried with the instruction, and checks it when the instruction reaches WB, so that interrupts are handled in order. A processor with a reorder buffer gets precise interrupts directly, since it raises an exception only when the instruction commits.

### Direct Memory Access

In programmed I/O, machine instructions transfer the data between the device and memory. This is not suitable for transferring large blocks at high speed, for two reasons [[3]](#ref-3):

- **The transfer rate is limited** by how fast the processor can test and service the device. Several instructions, with their memory accesses, are executed for each word, since they also increment the memory address and keep track of the word count [[2]](#ref-2). With 20 instructions per word at 1 GHz and CPI 1, a word takes 20 ns, i.e. at most 50 M words/s.
- **The processor is tied up** managing the transfer. With status checking it does nothing else until the transfer is over, and with an interrupt for each word, the overhead of the ISR is added to every word [[2]](#ref-2) [[3]](#ref-3).

A disk has a synchronous mode of operation: once the head reaches the track, the data arrives at a fixed rate. A 7200 rpm disk with 64 KB per track delivers 64 KB / 8.33 ms ≈ 7.7 MB/s, which for 32-bit words is one word every 520 ns. The 20 ns per word above can keep up with this, but with status checking the CPU is occupied for the whole block.

With **direct memory access (DMA)**, a block is transferred directly between a device and memory without continuous CPU intervention.

#### DMA Controller

A hardwired **DMA controller** carries out the transfer, so no instructions are executed for it. The maximum speed is determined by the rate of the memory read and write operations, which is much faster than programmed I/O.

<figure class="fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="DMA controller sharing the system bus with the CPU">
  <defs><marker id="arr-dm2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="20.0" y1="30.0" x2="560.0" y2="30.0" stroke="currentColor" stroke-width="2"/>
  <text x="566.0" y="34.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">address bus</text>
  <line x1="20.0" y1="55.0" x2="560.0" y2="55.0" stroke="currentColor" stroke-width="2"/>
  <text x="566.0" y="59.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">data bus</text>
  <line x1="20.0" y1="80.0" x2="560.0" y2="80.0" stroke="currentColor" stroke-width="2"/>
  <text x="566.0" y="84.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">control bus</text>
  <rect x="30" y="110" width="90" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="110" width="90" height="50" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="75.0" y="139.6" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <rect x="190" y="110" width="100" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="190" y="110" width="100" height="50" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="240.0" y="139.2" text-anchor="middle" font-size="12" fill="currentColor">memory</text>
  <rect x="360" y="110" width="120" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="360" y="110" width="120" height="50" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="420.0" y="132.3" text-anchor="middle" font-size="11" fill="currentColor">DMA</text>
  <text x="420.0" y="145.3" text-anchor="middle" font-size="11" fill="currentColor">controller</text>
  <rect x="380" y="210" width="80" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="420.0" y="233.8" text-anchor="middle" font-size="11" fill="currentColor">disk</text>
  <line x1="55.0" y1="30.0" x2="55.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="65.0" y1="55.0" x2="65.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="75.0" y1="80.0" x2="75.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="220.0" y1="30.0" x2="220.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="230.0" y1="55.0" x2="230.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="240.0" y1="80.0" x2="240.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="400.0" y1="30.0" x2="400.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="410.0" y1="55.0" x2="410.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="420.0" y1="80.0" x2="420.0" y2="108.0" stroke="currentColor" stroke-width="1"/>
  <line x1="420.0" y1="160.0" x2="420.0" y2="207.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dm2)"/>
  <line x1="440.0" y1="207.0" x2="440.0" y2="162.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-dm2)"/>
  <polyline points="360.0,125.0 330.0,125.0 330.0,190.0 100.0,190.0 100.0,163.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dm2)"/>
  <text x="215.0" y="184.0" text-anchor="middle" font-size="10" fill="#ef4444">DMA-RQ (bus request)</text>
  <polyline points="60.0,163.0 60.0,205.0 340.0,205.0 340.0,150.0 357.0,150.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dm2)"/>
  <text x="215.0" y="220.0" text-anchor="middle" font-size="10" fill="#22c55e">DMA-ACK (bus grant)</text>
</svg>
<figcaption>DMA controller on the system bus.</figcaption>
</figure>

1. The CPU initializes the DMA controller.
2. When the device is ready, the DMA controller sends **DMA-RQ** to the CPU.
3. At the next DMA breakpoint, the CPU releases the bus (puts its bus lines in the high-impedance state) and sends **DMA-ACK**.
4. The DMA controller transfers the data directly to or from memory.
5. When the transfer is done, it removes DMA-RQ, the CPU uses the bus again, and the DMA controller sends an interrupt to the CPU.

For every DMA channel, the controller has three registers, which the CPU initializes before each transfer: the memory address, the word count, and the address of the data on the disk.

<figure class="fig">
<svg viewBox="0 0 540 152" width="540" role="img" aria-label="A DMA controller with several channels, each with its own request and acknowledge lines">
  <defs><marker id="arr-ch" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="25" width="90" height="110" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="25" width="90" height="110" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="65.0" y="84.68" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <rect x="270" y="25" width="120" height="110" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="25" width="120" height="110" rx="3" fill="#f59e0b" opacity=".18"/>
  <text x="330.0" y="78.0" text-anchor="middle" font-size="11" fill="currentColor">DMA</text>
  <text x="330.0" y="92.0" text-anchor="middle" font-size="11" fill="currentColor">controller</text>
  <text x="190" y="42" text-anchor="middle" font-size="10" fill="currentColor">DMA-RQ</text>
  <polyline points="270,48 111,48" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ch)"/>
  <text x="190" y="74" text-anchor="middle" font-size="10" fill="currentColor">DMA-ACK</text>
  <polyline points="110,80 269,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ch)"/>
  <text x="190" y="106" text-anchor="middle" font-size="10" fill="currentColor">INTR</text>
  <polyline points="270,112 111,112" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ch)"/>
  <polyline points="460,40 391,40" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ch)"/>
  <text x="466" y="44" text-anchor="start" font-size="10" fill="currentColor">DMA-RQ<tspan dy="3" font-size="8">1</tspan></text>
  <polyline points="390,58 459,58" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ch)"/>
  <text x="466" y="62" text-anchor="start" font-size="10" fill="currentColor">DMA-ACK<tspan dy="3" font-size="8">1</tspan></text>
  <polyline points="460,102 391,102" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ch)"/>
  <text x="466" y="106" text-anchor="start" font-size="10" fill="currentColor">DMA-RQ<tspan dy="3" font-size="8">4</tspan></text>
  <polyline points="390,120 459,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ch)"/>
  <text x="466" y="124" text-anchor="start" font-size="10" fill="currentColor">DMA-ACK<tspan dy="3" font-size="8">4</tspan></text>
  <text x="425" y="85" text-anchor="middle" font-size="10" fill="currentColor">⋮</text>
</svg>
<figcaption>A DMA controller with several channels, here four.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 500 116" width="500" role="img" aria-label="DMA breakpoints after every machine cycle; interrupt only at the end of the instruction">
  <defs><marker id="arr-bp" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="40" y="40" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="80.0" y="60.2" text-anchor="middle" font-size="12" fill="currentColor">IF</text>
  <circle cx="120" cy="86" r="5" fill="#22c55e"/>
  <rect x="120" y="40" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="160.0" y="60.2" text-anchor="middle" font-size="12" fill="currentColor">ID</text>
  <circle cx="200" cy="86" r="5" fill="#22c55e"/>
  <rect x="200" y="40" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="60.2" text-anchor="middle" font-size="12" fill="currentColor">EX</text>
  <circle cx="280" cy="86" r="5" fill="#22c55e"/>
  <rect x="280" y="40" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="320.0" y="60.2" text-anchor="middle" font-size="12" fill="currentColor">MEM</text>
  <circle cx="360" cy="86" r="5" fill="#22c55e"/>
  <rect x="360" y="40" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="60.2" text-anchor="middle" font-size="12" fill="currentColor">WB</text>
  <circle cx="440" cy="86" r="5" fill="#22c55e"/>
  <circle cx="440" cy="26" r="6" fill="#ef4444"/>
  <text x="440.0" y="14.0" text-anchor="middle" font-size="10" fill="#ef4444">interrupt acknowledged</text>
  <text x="240.0" y="106.0" text-anchor="middle" font-size="10" fill="#22c55e">DMA request can be acknowledged at the end of any machine cycle</text>
</svg>
<figcaption>DMA breakpoints and the interrupt breakpoint in an instruction cycle.</figcaption>
</figure>

A DMA request can be acknowledged at the end of any machine cycle, since the CPU only gives up the bus and its state is not changed. An interrupt is acknowledged only at the end of an instruction, since the ISR changes the processor state.

#### DMA Transfer Modes

- **Cycle stealing:** the DMA controller requests the bus for a few cycles (1 or 2), preferably when the CPU is not using memory, and returns it after each word. It is said to steal cycles from the CPU without the CPU knowing it.
- **Block (burst) transfer:** the DMA controller transfers the whole block without interruption. This gives the maximum possible data rate, but the CPU lies idle during the transfer, as it cannot fetch instructions from memory.

<figure class="fig">
<svg viewBox="0 0 590 206" width="590" role="img" aria-label="Flowcharts of the DMA cycle stealing and block transfer modes">
  <defs><marker id="arr-dmf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="165" y="13" text-anchor="middle" font-size="11" fill="#ef4444">cycle stealing mode</text>
  <polyline points="165,19 165,39" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <rect x="70" y="40" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="165.0" y="58.6" text-anchor="middle" font-size="10" fill="currentColor">DMA controller takes over bus</text>
  <rect x="70" y="90" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="165.0" y="108.6" text-anchor="middle" font-size="10" fill="currentColor">DMA controller transfers one word</text>
  <rect x="70" y="140" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="165.0" y="158.6" text-anchor="middle" font-size="10" fill="currentColor">DMA controller returns bus control</text>
  <polyline points="165,70 165,89" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <polyline points="165,120 165,139" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <polyline points="165,170 165,197" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <text x="455" y="13" text-anchor="middle" font-size="11" fill="#ef4444">block transfer mode</text>
  <polyline points="455,19 455,39" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <rect x="360" y="40" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="455.0" y="58.6" text-anchor="middle" font-size="10" fill="currentColor">DMA controller takes over bus</text>
  <rect x="360" y="90" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="455.0" y="108.6" text-anchor="middle" font-size="10" fill="currentColor">DMA controller transfers one word</text>
  <rect x="360" y="140" width="190" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="455.0" y="158.6" text-anchor="middle" font-size="10" fill="currentColor">DMA controller returns bus control</text>
  <polyline points="455,70 455,89" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <polyline points="455,120 455,139" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <polyline points="455,170 455,197" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <circle cx="165" cy="184" r="2.6" fill="currentColor"/>
  <polyline points="165,184 30,184 30,30 163,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
  <circle cx="455" cy="130" r="2.6" fill="currentColor"/>
  <polyline points="455,130 330,130 330,80 453,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-dmf)"/>
</svg>
<figcaption>DMA transfer modes: cycle stealing gives up the bus after every word; block transfer keeps it until the whole block is done.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 500 118" width="500" role="img" aria-label="DMA cycle stealing and block transfer modes">
  <defs><marker id="arr-cs" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="110.0" y="34.0" text-anchor="end" font-size="10" fill="currentColor">cycle stealing</text>
  <text x="110.0" y="74.0" text-anchor="end" font-size="10" fill="currentColor">block (burst)</text>
  <rect x="120" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="120" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="135.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="150" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="165.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="180" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180" y="18" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="195.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="210" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="210" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="225.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="240" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="240" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="255.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="270" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="18" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="285.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="300" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="315.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="330" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="345.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="360" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="360" y="18" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="375.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="390" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="390" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="405.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="420" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="18" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="435.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="450" y="18" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="450" y="18" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="465.0" y="33.1" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="120" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="120" y="58" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="135.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="150" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="58" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="165.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="180" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180" y="58" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="195.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="210" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="210" y="58" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="225.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="240" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="240" y="58" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="255.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="270" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="58" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="285.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="300" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="58" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="315.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="330" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="58" width="30" height="24" rx="0" fill="#f59e0b" opacity=".3"/>
  <text x="345.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">D</text>
  <rect x="360" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="360" y="58" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="375.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="390" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="390" y="58" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="405.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="420" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="58" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="435.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <rect x="450" y="58" width="30" height="24" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="450" y="58" width="30" height="24" rx="0" fill="#3b82f6" opacity=".3"/>
  <text x="465.0" y="73.2" text-anchor="middle" font-size="9" fill="currentColor">C</text>
  <text x="120.0" y="110.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">C: memory cycle used by the CPU; D: memory cycle used by DMA</text>
</svg>
<figcaption>Memory cycles in cycle-stealing and block transfer modes.</figcaption>
</figure>

#### Other Applications of DMA

Other than transfers to and from high-speed peripherals, DMA can be used for:

- High-speed memory-to-memory block moves.
- Refreshing dynamic memory, by periodically generating dummy read requests to the columns.

### Exercises on I/O Transfer

Data rates are taken with 1 KB = 1000 B.

<div class="example">

2048 bytes are read in programmed I/O mode with a 32-bit bus. Each interrupt takes 4 μs to service (transferring 32 bits). How much CPU time is needed?

</div>

$2048/4 = 512$ interrupts, so $512 \times 4\ \mu\text{s} = 2048\ \mu\text{s} \approx 2.05$ ms.

<div class="example">

A DMA module transfers bytes from a device at 76800 bit/s. The CPU fetches 2 million 32-bit instructions per second. How much is the processor slowed down?

</div>

The device delivers $76800/8 = 9600$ bytes/s, and each byte takes one memory cycle. The CPU uses $2 \times 10^6$ memory cycles per second for instruction fetches, so the slowdown is $9600/(2 \times 10^6) = 0.48\%$.

<div class="example">

A DMA controller transfers 32-bit words to memory by cycle stealing. The words are assembled from a device that sends 2400 bytes/s. The CPU executes $10^6$ instructions per second. How much is the CPU slowed down?

</div>

$2400/4 = 600$ words/s, i.e. 600 stolen cycles per second, so the slowdown is $600/10^6 = 0.06\%$.

<div class="example">

A device transfers 8 KB/s continuously with interrupt-driven I/O, interrupting for every byte. The interrupt processing takes 100 μs, and the ISR takes 8 μs to transfer the byte. What fraction of CPU time does the device take?

</div>

Each byte costs $100 + 8 = 108\ \mu$s, and there are 8000 bytes per second: $8000 \times 108\ \mu\text{s} = 0.864$ s per second, i.e. 86.4% of the CPU time.

<div class="example">

A disk has 16 surfaces, 512 tracks per surface, 512 sectors per track, 1024 bytes per sector, and rotates at 3600 rpm. It uses cycle stealing, transferring one 4-byte word per DMA cycle, and the memory cycle time is 40 ns. Find the maximum percentage of time the CPU is blocked.

</div>

A track holds $512 \times 1024 = 2^{19}$ bytes and is read in one rotation, $1/60$ s, so the transfer rate is $2^{19} \times 60 \approx 31.46 \times 10^6$ bytes/s. A 4-byte word arrives every $4/(31.46 \times 10^6) \approx 127$ ns, and each word blocks the CPU for one 40 ns memory cycle: $40/127 \approx 31.5\%$.

<div class="example">

A disk is connected through DMA to a 50 MHz processor. Setting up a DMA transfer takes 2000 cycles, and handling the completion interrupt takes 1000 cycles. The disk transfers 4000 KB/s in blocks of 8 KB on average, during idle CPU cycles. What fraction of the processor time does the disk use?

</div>

$4000/8 = 500$ blocks per second, each costing $2000 + 1000 = 3000$ cycles: $500 \times 3000 = 1.5 \times 10^6$ cycles out of $50 \times 10^6$, i.e. 3%.

<div class="example">

A device of 20 KB/s transfers data byte by byte. The interrupt overhead is 6 μs, and the transfer time between the interface register and the CPU or memory is negligible. What is the minimum performance gain of interrupt-driven mode over programmed (busy-wait) mode?

</div>

With busy waiting, the CPU is occupied for the whole transfer. With interrupts, it is occupied for $20\,000 \times 6\ \mu\text{s} = 0.12$ s per second of transfer. So the gain is at least $1/0.12 \approx 8.3$.

### Device Interfacing Examples

**Keyboard.** A keyboard is a set of push-button switches. With one key per port line, $N$ keys need $N$ lines; arranged as a matrix, they need $2\sqrt{N}$ lines.

- To detect a key press, all rows are set to 0 and the columns are read; if any column bit is 0, a key is pressed.
- To find which key (**keyboard scanning**), one row at a time is set to 0 and the columns are checked, giving the row and column of the key.
- For interrupt-driven operation, the rows are grounded through AND gates with a control input set to 0, and the column lines go to a NAND gate whose output is connected to INTR, so a key press raises an interrupt. In the ISR the control input is set to 1 and the keyboard is scanned.

### Buses

A **bus** is a collection of wires through which data is transmitted: the data bus carries the data, and the address bus carries where it should go. The **bus protocol** is the set of rules for the format and transmission of data.

- **Parallel bus:** fast, but costly over long distances and subject to interference between lines at high frequency. **Serial bus:** cheap over long distances, without interference, but slower.
- The device that controls the bus is the **master**, the others are **slaves**.
- **Bus width** is the number of data wires, and **bus bandwidth** the amount of data transferred per unit time (e.g. a 32-bit bus clocked at 33.3 MHz, one transfer per clock: 4 B × 33.3 MHz ≈ 133 MB/s).

In a **synchronous bus** a common clock controls the operations. For a memory read, the CPU places the address, asserts MREQ and RD once the address is stable, the memory places the data, and the CPU reads it and removes MREQ and RD.

In an **asynchronous bus** there is no common clock, and the master and slave handshake:

<figure class="fig">
<svg viewBox="0 0 526 248" width="526" role="img" aria-label="Asynchronous bus read with MSYN and SSYN handshake">
  <defs><marker id="arr-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="80.0" y="34.0" text-anchor="end" font-size="10" fill="currentColor">address</text>
  <polyline points="90.0,38.0 142.0,22.0 454.0,22.0 506.0,38.0" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <text x="80.0" y="72.0" text-anchor="end" font-size="10" fill="currentColor">MREQ, RD</text>
  <polyline points="90.0,76.0 168.0,76.0 168.0,60.0 428.0,60.0 428.0,76.0 506.0,76.0" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <text x="80.0" y="110.0" text-anchor="end" font-size="10" fill="currentColor">MSYN</text>
  <polyline points="90.0,114.0 194.0,114.0 194.0,98.0 376.0,98.0 376.0,114.0 506.0,114.0" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <text x="80.0" y="148.0" text-anchor="end" font-size="10" fill="currentColor">data</text>
  <polyline points="90.0,152.0 272.0,152.0 272.0,136.0 402.0,136.0 402.0,152.0 506.0,152.0" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <text x="80.0" y="186.0" text-anchor="end" font-size="10" fill="currentColor">SSYN</text>
  <polyline points="90.0,190.0 298.0,190.0 298.0,174.0 443.6,174.0 443.6,190.0 506.0,190.0" stroke="currentColor" stroke-width="1.6" fill="none"/>
  <line x1="194.0" y1="16.0" x2="194.0" y2="214.0" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3"/>
  <line x1="298.0" y1="16.0" x2="298.0" y2="214.0" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3"/>
  <line x1="376.0" y1="16.0" x2="376.0" y2="214.0" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3"/>
  <line x1="443.6" y1="16.0" x2="443.6" y2="214.0" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3"/>
  <text x="194.0" y="228.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">MSYN: master ready</text>
  <text x="298.0" y="240.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">SSYN: data on bus</text>
  <text x="412.4" y="228.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">master took data</text>
</svg>
<figcaption>Asynchronous memory read.</figcaption>
</figure>

1. The CPU places the address, and asserts MREQ and RD when the address is stable.
2. The CPU asserts MSYN, and the memory controller accesses the memory.
3. The memory controller places the data on the data lines and asserts SSYN.
4. The CPU takes the data and removes MREQ, RD and MSYN.
5. The memory controller removes SSYN.

**Bridge-based** architectures separate the buses by bridges, so that different buses can operate in parallel.

#### Bus Arbitration

Several devices may need to be bus masters, e.g. an I/O device transferring data directly to memory. Since the bus is shared, an **arbiter** decides which master gets it [[2]](#ref-2):

- Each master has a **Bus-request** line ($BR_i$) and a **Bus-grant** line ($BG_i$) to the arbiter. A master asks for the bus by activating $BR_i$, and the arbiter activates $BG_i$ to let it use the bus. When the transfer is complete the master deactivates $BR_i$, and the arbiter deactivates $BG_i$.
- If several requests arrive together, the arbiter grants the bus to the one with the **highest priority** first. Devices for which a delay could cause an error get high priority; if there is no urgency, a simple **round-robin** scheme can be used.

For example, with three masters where master 1 has the highest priority: master 2 requests first and gets the bus. While it is using the bus, master 3 and then master 1 also request it. When master 2 releases the bus, the arbiter grants it to master 1, and only then to master 3, even though master 3 asked first (after Hamacher, Fig. 7.9).

### Universal Serial Bus

USB connects almost all kinds of peripherals (keyboard, mouse, printer, disks, cameras, phones). It replaced the variety of connectors and simplified the software configuration of devices.

Data is sent serially with differential NRZI (non-return-to-zero inverted) encoding: a 0 is sent as a change of signal level and a 1 as no change. **Bit stuffing** guarantees a minimum frequency of transitions: a 0 is inserted after every six consecutive 1s, e.g. `1101 1111 1101 0100` → `1101 1111 10101 0100`.

USB uses a **tiered star topology**: all devices are connected to a root hub, through hubs, up to 127 devices. The cable has 4 wires (power, ground and two differential signal lines). USB is a **polled bus**: all transactions are initiated by the host.

<figure class="fig">
<svg viewBox="0 0 560 214" width="560" role="img" aria-label="USB tiered star topology">
  <defs><marker id="arr-us" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="220" y="10" width="110" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="220" y="10" width="110" height="34" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="275.0" y="30.5" text-anchor="middle" font-size="10" fill="currentColor">host / root hub</text>
  <rect x="45" y="90" width="70" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="45" y="90" width="70" height="28" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="80.0" y="107.5" text-anchor="middle" font-size="10" fill="currentColor">hub</text>
  <line x1="275.0" y1="44.0" x2="80.0" y2="88.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="240" y="90" width="70" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="240" y="90" width="70" height="28" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="275.0" y="107.5" text-anchor="middle" font-size="10" fill="currentColor">hub</text>
  <line x1="275.0" y1="44.0" x2="275.0" y2="88.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="435" y="90" width="70" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="435" y="90" width="70" height="28" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="470.0" y="107.5" text-anchor="middle" font-size="10" fill="currentColor">hub</text>
  <line x1="275.0" y1="44.0" x2="470.0" y2="88.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="5" y="160" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.0" y="176.2" text-anchor="middle" font-size="9" fill="currentColor">device</text>
  <line x1="80.0" y1="118.0" x2="30.0" y2="158.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="75" y="160" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="176.2" text-anchor="middle" font-size="9" fill="currentColor">device</text>
  <line x1="80.0" y1="118.0" x2="100.0" y2="158.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="215" y="160" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="176.2" text-anchor="middle" font-size="9" fill="currentColor">device</text>
  <line x1="275.0" y1="118.0" x2="240.0" y2="158.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="285" y="160" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="176.2" text-anchor="middle" font-size="9" fill="currentColor">device</text>
  <line x1="275.0" y1="118.0" x2="310.0" y2="158.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="425" y="160" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="450.0" y="176.2" text-anchor="middle" font-size="9" fill="currentColor">device</text>
  <line x1="470.0" y1="118.0" x2="450.0" y2="158.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <rect x="495" y="160" width="50" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="176.2" text-anchor="middle" font-size="9" fill="currentColor">device</text>
  <line x1="470.0" y1="118.0" x2="520.0" y2="158.0" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-us)"/>
  <text x="275.0" y="206.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">tiered star: up to 127 devices; the host initiates every transaction</text>
</svg>
<figcaption>USB tiered star topology.</figcaption>
</figure>

- **Host:** controls the system (usually the computer) and contains the software drivers that schedule transactions and read the device configurations. Its physical interface to the root hub is the host controller.
- **Hub:** detects new devices and keeps their status, acts as a repeater for the signals, and isolates the devices electrically, so malfunctioning devices can be removed and slower devices put on a separate branch.
- **Device:** a slave that only responds to reads and writes and never initiates them. It contains registers with its configuration information.

The client software decides what data to transfer, the USB system software schedules when and how often, and the host controller composes and regulates the transfers.

## Parallel Architectures

Flynn's taxonomy classifies computer organizations by the number of instruction streams and data streams they handle at once [[3]](#ref-3).

<figure class="table">
<figcaption>Flynn's taxonomy.</figcaption>

| Class | Meaning | Examples |
|:--|:--|:--|
| SISD | single instruction stream, single data stream | uniprocessor |
| SIMD | single instruction stream, multiple data streams | vector and array processors, GPUs |
| MISD | multiple instruction streams, single data stream | no commercial machine |
| MIMD | multiple instruction streams, multiple data streams | multiprocessors |

</figure>

### Hardware Multithreading

Instruction-level parallelism (ILP, see [Instruction-Level Parallelism](#instruction-level-parallelism)) within one thread is limited, and long stalls such as cache misses leave the functional units idle. **Multithreading** lets several threads share the functional units of one processor.

The processor has several identical **sets of registers**, including **multiple program counters**, and each set is dedicated to a different thread (each thread also has its own page table register). This technique is called **hardware multithreading**.

- **Context switch with one register set:** at the end of a **time slice**, a **timer interrupt** invokes an interrupt-service routine in the OS, and the registers of the old thread are saved and those of the new thread restored.
- **Context switch with multiple register sets:** only a **hardware pointer** changes, to select a different set for fetching and executing instructions. The switch can finish within one clock cycle. No time is spent saving or restoring registers, since the state of the previous thread stays in its own set.

There are three main approaches, which differ in how the threads share the processor:

- **Fine-grained multithreading** switches between threads every clock cycle, in round-robin order, skipping stalled threads. Short and long stalls of one thread are hidden by the others, but a thread that is ready to run is delayed by the others. Example: GPUs.
- **Coarse-grained multithreading** switches only on costly stalls such as L2 or L3 misses. A single thread runs at nearly full speed, but short stalls are not hidden, and the pipeline must be refilled after each switch.
- **Simultaneous multithreading (SMT)** issues instructions from several threads in the same cycle, on a dynamically scheduled multiple-issue processor. Register renaming keeps the registers of the threads apart, and the issue slots one thread leaves empty are filled by the others. Example: the AMD Ryzen 7 5800H runs two threads per core (8 cores, 16 threads).

<figure class="fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Use of issue slots by a superscalar processor without multithreading, with coarse-grained and fine-grained multithreading, and with simultaneous multithreading">
  <defs><marker id="arr-smt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="66.0" y="18.0" text-anchor="middle" font-size="12" fill="currentColor">Superscalar</text>
  <rect x="30" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="66" y="30" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="30" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="46" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="66" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="62" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="48" y="62" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="66" y="62" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="62" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="78" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="78" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="66" y="78" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="84" y="78" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="94" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="94" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="66" y="94" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="94" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="48" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="66" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="48" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="66" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="142" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="142" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="66" y="142" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="142" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="158" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="158" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="66" y="158" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="84" y="158" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="30" y="174" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="66" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="190" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="48" y="190" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="66" y="190" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="190" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="30" y="206" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="48" y="206" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="66" y="206" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="84" y="206" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <text x="216.0" y="18.0" text-anchor="middle" font-size="12" fill="currentColor">Coarse MT</text>
  <rect x="180" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="216" y="30" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="30" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="46" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="216" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="62" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="62" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="216" y="62" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="234" y="62" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="78" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="198" y="78" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="216" y="78" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="78" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="94" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="94" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="216" y="94" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="234" y="94" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="110" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="216" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="126" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="126" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="216" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="142" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="142" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="216" y="142" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="234" y="142" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="180" y="158" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="198" y="158" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="216" y="158" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="158" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="174" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="174" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="216" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="190" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="190" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="216" y="190" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="234" y="190" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="180" y="206" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="198" y="206" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="216" y="206" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="234" y="206" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <text x="366.0" y="18.0" text-anchor="middle" font-size="12" fill="currentColor">Fine MT</text>
  <rect x="330" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="366" y="30" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="30" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="46" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="366" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="46" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="62" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="62" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="366" y="62" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="62" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="78" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="78" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="366" y="78" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="384" y="78" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="94" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="94" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="366" y="94" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="94" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="110" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="110" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="366" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="110" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="126" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="366" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="126" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="142" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="142" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="366" y="142" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="142" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="158" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="158" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="366" y="158" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="384" y="158" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="174" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="366" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="174" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="330" y="190" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="190" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="366" y="190" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="384" y="190" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="330" y="206" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="348" y="206" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="366" y="206" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <rect x="384" y="206" width="18" height="16" fill="none" stroke="currentColor" stroke-width=".6" opacity=".35"/>
  <text x="516.0" y="18.0" text-anchor="middle" font-size="12" fill="currentColor">SMT</text>
  <rect x="480" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="30" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="30" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="30" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="46" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="46" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="46" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="46" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="62" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="62" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="62" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="62" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="78" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="78" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="78" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="78" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="94" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="94" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="94" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="94" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="110" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="110" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="110" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="110" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="126" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="126" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="126" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="126" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="142" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="142" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="142" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="142" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="158" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="158" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="158" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="158" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="174" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="174" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="174" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="174" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="190" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="190" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="190" width="18" height="16" fill="#22c55e" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="190" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="480" y="206" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="498" y="206" width="18" height="16" fill="#f59e0b" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="516" y="206" width="18" height="16" fill="#3b82f6" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <rect x="534" y="206" width="18" height="16" fill="#ef4444" opacity=".8" stroke="currentColor" stroke-width=".6"/>
  <line x1="14.0" y1="30.0" x2="14.0" y2="222.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-smt)"/>
  <text x="8" y="126" text-anchor="middle" font-size="10" fill="currentColor" class="dim" transform="rotate(-90 8 126)">time (clock cycles)</text>
  <text x="66.0" y="238.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">issue slots</text>
  <rect x="200" y="228" width="12" height="12" fill="#3b82f6" opacity=".8"/>
  <text x="218.0" y="238.0" text-anchor="start" font-size="10" fill="currentColor">thread A</text>
  <rect x="280" y="228" width="12" height="12" fill="#ef4444" opacity=".8"/>
  <text x="298.0" y="238.0" text-anchor="start" font-size="10" fill="currentColor">thread B</text>
  <rect x="360" y="228" width="12" height="12" fill="#22c55e" opacity=".8"/>
  <text x="378.0" y="238.0" text-anchor="start" font-size="10" fill="currentColor">thread C</text>
  <rect x="440" y="228" width="12" height="12" fill="#f59e0b" opacity=".8"/>
  <text x="458.0" y="238.0" text-anchor="start" font-size="10" fill="currentColor">thread D</text>
  <rect x="520" y="228" width="12" height="12" fill="none" stroke="currentColor" stroke-width=".6" opacity=".5"/>
  <text x="538.0" y="238.0" text-anchor="start" font-size="10" fill="currentColor">idle slot</text>
</svg>
<figcaption>Use of the issue slots of a 4-issue processor by four threads A–D (after Hennessy & Patterson). Without multithreading, slots are lost to lack of ILP (empty slots in a row) and to stalls (empty rows). Coarse-grained multithreading hides only the long stalls, fine-grained multithreading hides the stalls but uses only the ILP of one thread per cycle, and SMT fills the slots in each cycle from several threads.</figcaption>
</figure>

### Vector Processors

The performance gained from pipelining is limited by the clock cycle time (more stages give more dependences and a higher CPI) and by the instruction fetch and decode rate (the *Flynn bottleneck*). A **vector processor** has instructions that operate on entire arrays (vectors); one vector instruction is equivalent to a loop, with no loop overhead. For example, `ADDV V1, V2, V3` adds two vectors of 64 elements.

- It consists of a pipelined scalar unit and a vector unit: vector registers (e.g. 8 registers of 64 double-words, each with 2 read ports and 1 write port), deeply pipelined vector functional units, and a pipelined load/store unit with interleaved memory.
- Deep pipelining causes no hazards between the elements, since each element is computed independently.

<div class="example">

DAXPY (double-precision $a$ times $X$ plus $Y$): $Y = aX + Y$ for vectors of 64 elements.

</div>

The MIPS32 loop, with 9 instructions per element (`L.D`, `MUL.D`, `L.D`, `ADD.D`, `S.D`, two `DADDIU`, `DSUBU`, `BNEZ`), executes $2 + 9 \times 64 = 578$ instructions; the vector code has 6 (`L.D`, `LV`, `MULTSV`, `LV`, `ADDVV`, `SV`). Pipeline interlocks occur once per vector operation instead of once per element, about 64 times less often.

The time for a vector operation of length $n$ is

$$\text{start-up time} + n \times \text{initiation rate}$$

The start-up time is determined by the pipeline depth, and the initiation rate is usually one result per cycle. A multiply with a start-up time of 12 cycles on 64 elements takes $(12 + 64)/64 = 1.19$ cycles per result. Independent vector operations on different units overlap: MULTV (start-up 7) and ADDV (start-up 6, starting one cycle later) both complete at cycle 71, i.e. 128 results in 71 cycles, or 1.8 FLOPS per cycle.

Other concepts: the **vector length register** specifies the length of a vector operation; **strides** allow vector elements that are not adjacent in memory; **strip mining** splits a loop over a long vector into loops over the hardware vector length.

#### Convoys and Chaining

A **convoy** is a set of vector instructions that can execute together: they have no structural hazards between them. With **chaining**, a dependent instruction can also be in the same convoy: the elements of the result of one vector unit are forwarded to the next unit as they are produced, as forwarding does for scalar results. A **chime** is the time to execute one convoy. A sequence of $m$ convoys on vectors of length $n$ takes about $m \times n$ cycles, ignoring the start-up time.

<div class="example">

DAXPY with one load/store unit and chaining.

</div>

```text
LV      V1, Rx          ; convoy 1: LV, MULTSV (chained)
MULTSV  V2, F0, V1
LV      V3, Ry          ; convoy 2: LV, ADDVV (chained)
ADDVV   V4, V2, V3
SV      V4, Ry          ; convoy 3: SV
```

There are 3 convoys, so 3 chimes: about $3 \times 64 = 192$ cycles, or 3 cycles per element. The two loads are in different convoys because there is only one load/store unit.

#### Multiple Lanes

A vector unit can have several **lanes**. Each lane has a part of the vector register file and one pipeline of each functional unit. With $m$ lanes, element $i$ of every vector register is in lane $i \bmod m$, so the lanes operate on different elements in parallel without communicating. With 4 lanes, one vector instruction completes 4 elements per cycle and a chime is reduced from 64 to 16 cycles.

<figure class="fig">
<svg viewBox="0 0 630 236" width="630" role="img" aria-label="A vector unit with four lanes; lane k holds elements k, k+4, k+8 and so on">
  <defs><marker id="arr-lane" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="90.0" y="14.0" text-anchor="middle" font-size="12" fill="currentColor">lane 0</text>
  <rect x="30" y="30" width="120" height="46" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="30" width="120" height="46" rx="3" fill="#a855f7" opacity=".18"/>
  <text x="90.0" y="48.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">vector registers:</text>
  <text x="90.0" y="64.0" text-anchor="middle" font-size="11" fill="currentColor">elements 0, 4, 8, …</text>
  <rect x="22" y="22" width="136" height="188" rx="4" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity=".6"/>
  <rect x="30" y="98" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="98" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="90.0" y="116.8" text-anchor="middle" font-size="11" fill="currentColor">FP add pipe</text>
  <rect x="30" y="136" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="136" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="90.0" y="154.8" text-anchor="middle" font-size="11" fill="currentColor">FP mul pipe</text>
  <rect x="30" y="174" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="174" width="120" height="30" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="90.0" y="192.8" text-anchor="middle" font-size="11" fill="currentColor">load/store</text>
  <text x="240.0" y="14.0" text-anchor="middle" font-size="12" fill="currentColor">lane 1</text>
  <rect x="180" y="30" width="120" height="46" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180" y="30" width="120" height="46" rx="3" fill="#a855f7" opacity=".18"/>
  <text x="240.0" y="48.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">vector registers:</text>
  <text x="240.0" y="64.0" text-anchor="middle" font-size="11" fill="currentColor">elements 1, 5, 9, …</text>
  <rect x="172" y="22" width="136" height="188" rx="4" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity=".6"/>
  <rect x="180" y="98" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180" y="98" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="240.0" y="116.8" text-anchor="middle" font-size="11" fill="currentColor">FP add pipe</text>
  <rect x="180" y="136" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180" y="136" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="240.0" y="154.8" text-anchor="middle" font-size="11" fill="currentColor">FP mul pipe</text>
  <rect x="180" y="174" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180" y="174" width="120" height="30" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="240.0" y="192.8" text-anchor="middle" font-size="11" fill="currentColor">load/store</text>
  <text x="390.0" y="14.0" text-anchor="middle" font-size="12" fill="currentColor">lane 2</text>
  <rect x="330" y="30" width="120" height="46" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="30" width="120" height="46" rx="3" fill="#a855f7" opacity=".18"/>
  <text x="390.0" y="48.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">vector registers:</text>
  <text x="390.0" y="64.0" text-anchor="middle" font-size="11" fill="currentColor">elements 2, 6, 10, …</text>
  <rect x="322" y="22" width="136" height="188" rx="4" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity=".6"/>
  <rect x="330" y="98" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="98" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="390.0" y="116.8" text-anchor="middle" font-size="11" fill="currentColor">FP add pipe</text>
  <rect x="330" y="136" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="136" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="390.0" y="154.8" text-anchor="middle" font-size="11" fill="currentColor">FP mul pipe</text>
  <rect x="330" y="174" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="174" width="120" height="30" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="390.0" y="192.8" text-anchor="middle" font-size="11" fill="currentColor">load/store</text>
  <text x="540.0" y="14.0" text-anchor="middle" font-size="12" fill="currentColor">lane 3</text>
  <rect x="480" y="30" width="120" height="46" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="30" width="120" height="46" rx="3" fill="#a855f7" opacity=".18"/>
  <text x="540.0" y="48.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">vector registers:</text>
  <text x="540.0" y="64.0" text-anchor="middle" font-size="11" fill="currentColor">elements 3, 7, 11, …</text>
  <rect x="472" y="22" width="136" height="188" rx="4" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity=".6"/>
  <rect x="480" y="98" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="98" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="540.0" y="116.8" text-anchor="middle" font-size="11" fill="currentColor">FP add pipe</text>
  <rect x="480" y="136" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="136" width="120" height="30" rx="3" fill="#3b82f6" opacity=".18"/>
  <text x="540.0" y="154.8" text-anchor="middle" font-size="11" fill="currentColor">FP mul pipe</text>
  <rect x="480" y="174" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="174" width="120" height="30" rx="3" fill="#22c55e" opacity=".18"/>
  <text x="540.0" y="192.8" text-anchor="middle" font-size="11" fill="currentColor">load/store</text>
  <text x="315.0" y="226.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">vector load/store unit and memory banks</text>
  <line x1="30.0" y1="214.0" x2="600.0" y2="214.0" stroke="currentColor" stroke-width="2"/>
</svg>
<figcaption>A vector unit with four lanes. Lane $k$ holds elements $k, k+4, k+8, \ldots$ of each vector register.</figcaption>
</figure>

#### Vector Mask Registers

A loop with an `if` cannot be vectorized directly:

```c
for (i = 0; i < 64; i++)
    if (X[i] != 0)
        X[i] = X[i] - Y[i];
```

A **vector mask register** holds one bit per element. A compare instruction sets the mask, and the following vector instructions operate only on the elements whose mask bit is 1:

```text
LV        V1, Rx        ; load X
LV        V2, Ry        ; load Y
L.D       F0, #0        ; F0 = 0
SNEVS.D   V1, F0        ; VM(i) = 1 if V1(i) != F0
SUBVV.D   V1, V1, V2    ; subtract under the mask
SV        V1, Rx        ; store X
```

The elements with mask bit 0 still take time in the pipeline, so the efficiency drops as fewer bits are 1.

#### Memory Banks

The memory system must supply one word per lane per cycle, while a memory bank needs several cycles (the **bank busy time**) before it can be accessed again. So the memory has many independent banks, interleaved by word address (memory interleaving, as in Memory Organization). With $b$ banks and stride $s$, an access returns to the same bank after $\text{LCM}(s, b)/s$ accesses, and there is a stall if this is less than the bank busy time.

<div class="example">

8 banks, bank busy time 6 cycles, memory latency 12 cycles. Time to load a vector of 64 elements with stride 1 and with stride 32 (Hennessy & Patterson)?

</div>

- Stride 1: consecutive elements are in different banks, and a bank is used again only after 8 accesses, more than 6. Time $= 12 + 64 = 76$ cycles, 1.2 cycles per element.
- Stride 32: $32 \bmod 8 = 0$, so every element is in the same bank, and each access after the first waits for the bank busy time. Time $= 12 + 1 + 6 \times 63 = 391$ cycles, 6.1 cycles per element.

#### Gather and Scatter

Sparse matrices are accessed through index vectors. A **gather** (`LVI`, load vector indexed) loads the elements at base address + index vector; a **scatter** (`SVI`) stores them back the same way.

```c
for (i = 0; i < n; i++)
    A[K[i]] = A[K[i]] + C[M[i]];
```

```text
LV      Vk, Rk          ; load K
LVI     Va, (Ra+Vk)     ; gather A[K[i]]
LV      Vm, Rm          ; load M
LVI     Vc, (Rc+Vm)     ; gather C[M[i]]
ADDVV.D Va, Va, Vc
SVI     (Ra+Vk), Va     ; scatter A[K[i]]
```

The elements are in different banks in no particular order, so gathers and scatters are much slower than accesses with a fixed stride.

### SIMD Instruction Set Extensions

Most general-purpose processors have **SIMD** (single instruction, multiple data) **extensions**: instructions that operate on several narrow elements packed in a wide register, e.g. eight 8-bit or four 16-bit operands in a 64-bit register. They were added for multimedia, where data is often 8 or 16 bits wide.

<figure class="table">
<figcaption>SIMD extensions of the x86 architecture.</figcaption>

| Extension | Year | Register width |
|:--|:-:|:-:|
| MMX | 1996 | 64 bits |
| SSE | 1999 | 128 bits |
| AVX | 2010 | 256 bits |

</figure>

Compared with vector architectures, the SIMD extensions fix the number of elements in the opcode (no vector length register), and the early versions had no strided or gather/scatter accesses and no mask registers. Each increase in width added hundreds of new instructions, and AVX includes preparations to extend the width to 512 and 1024 bits [[4]](#ref-4). They are easy to add to a processor, need little extra state for context switches, and need little memory bandwidth.

### The Roofline Model

The **arithmetic intensity** of a program is the number of floating-point operations (FLOP) per byte of memory (DRAM) accessed. The **roofline model** bounds the performance of a program on a processor by its arithmetic intensity:

$$\text{Attainable GFLOP/s} = \min(\text{peak memory bandwidth} \times \text{arithmetic intensity},\ \text{peak floating-point performance})$$

On a log–log plot this is a sloped line (memory-bound) joined to a horizontal line (compute-bound). The **ridge point**, where they meet, is the minimum arithmetic intensity needed to reach the peak floating-point performance.

<figure class="fig">
<svg viewBox="0 0 540 294" width="540" role="img" aria-label="Roofline model of the AMD Ryzen 7 5800H">
  <defs><marker id="arr-roof" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="70.0" y1="250.0" x2="525.0" y2="250.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-roof)"/>
  <line x1="70.0" y1="250.0" x2="70.0" y2="10.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-roof)"/>
  <line x1="70.0" y1="250.0" x2="70.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="70.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">1/16</text>
  <line x1="114.0" y1="250.0" x2="114.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="114.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">1/8</text>
  <line x1="158.0" y1="250.0" x2="158.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="158.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">1/4</text>
  <line x1="202.0" y1="250.0" x2="202.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="202.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">1/2</text>
  <line x1="246.0" y1="250.0" x2="246.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="246.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">1</text>
  <line x1="290.0" y1="250.0" x2="290.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="290.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">2</text>
  <line x1="334.0" y1="250.0" x2="334.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="334.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">4</text>
  <line x1="378.0" y1="250.0" x2="378.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="378.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">8</text>
  <line x1="422.0" y1="250.0" x2="422.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="422.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">16</text>
  <line x1="466.0" y1="250.0" x2="466.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="466.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">32</text>
  <line x1="510.0" y1="250.0" x2="510.0" y2="254.0" stroke="currentColor" stroke-width="1"/>
  <text x="510.0" y="266.0" text-anchor="middle" font-size="10" fill="currentColor">64</text>
  <line x1="66.0" y1="250.0" x2="70.0" y2="250.0" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="253.0" text-anchor="end" font-size="10" fill="currentColor">2</text>
  <line x1="66.0" y1="224.4" x2="70.0" y2="224.4" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="227.4" text-anchor="end" font-size="10" fill="currentColor">4</text>
  <line x1="66.0" y1="198.9" x2="70.0" y2="198.9" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="201.9" text-anchor="end" font-size="10" fill="currentColor">8</text>
  <line x1="66.0" y1="173.3" x2="70.0" y2="173.3" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="176.3" text-anchor="end" font-size="10" fill="currentColor">16</text>
  <line x1="66.0" y1="147.8" x2="70.0" y2="147.8" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="150.8" text-anchor="end" font-size="10" fill="currentColor">32</text>
  <line x1="66.0" y1="122.2" x2="70.0" y2="122.2" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="125.2" text-anchor="end" font-size="10" fill="currentColor">64</text>
  <line x1="66.0" y1="96.7" x2="70.0" y2="96.7" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="99.7" text-anchor="end" font-size="10" fill="currentColor">128</text>
  <line x1="66.0" y1="71.1" x2="70.0" y2="71.1" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="74.1" text-anchor="end" font-size="10" fill="currentColor">256</text>
  <line x1="66.0" y1="45.6" x2="70.0" y2="45.6" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="48.6" text-anchor="end" font-size="10" fill="currentColor">512</text>
  <line x1="66.0" y1="20.0" x2="70.0" y2="20.0" stroke="currentColor" stroke-width="1"/>
  <text x="62.0" y="23.0" text-anchor="end" font-size="10" fill="currentColor">1024</text>
  <text x="290.0" y="284.0" text-anchor="middle" font-size="11" fill="currentColor">arithmetic intensity (FLOP/byte)</text>
  <text x="18" y="135.0" text-anchor="middle" font-size="11" fill="currentColor" transform="rotate(-90 18 135.0)">attainable GFLOP/s</text>
  <path d="M70.0,232.7 L378.0,53.8 L510.0,53.8" stroke="#ef4444" stroke-width="2.5" fill="none"/>
  <text x="165.0" y="130.0" text-anchor="middle" font-size="10" fill="#ef4444">51.2 GB/s × intensity</text>
  <text x="450.0" y="45.8" text-anchor="middle" font-size="10" fill="#ef4444">peak 409.6 GFLOP/s</text>
  <line x1="378.0" y1="53.8" x2="378.0" y2="250.0" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="374.0" y="242.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">ridge point = 8</text>
  <circle cx="158.0" cy="181.6" r="4" fill="#3b82f6"/>
  <circle cx="422.0" cy="53.8" r="4" fill="#3b82f6"/>
  <text x="166.0" y="197.6" text-anchor="start" font-size="10" fill="currentColor">0.25 FLOP/byte: 12.8 GFLOP/s</text>
  <text x="430.0" y="69.8" text-anchor="start" font-size="10" fill="currentColor">16 FLOP/byte: peak</text>
  <text x="118.9" y="40.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">memory-bound</text>
  <text x="461.1" y="112.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">compute-bound</text>
</svg>
<figcaption>Roofline of the AMD Ryzen 7 5800H for double precision, from theoretical peaks: memory bandwidth 51.2 GB/s (dual-channel DDR4-3200) and 409.6 GFLOP/s (after Hennessy &amp; Patterson, Fig. 4.11 <a href="#ref-4">[4]</a>).</figcaption>
</figure>

Each Zen 3 core has two 256-bit FMA (fused multiply–add, $a \times b + c$ in one instruction) units (16 double-precision FLOP per cycle), so 8 cores at 3.2 GHz peak at $8 \times 3.2 \times 16 = 409.6$ GFLOP/s; two 64-bit DDR4-3200 channels give $2 \times 8 \times 3.2 = 51.2$ GB/s. The ridge point is at $409.6 / 51.2 = 8$ FLOP/byte. A kernel with an arithmetic intensity of 0.25 hits the slanted roof and is limited by memory bandwidth to $51.2 \times 0.25 = 12.8$ GFLOP/s; a kernel with an intensity of 16 hits the flat roof and runs at the peak 409.6 GFLOP/s. Measured (Stream) bandwidth is lower than the theoretical peak, which moves the ridge point to the right.

If the ridge point is far to the right, only kernels with a very high arithmetic intensity can reach the peak performance; if it is far to the left, almost any kernel can. Some kernels have an intensity independent of the problem size, $O(1)$ (sparse matrix–vector multiply, structured grids); others grow with it, $O(\log N)$ for FFTs (fast Fourier transforms) and $O(N)$ for dense matrix–matrix multiplication [[4]](#ref-4).

### Multicore Processors

A **multicore processor** has two or more independent cores on one die or package. Typically the L1 and L2 caches are private to each core and the L3 cache is shared. It is difficult to sustain Moore's law and at the same time meet the performance demands of applications, mainly because the clock frequency is hard to increase without raising power consumption. So the hardware is replicated and run at a lower clock: two cores at 1.5 GHz can match one core at 3 GHz, with lower power, but only for work that can be split between them: by Amdahl's law, the speedup from $N$ processors is $1/((1 - f) + f/N)$, where $f$ is the fraction of the execution time that can run in parallel [[3]](#ref-3). In a symmetric multicore all the cores are identical; in an asymmetric one they may have different functions.

> **Note.** *Moore's law*: in 1965 Gordon Moore observed that the number of transistors that could be put on a single chip was doubling every year. The pace slowed to a doubling every 18 months in the 1970s, and has kept that rate since [[3]](#ref-3).

Multiprocessors differ in how the processors share memory:

- **Tightly coupled multiprocessors:** the processors share memory and communicate through it. The memory access time is the same for all processors (**UMA**, uniform memory access). Multicores are of this type. They are difficult to extend to many processors, since the memory bandwidth requirement grows with the number of processors.
- **Loosely coupled multiprocessors:** memory is distributed among the processors, which communicate through an interconnection network. Memory bandwidth scales, but the access time depends on the location of the data (**NUMA**), and communication is more complex and has higher latency.

#### Cache Coherence

If the same block is in the caches of two processors and one processor updates it, the data in the other cache and in memory become inconsistent. Cache coherence protocols are of two types:

- **Snooping protocols:** every cache monitors a shared bus.
- **Directory-based protocols:** a directory records which caches hold each block, and messages are sent only to those caches. This scales to more processors than a bus.

A snooping protocol can handle writes in two ways:

- **Write invalidate:** before writing, a processor gets exclusive access to the block by invalidating all other copies. A later read by another processor misses and gets the new value. This is used in almost all multiprocessors.
- **Write update (write broadcast):** every write is broadcast and all copies are updated. This uses much more bus bandwidth, since repeated writes to a block are all sent on the bus.

#### The MSI Protocol

In the MSI write-invalidate protocol with write-back caches, each cache block is in one of three states:

- **Modified (M):** the block has been written; this cache has the only valid copy, and memory is out of date.
- **Shared (S):** the block is clean and may be in other caches.
- **Invalid (I):** the block holds no valid data.

Each cache controller acts on requests from its own processor (read and write hits and misses) and on requests it snoops from the bus (read misses, write misses and invalidates for the block from other processors).

<figure class="fig">
<svg viewBox="0 0 740 350" width="740" role="img" aria-label="MSI write-invalidate protocol: transitions caused by the processor in black and by bus requests in red">
  <defs><marker id="arr-msi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-msir" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <ellipse cx="110" cy="290" rx="58" ry="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="110.0" y="294.0" text-anchor="middle" font-size="13" fill="currentColor">Invalid</text>
  <ellipse cx="570" cy="290" rx="58" ry="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="570.0" y="294.0" text-anchor="middle" font-size="13" fill="currentColor">Shared</text>
  <ellipse cx="340" cy="70" rx="58" ry="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="340.0" y="74.0" text-anchor="middle" font-size="13" fill="currentColor">Modified</text>
  <path d="M172.0,299.0 Q340.0,326.0 506.0,299.0" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#arr-msi)"/>
  <text x="340.0" y="336.0" text-anchor="middle" font-size="10" fill="currentColor">CPU read miss</text>
  <path d="M508.0,281.0 Q340.0,254.0 174.0,281.0" stroke="#ef4444" stroke-width="1.6" fill="none" marker-end="url(#arr-msir)"/>
  <text x="340.0" y="246.0" text-anchor="middle" font-size="10" fill="#ef4444">bus: write miss or invalidate</text>
  <path d="M148.6,262.8 Q200.1,154.0 287.5,85.6" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#arr-msi)"/>
  <text x="170.0" y="160.0" text-anchor="end" font-size="10" fill="currentColor">CPU write miss</text>
  <path d="M301.4,97.2 Q249.9,206.0 162.5,274.4" stroke="#ef4444" stroke-width="1.6" fill="none" marker-end="url(#arr-msir)"/>
  <text x="292.0" y="190.0" text-anchor="middle" font-size="10" fill="#ef4444">bus: write miss</text>
  <text x="292.0" y="203.0" text-anchor="middle" font-size="10" fill="#ef4444">(write back)</text>
  <path d="M531.4,262.8 Q479.9,154.0 392.5,85.6" stroke="currentColor" stroke-width="1.6" fill="none" marker-end="url(#arr-msi)"/>
  <text x="510.0" y="160.0" text-anchor="start" font-size="10" fill="currentColor">CPU write hit</text>
  <text x="510.0" y="173.0" text-anchor="start" font-size="10" fill="currentColor">(invalidate)</text>
  <path d="M378.6,97.2 Q430.1,206.0 517.5,274.4" stroke="#ef4444" stroke-width="1.6" fill="none" marker-end="url(#arr-msir)"/>
  <text x="388.0" y="190.0" text-anchor="middle" font-size="10" fill="#ef4444">bus: read miss</text>
  <text x="388.0" y="203.0" text-anchor="middle" font-size="10" fill="#ef4444">(write back)</text>
  <path d="M370,48 C390,8 310,8 310,48" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-msi)"/>
  <text x="396.0" y="24.0" text-anchor="start" font-size="10" fill="currentColor">CPU read or write hit</text>
  <path d="M620,276 C670,256 670,324 620,304" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-msi)"/>
  <text x="666.0" y="294.0" text-anchor="start" font-size="10" fill="currentColor">CPU read hit</text>
</svg>
<figcaption>MSI protocol for one cache block. Plain arrows: transitions caused by the processor of this cache. Red arrows: transitions caused by bus requests from other processors.</figcaption>
</figure>

<figure class="table">
<figcaption>MSI transitions (Hennessy & Patterson).</figcaption>

| State | Event | Action | Next state |
|:--|:--|:--|:--|
| Invalid | CPU read | place read miss on bus | Shared |
| Invalid | CPU write | place write miss on bus | Modified |
| Shared | CPU read hit | — | Shared |
| Shared | CPU write hit | place invalidate on bus | Modified |
| Shared | bus write miss or invalidate | — | Invalid |
| Modified | CPU read or write hit | — | Modified |
| Modified | bus read miss | write back the block | Shared |
| Modified | bus write miss | write back the block | Invalid |

</figure>

A miss that replaces a block is handled the same way: a Modified block is written back first. When a Modified block is written back in response to a bus request, the memory access of the requesting processor is aborted and it gets the block from the write-back.

Two common extensions:

- **MESI** adds the **Exclusive (E)** state: the block is clean and in only this cache. A write to an Exclusive block needs no invalidate on the bus, which helps when a processor reads and then writes data no other processor uses.
- **MOESI** adds the **Owned (O)** state: the block is out of date in memory but may be shared; the owner supplies it on a miss and writes it back when it is replaced, so a read miss to a Modified block does not need a write to memory. AMD processors use MOESI.

#### Coherence Misses

Communication between processors also causes a fourth type of cache miss, the **coherence miss** (Hennessy & Patterson):

- **True sharing miss:** a processor reads a word that another processor wrote. The data is actually communicated. Such a miss would occur even with a block size of one word.
- **False sharing miss:** the block is invalidated because a word in it other than the one being read is written. The block is shared, but no word in it is actually shared, and the miss would not occur with a block size of one word.

<figure class="fig">
<svg viewBox="0 0 600 164" width="600" role="img" aria-label="False sharing: two cores use different words of the same cache block">
  <defs><marker id="arr-fs" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-fsr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="20" y="20" width="250" height="110" rx="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="145.0" y="40.0" text-anchor="middle" font-size="11" fill="currentColor">core P₁: private cache</text>
  <rect x="45" y="60" width="100" height="34" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="45" y="60" width="100" height="34" rx="0" fill="#ef4444" opacity=".25"/>
  <text x="95.0" y="81.2" text-anchor="middle" font-size="12" fill="currentColor">x1</text>
  <rect x="145" y="60" width="100" height="34" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="195.0" y="81.2" text-anchor="middle" font-size="12" fill="currentColor">x2</text>
  <text x="145.0" y="116.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">one cache block</text>
  <rect x="330" y="20" width="250" height="110" rx="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="455.0" y="40.0" text-anchor="middle" font-size="11" fill="currentColor">core P₂: private cache</text>
  <rect x="355" y="60" width="100" height="34" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="405.0" y="81.2" text-anchor="middle" font-size="12" fill="currentColor">x1</text>
  <rect x="455" y="60" width="100" height="34" rx="0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="455" y="60" width="100" height="34" rx="0" fill="#3b82f6" opacity=".25"/>
  <text x="505.0" y="81.2" text-anchor="middle" font-size="12" fill="currentColor">x2</text>
  <text x="455.0" y="116.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">one cache block</text>
  <text x="145.0" y="152.0" text-anchor="middle" font-size="11" fill="#ef4444">P₁ writes only x1</text>
  <text x="455.0" y="152.0" text-anchor="middle" font-size="11" fill="#3b82f6">P₂ reads only x2</text>
  <polyline points="270.0,77.0 300.0,77.0 330.0,77.0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#arr-fs)"/>
  <text x="300.0" y="70.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">invalidate</text>
</svg>
<figcaption>False sharing: P₁ writes x1 and P₂ reads x2, which are in the same block, so each write by P₁ invalidates the copy of P₂.</figcaption>
</figure>

<div class="example">

Words x1 and x2 are in the same block, which is in the shared state in the caches of P₁ and P₂. Classify each access as a true sharing miss, a false sharing miss or a hit (Hennessy & Patterson).

</div>

<figure class="table">
<figcaption>True and false sharing misses.</figcaption>

| Time | P₁ | P₂ | Miss | Reason |
|:-:|:--|:--|:--|:--|
| 1 | write x1 | | true sharing | x1 was read by P₂; its copy is invalidated |
| 2 | | read x2 | false sharing | block invalidated by the write of x1 |
| 3 | write x1 | | false sharing | block shared only because P₂ read x2 |
| 4 | | write x2 | false sharing | same as 3 |
| 5 | read x2 | | true sharing | x2 was written by P₂ |

</figure>

False sharing is avoided by placing data used by different processors in different blocks (padding and alignment).

#### Hazards Across Cores

The pipeline hazards are between instructions of one instruction stream, and the hardware detects them. Between processors, the ordering of accesses to shared data is the job of synchronization and of the memory consistency model.

Synchronization is built on a hardware primitive that **atomically reads and modifies** a memory location [[4]](#ref-4). With an atomic exchange, a lock is acquired by swapping 1 into it: the value returned is 0 if the lock was free and 1 if it was already held. MIPS32 uses a pair of instructions instead, `LL` and `SC`: `SC` succeeds only if the location has not changed since the `LL`. A **spin lock** tries repeatedly in a loop. If it spins by reading a cached copy, and tries the swap only when it sees the lock free, a waiting processor makes no memory accesses until the lock is released, because coherence invalidates its copy when the lock is written.

Coherence and consistency are complementary: coherence defines the behaviour of reads and writes to the **same** memory location, while consistency defines the behaviour of reads and writes with respect to accesses to **other** memory locations [[4]](#ref-4).

A program is *synchronized* if every write of a variable by one processor and every access of that variable by another processor are separated by a pair of synchronization operations (for example an unlock after the write and a lock before the access). Accesses that are not ordered this way are **data races**: the outcome depends on the relative speed of the processors [[4]](#ref-4).

**Sequential consistency** requires that the result of any execution be the same as if the memory accesses of each processor were kept in order and the accesses of different processors were arbitrarily interleaved. **Relaxed** consistency models let reads and writes complete out of order, and use synchronization operations to enforce ordering, so that a synchronized program behaves as if the processor were sequentially consistent. Relaxing W→R gives total store ordering (processor consistency), relaxing W→W gives partial store order, and relaxing R→W and R→R gives weak ordering and release consistency [[4]](#ref-4).

## References

1. <span id="ref-1"></span>Sengupta, Indranil, and Kamalika Datta. *Computer Architecture and Organization*. NPTEL course, IIT Kharagpur. [https://nptel.ac.in/courses/106105163](https://nptel.ac.in/courses/106105163).

2. <span id="ref-2"></span>Hamacher, Carl, Zvonko Vranesic, Safwat Zaky, and Naraig Manjikian. *Computer Organization and Embedded Systems*, 6th ed. McGraw-Hill, 2012.

3. <span id="ref-3"></span>Stallings, William. *Computer Organization and Architecture: Designing for Performance*, 10th ed. Pearson, 2016.

4. <span id="ref-4"></span>Hennessy, John L., and David A. Patterson. *Computer Architecture: A Quantitative Approach*, 5th ed. Morgan Kaufmann, 2012.
