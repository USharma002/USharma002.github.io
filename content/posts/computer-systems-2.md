---
author: ["Utkarsh Sharma"]
title: "Computer Systems II: Operating Systems"
date: "2026-11-03T11:00:00"
description: "Lecture notes on operating systems, following Silberschatz, Galvin and Gagne."
summary: "Part II of the Computer Systems series: operating systems (dual-mode operation, system calls, processes, the PCB, scheduling queues and schedulers, context switches, process creation and termination, threads, CPU scheduling algorithms, deadlocks with the Banker's algorithm and deadlock detection, process synchronization, the classic synchronization problems, memory management, paging and virtual memory, multi-level page tables, frame allocation and thrashing, memory-mapped files, kernel memory allocation (buddy system and slab allocation), disk structure, scheduling and management, directory structures, file allocation methods and free-space management)."
tags: ["Operating Systems"]
categories: ["Computer Systems"]
series: ["Computer Systems"]
ShowToc: true
TocOpen: false
math: true
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
  .post-content figure svg { max-width: 100%; height: auto; color: var(--primary); }
  .post-content figure svg .dim { opacity: .65; }
  .post-content .figrow { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; align-items: flex-start; }
  .post-content .code-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
  .post-content .code-pair .highlight, .post-content .code-pair pre { margin: 0 !important; }
  @media (max-width: 640px) { .post-content .code-pair { grid-template-columns: 1fr; } }
</style>

These notes follow *Operating System Concepts* by Silberschatz, Galvin and Gagne (9th edition) [[1]](#ref-1); figures marked "after Galvin" are redrawn from the book.

## Overview

### Operating-System Operations

Modern operating systems are *interrupt driven*: when there is nothing to do, the OS waits, and every event is signalled by an interrupt or a trap.

<div class="definition">

A *trap* (or *exception*) is a software-generated interrupt, caused either by an error (e.g. division by zero, invalid memory access) or by a specific request from a user program for an OS service.

</div>

#### Dual-Mode Operation

For proper execution, the OS must distinguish between OS code and user-defined code. Hardware therefore provides (at least) two separate modes of operation, selected by a **mode bit**:

$$\text{mode bit} = 0 \;\to\; \text{kernel mode}, \qquad \text{mode bit} = 1 \;\to\; \text{user mode}$$

Kernel mode is also called *supervisor*, *system* or *privileged* mode. When a user application requests a service from the OS (via a **system call**), the system must transition from user to kernel mode to fulfil the request.

<figure class="fig">
<svg viewBox="0 0 600 190" width="600" role="img" aria-label="Transition from user mode to kernel mode on a system call">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="15" width="450" height="65" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="15" width="450" height="65" rx="3" fill="currentColor" opacity=".07"/>
  <text x="30" y="32" text-anchor="start" font-size="11" fill="currentColor" class="dim">user process</text>
  <rect x="20" y="110" width="450" height="65" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30" y="127" text-anchor="start" font-size="11" fill="currentColor" class="dim">kernel</text>
  <line x1="10" y1="95" x2="590" y2="95" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="2"/>
  <rect x="35" y="42" width="130" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="61.0" text-anchor="middle" font-size="12" fill="currentColor">process executing</text>
  <rect x="195" y="42" width="110" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="61.0" text-anchor="middle" font-size="12" fill="currentColor">calls system call</text>
  <rect x="330" y="42" width="125" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="392.5" y="61.0" text-anchor="middle" font-size="12" fill="currentColor">return from call</text>
  <polyline points="165,56 195,56" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="195" y="137" width="130" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="156.0" text-anchor="middle" font-size="12" fill="currentColor">execute system call</text>
  <polyline points="250,70 250,137" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="244" y="90" text-anchor="end" font-size="11" fill="currentColor">trap: mode bit = 0</text>
  <polyline points="325,151 392,151 392,70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="398" y="90" text-anchor="start" font-size="11" fill="currentColor">return: mode bit = 1</text>
  <text x="480" y="52" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">user mode</text>
  <text x="480" y="67" text-anchor="start" font-size="11" fill="currentColor" class="dim">(mode bit = 1)</text>
  <text x="480" y="140" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">kernel mode</text>
  <text x="480" y="155" text-anchor="start" font-size="11" fill="currentColor" class="dim">(mode bit = 0)</text>
</svg>
<figcaption>Transition from user to kernel mode on a system call (after Galvin, Fig. 1.10).</figcaption>
</figure>

- At system boot time, the hardware starts in kernel mode. The OS is then loaded and starts user applications in user mode.
- Whenever a trap or interrupt occurs, the hardware switches from user mode to kernel mode. Hence, whenever the OS gains control of the computer, it is in kernel mode.
- The system always switches to user mode (sets the mode bit to 1) before passing control to a user program.

<div class="definition">

*Privileged instructions* are machine instructions that may cause harm; the hardware allows them to be executed only in kernel mode. If a user-mode program attempts one, the hardware does not execute it but treats it as illegal and traps it to the OS.

</div>

The instruction to switch to kernel mode is itself a privileged instruction. Other examples include I/O control, timer management and interrupt management.

> **Note.** Without hardware dual mode, a buggy user program can wipe out the OS. MS-DOS ran on the Intel 8088, which has no mode bit, so any program could overwrite the operating system. CPUs can also support more than two modes, e.g. a separate mode for a virtual machine manager, or the four *privilege levels* (rings) of Intel x86.

#### Timer

The OS must keep control over the CPU even if a user program gets stuck in an infinite loop, or never calls system services and so never returns control to the OS. A **timer** can be set to interrupt the computer after a specific period. The period can be fixed or variable; a variable timer is usually implemented with a fixed-rate clock and a counter:

- the OS sets the counter (a privileged instruction);
- every clock tick decrements it;
- when it reaches 0, an interrupt occurs and the OS regains control. It can then treat the program as having exceeded its time limit.

#### Ways into the Kernel

There are only three ways for the CPU to switch from user mode to kernel mode: an **interrupt**, a **trap** (system call), or an **exception** caused by the running instruction (a fault or an abort). In each case it jumps to a handler at a fixed address taken from the **interrupt vector table**, so a user program can choose *which* service it wants but never *what code* runs in kernel mode [[2]](#ref-2).

<figure class="table">
<figcaption>Classes of exceptional control flow <a href="#ref-3">[3]</a>.</figcaption>

| Class | Cause | Sync? | Returns to |
|:--|:--|:-:|:--|
| Interrupt | I/O device or timer, external to the program | async | next instruction |
| Trap | intentional request by the program (system call) | sync | next instruction |
| Fault | accidental error (divide by zero, page fault, illegal instruction) | sync | the same instruction if recovered, else the program is killed |
| Abort | unrecoverable hardware error (machine check, power failure) | sync | never |

</figure>

When one of these occurs, the hardware **atomically** switches to kernel mode and the kernel stack, saves the PC (the resume address) and processor state, and jumps to the handler. A *return-from-exception* instruction later restores the state and drops back to user mode; if the kernel changes the saved state before returning, the CPU resumes a different process, which is exactly how a context switch happens [[3]](#ref-3).

> **Note.** Since an interrupt can arrive between *any* two user-mode instructions, a program has no guarantee about the time between two of its own instructions. This is why the race conditions in the synchronization section can happen at all.

> **Note.** A recoverable fault is invisible to the program. For example, if a recursive program runs past the end of its stack, the fault handler can allocate more stack memory and restart the faulting instruction. The same mechanism lets a virtual machine run in user mode: each privileged action it attempts faults to the real OS, which emulates it (*trap-and-emulate*) [[2]](#ref-2).

#### System Calls

Control is switched back to the OS via an interrupt, a trap or a system call. A system call usually takes the form of a trap to a specific location in the interrupt vector (a generic `trap` instruction, or a dedicated one such as `syscall` on MIPS).

When a system call is executed, it is treated by the hardware as a **software interrupt**: control passes through the interrupt vector to a service routine in the OS, and the mode bit is set to kernel mode. The kernel checks which call was made and that its parameters are legal, executes the request, and returns control to the instruction after the call.

Some examples of system calls (UNIX):

- `fork()`: creates a new process. The *parent* process calls `fork()` and a *child* process is created.
- `exec()`: replaces the memory image of a process with a new program.
- `wait()`: makes the parent sleep until a child terminates.
- `exit()`: terminates the calling process.
- `sbrk()`: used by `malloc` to increase the size of the heap.

> **Note.** `malloc()` does **not** always result in a system call. It hands out memory from the heap the process already has, and only calls `sbrk()`/`brk()` (or `mmap()` for large blocks) when the heap has to grow.

## Process Management

### Processes

<div class="definition">

A *process* is a program in execution. Its current activity is represented by the value of the **program counter** and the contents of the processor's registers.

</div>

A program is a *passive* entity (an executable file on disk); a process is *active*. In memory, a process has the following sections:

<figure class="fig">
<svg viewBox="0 0 420 300" width="420" role="img" aria-label="Layout of a process in memory">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="120" y="20" width="150" height="260" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="120" y1="70" x2="270" y2="70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="120" y1="210" x2="270" y2="210" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="120" y1="245" x2="270" y2="245" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="195.0" y="50" text-anchor="middle" font-size="13" fill="currentColor">stack</text>
  <polyline points="195.0,72 195.0,105" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="195.0" y="200" text-anchor="middle" font-size="13" fill="currentColor">heap</text>
  <polyline points="195.0,186 195.0,152" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="195.0" y="233" text-anchor="middle" font-size="13" fill="currentColor">data</text>
  <text x="195.0" y="267" text-anchor="middle" font-size="13" fill="currentColor">text</text>
  <text x="110" y="26" text-anchor="end" font-size="11" fill="currentColor" class="dim">max</text>
  <text x="110" y="282" text-anchor="end" font-size="11" fill="currentColor" class="dim">0</text>
  <text x="282" y="45" text-anchor="start" font-size="11" fill="currentColor" class="dim">function parameters,</text>
  <text x="282" y="59" text-anchor="start" font-size="11" fill="currentColor" class="dim">return addresses, locals</text>
  <text x="282" y="195" text-anchor="start" font-size="11" fill="currentColor" class="dim">dynamically allocated</text>
  <text x="282" y="209" text-anchor="start" font-size="11" fill="currentColor" class="dim">memory (malloc)</text>
  <text x="282" y="232" text-anchor="start" font-size="11" fill="currentColor" class="dim">global variables</text>
  <text x="282" y="266" text-anchor="start" font-size="11" fill="currentColor" class="dim">program code</text>
  <text x="195.0" y="135" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">free</text>
</svg>
<figcaption>A process in memory (after Galvin, Fig. 3.1). The stack and heap grow towards each other.</figcaption>
</figure>

- **Text**: the program code.
- **Data**: global variables.
- **Heap**: memory dynamically allocated at run time.
- **Stack**: temporary data such as function parameters, return addresses and local variables.

#### Process States

As a process executes, it changes **state**. A process may be in one of the following states:

- **New**: the process is being created.
- **Running**: instructions are being executed.
- **Waiting**: the process is waiting for some event to occur (e.g. I/O completion or a signal).
- **Ready**: the process is waiting to be assigned to a CPU.
- **Terminated**: the process has finished execution.

<figure class="fig">
<svg viewBox="0 0 600 250" width="600" role="img" aria-label="Diagram of process states">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <ellipse cx="80" cy="50" rx="52" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="80" y="55" text-anchor="middle" font-size="13" fill="currentColor">new</text>
  <ellipse cx="190" cy="160" rx="52" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190" y="165" text-anchor="middle" font-size="13" fill="currentColor">ready</text>
  <ellipse cx="410" cy="160" rx="52" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="410" y="165" text-anchor="middle" font-size="13" fill="currentColor">running</text>
  <ellipse cx="300" cy="225" rx="52" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300" y="230" text-anchor="middle" font-size="13" fill="currentColor">waiting</text>
  <ellipse cx="520" cy="50" rx="62" ry="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520" y="55" text-anchor="middle" font-size="13" fill="currentColor">terminated</text>
  <polyline points="110,68 165,141" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="122" y="112" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">admitted</text>
  <path d="M240,150 Q300,118 358,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="300" y="122" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">scheduler dispatch</text>
  <path d="M358,170 Q300,196 242,170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="300" y="163" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">interrupt</text>
  <polyline points="440,140 490,70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="478" y="112" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">exit</text>
  <polyline points="430,180 348,220" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="420" y="216" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">I/O or event wait</text>
  <polyline points="252,220 175,182" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="180" y="216" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">I/O or event completion</text>
</svg>
<figcaption>Process states (after Galvin, Fig. 3.2). On a single CPU only one process can be running at a time; many can be ready or waiting.</figcaption>
</figure>

#### Process Control Block

Each process is represented in the OS by a **process control block (PCB)**, also called a *task control block*. It contains the pieces of information associated with the process:

<div class="figrow" style="align-items:center">

<figure class="fig" style="margin:0">
<svg viewBox="0 0 260 250" width="260" role="img" aria-label="Process control block">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="40" y="10" width="180" height="33" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="31.5" text-anchor="middle" font-size="12" fill="currentColor">process state</text>
  <rect x="40" y="43" width="180" height="33" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="64.5" text-anchor="middle" font-size="12" fill="currentColor">process number (pid)</text>
  <rect x="40" y="76" width="180" height="33" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="97.5" text-anchor="middle" font-size="12" fill="currentColor">program counter</text>
  <rect x="40" y="109" width="180" height="33" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="130.5" text-anchor="middle" font-size="12" fill="currentColor">CPU registers</text>
  <rect x="40" y="142" width="180" height="33" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="163.5" text-anchor="middle" font-size="12" fill="currentColor">memory limits</text>
  <rect x="40" y="175" width="180" height="33" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="196.5" text-anchor="middle" font-size="12" fill="currentColor">list of open files</text>
  <rect x="40" y="208" width="180" height="33" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="229.5" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
</svg>
<figcaption>The PCB (after Galvin, Fig. 3.3).</figcaption>
</figure>

<div style="flex:1 1 280px">

- **Process state**: new, ready, running, …
- **Program counter**: address of the next instruction.
- **CPU registers**: saved on an interrupt so the process can continue correctly afterwards.
- **CPU-scheduling information**: priority, pointers to scheduling queues.
- **Memory-management information**: base/limit registers, page or segment tables.
- **Accounting information**: CPU time used, process numbers.
- **I/O status information**: open files, allocated I/O devices.

</div>

</div>

In Linux the PCB is the C structure `task_struct`, and all active processes are kept in a doubly linked list of them.

#### Process Scheduling

- The objective of **multiprogramming** is to have some process running at all times, to maximize CPU utilization.
- The objective of **time sharing** is to switch the CPU among processes so frequently that users can interact with each program while it is running.
- To meet these objectives, the **process scheduler** selects an available process for execution on the CPU. On a single-processor system there is never more than one running process.

##### Scheduling Queues

- As processes enter the system, they are put into a **job queue**, which consists of all processes in the system.
- The processes that are residing in main memory and are ready and waiting to execute are kept on a list called the **ready queue**. It is generally stored as a linked list: a ready-queue header contains pointers to the first and final PCBs, and each PCB points to the next PCB in the ready queue.
- Suppose a process makes an I/O request to a shared device such as a disk. Since there are many processes, the disk may be busy with another process's request, so the process may have to wait. The list of processes waiting for a particular I/O device is called a **device queue**, and each device has its own device queue.

<figure class="fig">
<svg viewBox="0 0 680 400" width="680" role="img" aria-label="The ready queue and I/O device queues as linked lists of PCBs">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="158" y="14" text-anchor="middle" font-size="11" fill="currentColor" class="dim">queue header</text>
  <text x="108" y="55" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">ready queue</text>
  <rect x="120" y="30" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="45.0" text-anchor="middle" font-size="11" fill="currentColor">head</text>
  <rect x="120" y="50" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="65.0" text-anchor="middle" font-size="11" fill="currentColor">tail</text>
  <text x="342.0" y="28" text-anchor="middle" font-size="12" fill="currentColor">PCB₇</text>
  <rect x="300" y="34" width="84" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="52" width="84" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="342.0" y="67" text-anchor="middle" font-size="11" fill="currentColor">registers</text>
  <text x="342.0" y="87" text-anchor="middle" font-size="11" fill="currentColor">⋮</text>
  <text x="492.0" y="28" text-anchor="middle" font-size="12" fill="currentColor">PCB₂</text>
  <rect x="450" y="34" width="84" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="450" y="52" width="84" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="492.0" y="67" text-anchor="middle" font-size="11" fill="currentColor">registers</text>
  <text x="492.0" y="87" text-anchor="middle" font-size="11" fill="currentColor">⋮</text>
  <polyline points="196,40.0 278,40.0 278,43.0 300,43.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="384,43.0 450,43.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="534,43.0 546,43.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M546,36.0 v14 M550,38.5 v9 M554,41.0 v4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="196,60.0 266,60.0 266,106 436,106 436,72 450,72" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="108" y="147" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">mag tape unit 0</text>
  <rect x="120" y="122" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="137.0" text-anchor="middle" font-size="11" fill="currentColor">head</text>
  <rect x="120" y="142" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="157.0" text-anchor="middle" font-size="11" fill="currentColor">tail</text>
  <polyline points="196,132.0 208,132.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M208,125.0 v14 M212,127.5 v9 M216,130.0 v4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="196,152.0 208,152.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M208,145.0 v14 M212,147.5 v9 M216,150.0 v4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="108" y="215" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">disk unit 0</text>
  <rect x="120" y="190" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="205.0" text-anchor="middle" font-size="11" fill="currentColor">head</text>
  <rect x="120" y="210" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="225.0" text-anchor="middle" font-size="11" fill="currentColor">tail</text>
  <text x="342.0" y="188" text-anchor="middle" font-size="12" fill="currentColor">PCB₃</text>
  <rect x="300" y="194" width="84" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="212" width="84" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="342.0" y="247" text-anchor="middle" font-size="11" fill="currentColor">⋮</text>
  <text x="462.0" y="188" text-anchor="middle" font-size="12" fill="currentColor">PCB₁₄</text>
  <rect x="420" y="194" width="84" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="212" width="84" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="462.0" y="247" text-anchor="middle" font-size="11" fill="currentColor">⋮</text>
  <text x="582.0" y="188" text-anchor="middle" font-size="12" fill="currentColor">PCB₆</text>
  <rect x="540" y="194" width="84" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="540" y="212" width="84" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="582.0" y="247" text-anchor="middle" font-size="11" fill="currentColor">⋮</text>
  <polyline points="196,200.0 278,200.0 278,203.0 300,203.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="384,203.0 420,203.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="504,203.0 540,203.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="624,203.0 636,203.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M636,196.0 v14 M640,198.5 v9 M644,201.0 v4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="196,220.0 266,220.0 266,266 526,266 526,232 540,232" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="108" y="325" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">terminal unit 0</text>
  <rect x="120" y="300" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="315.0" text-anchor="middle" font-size="11" fill="currentColor">head</text>
  <rect x="120" y="320" width="76" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="158.0" y="335.0" text-anchor="middle" font-size="11" fill="currentColor">tail</text>
  <text x="342.0" y="298" text-anchor="middle" font-size="12" fill="currentColor">PCB₅</text>
  <rect x="300" y="304" width="84" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="322" width="84" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="342.0" y="357" text-anchor="middle" font-size="11" fill="currentColor">⋮</text>
  <polyline points="196,310.0 278,310.0 278,313.0 300,313.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="384,313.0 396,313.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M396,306.0 v14 M400,308.5 v9 M404,311.0 v4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="196,330.0 288,330.0 288,342 300,342" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
</svg>
<figcaption>The ready queue and I/O device queues are linked lists of PCBs (after Galvin, Fig. 3.5).</figcaption>
</figure>

A common representation of process scheduling is a **queueing diagram**: rectangles are queues, circles are the resources that serve them, and arrows show the flow of processes.

<figure class="fig">
<svg viewBox="0 0 620 300" width="620" role="img" aria-label="Queueing diagram of process scheduling">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="160" y="15" width="130" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="35.0" text-anchor="middle" font-size="13" fill="currentColor">ready queue</text>
  <circle cx="470" cy="30" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="470" y="35" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <polyline points="20,30 160,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="290,30 450,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="490,30 600,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <line x1="560" y1="30" x2="560" y2="260" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="60" y1="260" x2="60" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="60,120 60,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="560,80 520,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="380" y="64" width="140" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="450.0" y="85.0" text-anchor="middle" font-size="12" fill="currentColor">I/O request</text>
  <polyline points="380,80 350,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="230" y="64" width="120" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="290.0" y="85.0" text-anchor="middle" font-size="12" fill="currentColor">I/O queue</text>
  <polyline points="230,80 204,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="182" cy="80" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="182" y="85" text-anchor="middle" font-size="12" fill="currentColor">I/O</text>
  <polyline points="162,80 60,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="560,135 520,135" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="380" y="119" width="140" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="450.0" y="140.0" text-anchor="middle" font-size="12" fill="currentColor">time slice expired</text>
  <polyline points="380,135 60,135" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="560,190 520,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="380" y="174" width="140" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="450.0" y="195.0" text-anchor="middle" font-size="12" fill="currentColor">fork a child</text>
  <polyline points="380,190 354,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <ellipse cx="296" cy="190" rx="56" ry="19" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296" y="195" text-anchor="middle" font-size="11" fill="currentColor">child executes</text>
  <polyline points="240,190 60,190" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="560,245 520,245" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="380" y="229" width="140" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="450.0" y="250.0" text-anchor="middle" font-size="12" fill="currentColor">wait for an interrupt</text>
  <polyline points="380,245 354,245" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <ellipse cx="292" cy="245" rx="60" ry="19" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="292" y="250" text-anchor="middle" font-size="11" fill="currentColor">interrupt occurs</text>
  <polyline points="232,245 60,245" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>Queueing-diagram representation of process scheduling (after Galvin, Fig. 3.6).</figcaption>
</figure>

A new process is initially put in the ready queue. It waits there until it is selected for execution, or **dispatched**. Once the process is allocated the CPU and is executing, one of several events could occur:

- The process could issue an I/O request and then be placed in an I/O queue.
- The process could create a new child process and wait for the child's termination.
- The process could be removed forcibly from the CPU, as a result of an interrupt, and be put back in the ready queue.

In the first two cases, the process eventually switches from the waiting state to the ready state and is put back in the ready queue. A process continues this cycle until it terminates, at which time it is removed from all queues and has its PCB and resources deallocated.

##### Schedulers

A process migrates among the various scheduling queues throughout its lifetime; the OS selects processes from these queues with a **scheduler**.

**Long-term scheduler (job scheduler).** Selects processes from those spooled to mass storage (typically a disk) and loads them into memory for execution.

- It executes much less frequently, minutes may separate the creation of one process and the next.
- It controls the **degree of multiprogramming** (the number of processes in memory). If the degree of multiprogramming is stable, the average rate of process creation must equal the average departure rate, so the long-term scheduler may need to be invoked only when a process leaves the system.
- Because of the longer interval between executions, it can afford to take more time to decide which process should be selected.
- It should select a good **process mix** of I/O-bound and CPU-bound processes. If all processes are I/O bound, the ready queue will almost always be empty and the short-term scheduler will have little to do. If all are CPU bound, the I/O waiting queue will almost always be empty and devices will go unused.

<div class="definition">

An *I/O-bound* process spends more of its time doing I/O than computations; a *CPU-bound* process generates I/O requests infrequently and spends most of its time computing.

</div>

> **Note.** On some systems the long-term scheduler is absent or minimal: time-sharing systems such as UNIX and Windows simply put every new process in memory for the short-term scheduler.

**Short-term scheduler (CPU scheduler).** Selects from among the processes that are ready to execute and allocates the CPU to one of them. It executes very frequently (often at least once every 100 ms), so it must be fast.

<div class="example">

If it takes 10 ms to decide to run a process for 100 ms, then $\frac{10}{100 + 10} \approx 9\%$ of the CPU is wasted just on scheduling.

</div>

**Medium-term scheduler.** Some OSs, such as time-sharing systems, introduce an additional, intermediate level of scheduling. The key idea is that it can be advantageous to remove a process from memory (and from active contention for the CPU), and thus **reduce the degree of multiprogramming**. Later, the process can be reintroduced into memory and its execution continued where it left off. This scheme is called **swapping**.

<figure class="fig">
<svg viewBox="0 0 600 230" width="600" role="img" aria-label="Medium-term scheduling added to the queueing diagram">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="215" y="12" width="180" height="42" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="305.0" y="30.0" text-anchor="middle" font-size="12" fill="currentColor">partially executed</text>
  <text x="305.0" y="46.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">swapped-out processes</text>
  <rect x="220" y="105" width="120" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="280.0" y="125.0" text-anchor="middle" font-size="13" fill="currentColor">ready queue</text>
  <circle cx="460" cy="120" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="460" y="125" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <polyline points="30,120 220,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="340,120 440,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="480,120 560,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="568" y="124" text-anchor="start" font-size="12" fill="currentColor">end</text>
  <polyline points="515,120 515,33 397,33" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="521" y="78" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">swap out</text>
  <polyline points="215,33 170,33 170,120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="164" y="78" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">swap in</text>
  <polyline points="495,120 495,195 430,195" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="330" y="180" width="100" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="200.0" text-anchor="middle" font-size="12" fill="currentColor">I/O waiting</text>
  <text x="380" y="224" text-anchor="middle" font-size="10" fill="currentColor" class="dim">queues</text>
  <polyline points="330,195 300,195" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="280" cy="195" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="280" y="200" text-anchor="middle" font-size="13" fill="currentColor">I/O</text>
  <polyline points="260,195 120,195 120,120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="120" cy="120" r="2.6" fill="currentColor"/>
  <circle cx="170" cy="120" r="2.6" fill="currentColor"/>
</svg>
<figcaption>Adding medium-term scheduling to the queueing diagram (after Galvin, Fig. 3.7).</figcaption>
</figure>

Swapping may be needed to improve the process mix, or because a change in memory requirements has overcommitted the available memory.

##### Context Switch

Interrupts cause the OS to change a CPU from its current task to a kernel routine. When an interrupt occurs, the system needs to save the current **context** of the process running on the CPU so that it can restore that context when its processing is done, essentially suspending the process and then resuming it. The context is represented in the PCB of the process.

<div class="definition">

Switching the CPU to another process requires a **state save** of the current process and a **state restore** of a different process. This task is known as a *context switch*.

</div>

<figure class="fig">
<svg viewBox="0 0 620 380" width="620" role="img" aria-label="Context switch from process P0 to process P1 and back">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="70" y="6" width="480" height="24" fill="currentColor" opacity=".08"/>
  <text x="130" y="23" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">process P₀</text>
  <text x="310" y="23" text-anchor="middle" font-size="13" fill="currentColor" class="dim">operating system</text>
  <text x="490" y="23" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">process P₁</text>
  <line x1="130" y1="40" x2="130" y2="70" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="4"/>
  <path d="M124,62 L130,70 L136,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="118" y="58" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">executing</text>
  <line x1="130" y1="70" x2="130" y2="330" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M144,70 q6,0 6,8 V194.0 q0,6 6,6 q-6,0 -6,6 V322 q0,8 -6,8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="157.2" y="204.0" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">idle</text>
  <line x1="130" y1="330" x2="130" y2="365" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="4"/>
  <path d="M124,357 L130,365 L136,357" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="118" y="352" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">executing</text>
  <line x1="490" y1="60" x2="490" y2="175" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M504,60 q6,0 6,8 V111.5 q0,6 6,6 q-6,0 -6,6 V167 q0,8 -6,8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="517.2" y="121.5" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">idle</text>
  <line x1="490" y1="175" x2="490" y2="205" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="4"/>
  <path d="M484,197 L490,205 L496,197" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="502" y="195" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">executing</text>
  <line x1="490" y1="205" x2="490" y2="330" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M504,205 q6,0 6,8 V261.5 q0,6 6,6 q-6,0 -6,6 V322 q0,8 -6,8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="517.2" y="271.5" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">idle</text>
  <text x="310" y="47" text-anchor="middle" font-size="11" fill="currentColor" class="dim">interrupt or system call</text>
  <polyline points="132,53 310,53 310,71" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="240" y="73" width="140" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="90.0" text-anchor="middle" font-size="11" fill="currentColor">save state into PCB₀</text>
  <text x="310" y="119" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
  <rect x="240" y="131" width="140" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="148.0" text-anchor="middle" font-size="11" fill="currentColor">reload state from PCB₁</text>
  <polyline points="310,155 310,175 488,175" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="310" y="204" text-anchor="middle" font-size="11" fill="currentColor" class="dim">interrupt or system call</text>
  <polyline points="488,212 310,212 310,228" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="240" y="230" width="140" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="247.0" text-anchor="middle" font-size="11" fill="currentColor">save state into PCB₁</text>
  <text x="310" y="276" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
  <rect x="240" y="288" width="140" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="305.0" text-anchor="middle" font-size="11" fill="currentColor">reload state from PCB₀</text>
  <polyline points="310,312 310,332 132,332" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
</svg>
<figcaption>CPU switch from process to process (after Galvin, Fig. 3.4). Thick arrows show execution; the time spent in the OS boxes is the context-switch overhead. PCBs are kept in specially reserved memory, the *kernel space*.</figcaption>
</figure>

- Context-switch time is pure **overhead**, since the system does no useful work while switching. A typical switch takes a few microseconds (Galvin, 9th edition, says milliseconds).
- Context-switch times are highly dependent on hardware support. Some processors provide multiple register sets, so a context switch only changes a pointer to the current set.

#### Operations on Processes

##### Process Creation

During the course of execution, a process may create several new processes. The creating process is called a **parent** process, and the new processes are called the **children** of that process, forming a **tree** of processes. Most OSs identify processes by a unique **process identifier (pid)**.

When a process creates a new process, two possibilities exist for execution:

1. The parent continues to execute concurrently with its children.
2. The parent waits until some or all of its children have terminated.

There are also two address-space possibilities:

1. The child process is a duplicate of the parent process (same program and data).
2. The child process has a new program loaded into it.

In UNIX, a new process is created by the `fork()` system call. Both processes continue execution after the `fork()`, with one difference: `fork()` returns the **pid of the child** in the parent, and **0** in the child.

One of the two processes typically uses the `exec()` system call to replace the process's memory space with a new program. The parent can create more children, or, if it has nothing else to do while the child runs, call `wait()` to move itself off the ready queue until the child terminates.

<figure class="fig">
<svg viewBox="0 0 600 170" width="600" role="img" aria-label="Process creation using fork, exec and wait">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="40" y="64" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">parent</text>
  <ellipse cx="110" cy="60" rx="62" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="110" y="65" text-anchor="middle" font-size="12" fill="currentColor">pid = fork()</text>
  <ellipse cx="390" cy="60" rx="46" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="390" y="65" text-anchor="middle" font-size="12" fill="currentColor">wait()</text>
  <polyline points="172,60 344,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="258" y="52" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">parent (pid &gt; 0)</text>
  <polyline points="436,60 570,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="510" y="52" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">parent resumes</text>
  <path d="M120,80 Q140,135 206,135" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="118" y="150" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">child (pid = 0)</text>
  <ellipse cx="250" cy="135" rx="42" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250" y="140" text-anchor="middle" font-size="12" fill="currentColor">exec()</text>
  <polyline points="292,135 346,135" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <ellipse cx="390" cy="135" rx="42" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="390" y="140" text-anchor="middle" font-size="12" fill="currentColor">exit()</text>
  <polyline points="390,115 390,82" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
</svg>
<figcaption>Process creation using the <code>fork()</code> system call (after Galvin, Fig. 3.10).</figcaption>
</figure>

```c
pid_t pid = fork();
if (pid < 0) {                 /* error */
    fprintf(stderr, "fork failed");
} else if (pid == 0) {         /* child */
    execlp("/bin/ls", "ls", NULL);
} else {                       /* parent */
    wait(NULL);                /* wait for the child to complete */
    printf("child complete");
}
```

What `fork()` actually copies is the caller's memory (code, globals, heap and stack), its registers and its open files. Because the child has the same registers, it has the same program counter and stack pointer, so it too "returns" from `fork()`, just with the value 0 [[4]](#ref-4).

```c
printf("pid = %d\n", getpid());
i = fork();
printf("fork returned %d, getpid = %d, getppid = %d\n", i, getpid(), getppid());
```

```
pid = 914
fork returned 915, getpid = 914, getppid = 381     <- parent
fork returned 0,   getpid = 915, getppid = 914     <- child
```

- **Order is not guaranteed.** Either the parent or the child may run first after `fork()`; on another run the two last lines can appear the other way round.
- **Address spaces are separate.** If the child changes a variable, the parent's copy is unaffected.
- **Open files are shared.** Both processes point to the same open-file entry in the kernel, so they share the file offset: writes by one advance the offset for the other.
- **Copy-on-write.** Copying the whole address space would make `fork()` expensive, especially since the child usually calls `exec()` straight away. Modern Unix marks the pages read-only and shared, and copies a page only when one of the processes writes to it.
- `exec()` does not return on success (the old program is gone); it returns −1 only on error.

> **Note.** Buffered output is part of the address space, so it is copied too. If stdout is redirected to a file, `printf("Before forking\n")` may still be sitting in the stdio buffer at the time of `fork()`, and the line then appears **twice** in the file (once flushed by each process). On a terminal stdout is line-buffered, so it appears once [[4]](#ref-4).

##### Process Termination

A process terminates when it finishes executing its final statement and asks the OS to delete it with the `exit()` system call. At that point, the process may return a status value to its parent (collected via the `wait()` system call), and all its resources are deallocated by the OS.

A parent may terminate the execution of one of its children for a variety of reasons:

- The child has exceeded its usage of some of the resources it has been allocated.
- The task assigned to the child is no longer needed.
- The parent is exiting, and the OS does not allow a child to continue if its parent terminates.

In the last case, if a process terminates, all its children must also be terminated. This is referred to as **cascading termination**.

<div class="definition">

When a process terminates, its resources are deallocated, but its entry in the process table remains until the parent calls `wait()`, because it holds the exit status. A process that has terminated but whose parent has not yet called `wait()` is a *zombie* process.

</div>

All processes transition to this state when they terminate, but generally only briefly. Once the parent calls `wait()`, the pid of the zombie process and its entry in the process table are released.

<div class="definition">

If a parent terminates without invoking `wait()`, its children are left as *orphans*.

</div>

Linux and UNIX address this scenario by assigning the `init` process as the new parent of orphan processes. `init` periodically invokes `wait()`, thereby collecting the exit status of any orphan and releasing its pid and process-table entry.

For example, if a parent exits while its child is sleeping, the child's `getppid()` returns 1 (the pid of `init`) once it wakes up [[4]](#ref-4).

### Threads

<div class="definition">

A *thread* is a basic unit of CPU utilization. It comprises a thread ID, a program counter, a register set and a stack. Threads of the same process share its code, data and heap sections and its other OS resources such as open files, and hence also its memory-management information (e.g. the page-table base register).

</div>

<figure class="fig">
<svg viewBox="0 0 680 300" width="680" role="img" aria-label="Single-threaded and multithreaded processes">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="10" width="230" height="250" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="10" width="230" height="44" fill="currentColor" opacity=".08"/>
  <line x1="20" y1="54" x2="250" y2="54" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30.0" y="19" width="63.333333333333336" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="61.66666666666667" y="37.0" text-anchor="middle" font-size="12" fill="currentColor">code</text>
  <rect x="103.33333333333334" y="19" width="63.333333333333336" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="37.0" text-anchor="middle" font-size="12" fill="currentColor">data</text>
  <rect x="176.66666666666669" y="19" width="63.333333333333336" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="208.33333333333334" y="37.0" text-anchor="middle" font-size="12" fill="currentColor">files</text>
  <rect x="20" y="224" width="230" height="36" fill="currentColor" opacity=".08"/>
  <line x1="20" y1="224" x2="250" y2="224" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="247" text-anchor="middle" font-size="12" fill="currentColor">heap</text>
  <rect x="97.0" y="64" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">registers</text>
  <rect x="97.0" y="94" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="111.0" text-anchor="middle" font-size="11" fill="currentColor">stack</text>
  <polyline points="135.0,120 135.0,136" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <path d="M135.0,150 q9,9 0,18 q-9,9 0,18 q9,9 0,18 q-9,9 0,18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.8"/>
  <text x="135.0" y="282" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">single-threaded process</text>
  <polyline points="83.0,186 123.0,186" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="79.0" y="190" text-anchor="end" font-size="11" fill="currentColor">thread</text>
  <rect x="330" y="10" width="276" height="250" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="10" width="276" height="44" fill="currentColor" opacity=".08"/>
  <line x1="330" y1="54" x2="606" y2="54" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340.0" y="19" width="78.66666666666667" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="379.3333333333333" y="37.0" text-anchor="middle" font-size="12" fill="currentColor">code</text>
  <rect x="428.6666666666667" y="19" width="78.66666666666667" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="468.0" y="37.0" text-anchor="middle" font-size="12" fill="currentColor">data</text>
  <rect x="517.3333333333334" y="19" width="78.66666666666667" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="556.6666666666667" y="37.0" text-anchor="middle" font-size="12" fill="currentColor">files</text>
  <rect x="330" y="224" width="276" height="36" fill="currentColor" opacity=".08"/>
  <line x1="330" y1="224" x2="606" y2="224" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="468.0" y="247" text-anchor="middle" font-size="12" fill="currentColor">heap</text>
  <rect x="338.0" y="64" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="376.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">registers</text>
  <rect x="338.0" y="94" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="376.0" y="111.0" text-anchor="middle" font-size="11" fill="currentColor">stack</text>
  <polyline points="376.0,120 376.0,136" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <path d="M376.0,150 q9,9 0,18 q-9,9 0,18 q9,9 0,18 q-9,9 0,18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.8"/>
  <line x1="422.0" y1="54" x2="422.0" y2="224" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="430.0" y="64" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="468.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">registers</text>
  <rect x="430.0" y="94" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="468.0" y="111.0" text-anchor="middle" font-size="11" fill="currentColor">stack</text>
  <polyline points="468.0,120 468.0,136" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <path d="M468.0,150 q9,9 0,18 q-9,9 0,18 q9,9 0,18 q-9,9 0,18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.8"/>
  <line x1="514.0" y1="54" x2="514.0" y2="224" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="522.0" y="64" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">registers</text>
  <rect x="522.0" y="94" width="76" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="111.0" text-anchor="middle" font-size="11" fill="currentColor">stack</text>
  <polyline points="560.0,120 560.0,136" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <path d="M560.0,150 q9,9 0,18 q-9,9 0,18 q9,9 0,18 q-9,9 0,18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.8"/>
  <text x="468.0" y="282" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">multithreaded process</text>
  <polyline points="612.0,186 572.0,186" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="616.0" y="190" text-anchor="start" font-size="11" fill="currentColor">thread</text>
</svg>
<figcaption>Single-threaded and multithreaded processes (after Galvin, Fig. 4.1). Each thread (one column) has its own registers and stack; the shaded code, data, files and heap are shared by all threads.</figcaption>
</figure>

> **Note.** Context switch cost is an important difference between processes and threads. Switching between two processes changes the address space, so the TLB (the cache of page-table entries) must be invalidated, and it then fills up again slowly. Switching between two threads of the same process keeps the same address space, so the TLB and caches stay valid. Hence
>
> $$\text{cost of switching between threads} \ll \text{cost of switching between processes}$$

#### Thread Libraries

A *thread library* provides the programmer with an API for creating and managing threads (e.g. POSIX Pthreads, Windows threads, Java threads). There are two primary ways of implementing a thread library:

1. Provide a library entirely in **user space** with no kernel support.
2. Implement a **kernel-level** library supported directly by the OS.

#### Kernel Threads vs User-Level Threads

In systems that use **kernel-level threads**, the OS itself is aware of each individual thread.

- A context switch between kernel threads of the same process requires only the registers, PC and stack to be changed; the overall memory-management information does not need to be switched, since they share the same address space. So it is slightly faster than switching between two processes.
- However, kernel threads can still be expensive, because a system call is required to switch between them.

A **user-level thread** is a thread within a process which the OS does not know about.

- The cost of a context switch between user-level threads can be made even lower, since the OS itself is not involved: no extra system calls are required.
- A user-level thread is represented by a PC, registers, a stack and a small *thread control block (TCB)*.
- The downside: since the kernel sees only one thread, if one user thread makes a blocking system call, the whole process blocks, and the threads cannot run in parallel on a multicore machine.

#### Multithreading Models

User threads must ultimately be mapped to kernel threads:

<figure class="fig">
<svg viewBox="0 0 620 200" width="620" role="img" aria-label="Many-to-one, one-to-one and many-to-many threading models">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="8" y="34" text-anchor="start" font-size="10" fill="currentColor" class="dim">user</text>
  <text x="8" y="144" text-anchor="start" font-size="10" fill="currentColor" class="dim">kernel</text>
  <path d="M70,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M110,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M150,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M190,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M130.0,130 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="118.0" y="116" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="126" text-anchor="middle" font-size="9" fill="currentColor">K</text>
  <polyline points="70,56 130.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="110,56 130.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="150,56 130.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="190,56 130.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="190" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">many-to-one</text>
  <path d="M270,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M310,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M350,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M270.0,130 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="258.0" y="116" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="270.0" y="126" text-anchor="middle" font-size="9" fill="currentColor">K</text>
  <path d="M310.0,130 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="298.0" y="116" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="126" text-anchor="middle" font-size="9" fill="currentColor">K</text>
  <path d="M350.0,130 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="338.0" y="116" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350.0" y="126" text-anchor="middle" font-size="9" fill="currentColor">K</text>
  <polyline points="270,56 270.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="310,56 310.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="350,56 350.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="190" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">one-to-one</text>
  <path d="M450,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M490,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M530,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M570,20 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M470.0,130 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="458.0" y="116" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="470.0" y="126" text-anchor="middle" font-size="9" fill="currentColor">K</text>
  <path d="M510.0,130 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="498.0" y="116" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="510.0" y="126" text-anchor="middle" font-size="9" fill="currentColor">K</text>
  <path d="M550.0,130 q6,10 0,18 q-6,8 0,16" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="538.0" y="116" width="24" height="12" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550.0" y="126" text-anchor="middle" font-size="9" fill="currentColor">K</text>
  <polyline points="450,56 470.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="490,56 470.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="490,56 510.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="530,56 510.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="530,56 550.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="570,56 550.0,112" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="510.0" y="190" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">many-to-many</text>
</svg>
<figcaption>Multithreading models (after Galvin, Figs. 4.5–4.7).</figcaption>
</figure>

- **Many-to-one**: many user threads on one kernel thread. Thread management is done in user space and is efficient, but one blocking call blocks the whole process and there is no parallelism.
- **One-to-one**: each user thread is a kernel thread (Linux, Windows). More concurrency, but creating a user thread means creating a kernel thread.
- **Many-to-many**: many user threads multiplexed onto a smaller or equal number of kernel threads, combining the advantages of both.

### CPU Scheduling

CPU scheduling is the basis of multiprogrammed operating systems: by switching the CPU among processes, the OS can make the computer more productive.

#### CPU–I/O Burst Cycle

Process execution consists of a **cycle** of CPU execution and I/O wait, and processes alternate between these two states. Execution begins with a **CPU burst**, followed by an **I/O burst**, then another CPU burst, and so on. Eventually the final CPU burst ends with a system request to terminate execution.

<figure class="fig">
<svg viewBox="0 0 460 250" width="460" role="img" aria-label="Alternating sequence of CPU and I/O bursts">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="150" y="26" text-anchor="middle" font-size="12" fill="currentColor">load, add, store</text>
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="currentColor">read from file</text>
  <path d="M260,14 h6 V50 h-6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="276" y="37" text-anchor="start" font-size="12" fill="currentColor">CPU burst</text>
  <rect x="95" y="58" width="110" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="95" y="58" width="110" height="26" rx="3" fill="currentColor" opacity=".07"/>
  <text x="150.0" y="76.0" text-anchor="middle" font-size="12" fill="currentColor">wait for I/O</text>
  <path d="M260,58 h6 V84 h-6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="276" y="76" text-anchor="start" font-size="12" fill="currentColor" class="dim">I/O burst</text>
  <text x="150" y="106" text-anchor="middle" font-size="12" fill="currentColor">store, increment</text>
  <text x="150" y="122" text-anchor="middle" font-size="12" fill="currentColor">write to file</text>
  <path d="M260,94 h6 V130 h-6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="276" y="117" text-anchor="start" font-size="12" fill="currentColor">CPU burst</text>
  <rect x="95" y="138" width="110" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="95" y="138" width="110" height="26" rx="3" fill="currentColor" opacity=".07"/>
  <text x="150.0" y="156.0" text-anchor="middle" font-size="12" fill="currentColor">wait for I/O</text>
  <path d="M260,138 h6 V164 h-6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="276" y="156" text-anchor="start" font-size="12" fill="currentColor" class="dim">I/O burst</text>
  <text x="150" y="186" text-anchor="middle" font-size="12" fill="currentColor">load, add, store</text>
  <text x="150" y="202" text-anchor="middle" font-size="12" fill="currentColor">read from file</text>
  <path d="M260,174 h6 V210 h-6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="276" y="197" text-anchor="start" font-size="12" fill="currentColor">CPU burst</text>
  <rect x="95" y="218" width="110" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="95" y="218" width="110" height="26" rx="3" fill="currentColor" opacity=".07"/>
  <text x="150.0" y="236.0" text-anchor="middle" font-size="12" fill="currentColor">wait for I/O</text>
  <path d="M260,218 h6 V244 h-6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="276" y="236" text-anchor="start" font-size="12" fill="currentColor" class="dim">I/O burst</text>
</svg>
<figcaption>Alternating sequence of CPU and I/O bursts (after Galvin, Fig. 6.1).</figcaption>
</figure>

Measured CPU-burst durations have a large number of short bursts and a small number of long ones. An I/O-bound program typically has many short CPU bursts; a CPU-bound program might have a few long ones.

#### CPU Scheduler

Whenever the CPU becomes idle, the OS must select one of the processes in the ready queue to be executed. The selection is carried out by the **short-term scheduler** (CPU scheduler).

> **Note.** The ready queue is not necessarily a FIFO queue. It can be a priority queue, a tree, or simply an unordered linked list.

#### Preemptive Scheduling

CPU-scheduling decisions may take place under the following four circumstances:

1. When a process switches from the running state to the **waiting** state (e.g. as the result of an I/O request, or a `wait()` for a child).
2. When a process switches from the running state to the ready state (e.g. when an interrupt occurs).
3. When a process switches from the waiting state to the ready state (e.g. at completion of I/O).
4. When a process terminates.

For situations 1 and 4 there is no choice in terms of scheduling: a new process (if one exists in the ready queue) must be selected for execution. There is a choice, however, for situations 2 and 3.

<div class="definition">

When scheduling takes place only under circumstances 1 and 4, the scheme is *nonpreemptive* or *cooperative*: once the CPU has been allocated to a process, the process keeps it until it releases the CPU, either by terminating or by switching to the waiting state. Otherwise the scheme is *preemptive*: the running process can be interrupted and moved back to the ready state.

</div>

> **Note.** Cooperative scheduling does not require special hardware (e.g. a timer). That is why it was the only option on some older hardware platforms.

Unfortunately, preemptive scheduling has a cost when processes share data. Consider two processes that share data. While one is updating the data, it is preempted so that the second process can run. The second process then tries to read the data, which are in an inconsistent state: a *race condition*.

**How is a running process preempted?** The OS preemption code must run on the CPU, but the CPU is busy running the user process. The OS gets control back through the **hardware timer interrupt**.

#### Dispatcher

The **dispatcher** is the module that gives control of the CPU to the process selected by the short-term scheduler. This involves:

- switching context;
- switching to user mode;
- jumping to the proper location in the user program to restart that program.

The time it takes the dispatcher to stop one process and start another running is known as the **dispatch latency**. Since the dispatcher runs on every process switch, it should be as fast as possible.

#### Scheduling Criteria

Different CPU-scheduling algorithms have different properties, and the choice of an algorithm may favour one class of processes over another.

- **CPU utilization**: keep the CPU as busy as possible.
- **Throughput**: the number of processes completed per time unit.
- **Turnaround time**: how long it takes to execute a process, from the time of submission to the time of completion. It is the sum of the periods spent waiting to get into memory, waiting in the ready queue, executing on the CPU, and doing I/O.
- **Waiting time**: the sum of the periods spent waiting in the ready queue. The scheduling algorithm affects only this, not the time a process executes or does I/O.
- **Response time**: the time from the submission of a request until the **first response** is produced (not the time to output the whole response). In an interactive system a process can produce some output early and keep computing while earlier results are shown, so turnaround time is not the best measure.

$$\text{turnaround} = \text{completion} - \text{arrival}, \qquad \text{waiting} = \text{turnaround} - \text{burst}$$

> **Note.** It is desirable to **maximize** CPU utilization and throughput, and to **minimize** turnaround, waiting and response time. Turnaround time is generally limited by the speed of the output device. For interactive systems, a predictable response time may matter more than a fast one on average: a system with a reasonable and predictable response time can be more desirable than one that is faster on average but highly variable.

#### Scheduling Algorithms

The examples below use Galvin's process sets; all times are in milliseconds, and each Gantt chart was produced by simulating the algorithm.

##### First-Come, First-Served (FCFS)

**Idea:** maintain the ready queue as a FIFO queue. New processes are inserted at the back, and the next process is scheduled from the front. FCFS is nonpreemptive.

<div class="example">

Processes $P_1, P_2, P_3$ arrive at time 0 in that order, with bursts of 24, 3 and 3.

</div>

<figure class="fig">
<svg viewBox="0 0 600 62" width="600" role="img" aria-label="Gantt chart: fcfs1">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20.0" y="8" width="448.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="244.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <rect x="468.0" y="8" width="56.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="496.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <rect x="524.0" y="8" width="56.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="552.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <text x="20.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="468.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">24</text>
  <text x="524.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">27</text>
  <text x="580.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">30</text>
</svg>
<figcaption>Average waiting time $= (0 + 24 + 27)/3 = 17$.</figcaption>
</figure>

If they arrive in the order $P_2, P_3, P_1$ instead:

<figure class="fig">
<svg viewBox="0 0 600 62" width="600" role="img" aria-label="Gantt chart: fcfs2">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20.0" y="8" width="56.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="48.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <rect x="76.0" y="8" width="56.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="104.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <rect x="132.0" y="8" width="448.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="356.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <text x="20.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="76.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <text x="132.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <text x="580.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">30</text>
</svg>
<figcaption>Average waiting time $= (6 + 0 + 3)/3 = 3$.</figcaption>
</figure>

**Problems.**

- FCFS suffers from the **convoy effect**: all the other processes wait for one big process to get off the CPU, which results in lower CPU and device utilization.
- The average waiting time is often quite long, and varies a lot with the arrival order.

##### Shortest-Job-First (SJF)

This algorithm associates with each process the length of its **next CPU burst**. When the CPU is available, it is assigned to the process that has the smallest next CPU burst. If two processes have the same next burst, FCFS is used to break the tie.

<div class="example">

$P_1, \ldots, P_4$ arrive at time 0 with bursts 6, 8, 7 and 3.

</div>

<figure class="fig">
<svg viewBox="0 0 600 62" width="600" role="img" aria-label="Gantt chart: sjf">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20.0" y="8" width="70.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₄</text>
  <rect x="90.0" y="8" width="140.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="160.0" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <rect x="230.0" y="8" width="163.3" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="311.7" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <rect x="393.3" y="8" width="186.7" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="486.7" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <text x="20.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="90.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <text x="230.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">9</text>
  <text x="393.3" y="54" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <text x="580.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">24</text>
</svg>
<figcaption>Average waiting time $= (3 + 16 + 9 + 0)/4 = 7$, versus 10.25 with FCFS.</figcaption>
</figure>

> **Note.** SJF is **provably optimal**: it gives the minimum average waiting time for a given set of processes. Moving a short process before a long one decreases the short process's waiting time more than it increases the long one's.

SJF is frequently used in long-term scheduling (where the user can give a time limit for a job). **The real difficulty with SJF is knowing the length of the next CPU request**, so although it is optimal, it cannot be implemented exactly at the level of short-term scheduling. We may, however, be able to **predict** it, as an exponential average of the previous bursts:

$$\tau_{n+1} = \alpha\, t_n + (1 - \alpha)\, \tau_n, \qquad 0 \le \alpha \le 1$$

where $t_n$ is the actual length of the $n$th CPU burst and $\tau_{n+1}$ is the predicted value of the next one. The initial $\tau_0$ can be defined as a constant or as an overall system average.

- $\alpha = 0$: $\tau_{n+1} = \tau_n$, recent history has no effect.
- $\alpha = 1$: $\tau_{n+1} = t_n$, only the most recent burst matters.
- Expanding, $\tau_{n+1} = \alpha t_n + (1-\alpha)\alpha t_{n-1} + \cdots + (1-\alpha)^{n+1}\tau_0$. Each older term has less weight, hence *exponential* average.

<figure class="fig">
<svg viewBox="0 0 560 230" width="560" role="img" aria-label="Predicting the next CPU burst by exponential averaging">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="50" y1="190" x2="530" y2="190" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="50" y1="190" x2="50" y2="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="171.14285714285714" text-anchor="end" font-size="10" fill="currentColor">2</text>
  <line x1="50" y1="167.14285714285714" x2="530" y2="167.14285714285714" stroke="currentColor" opacity=".12"/>
  <text x="42" y="148.28571428571428" text-anchor="end" font-size="10" fill="currentColor">4</text>
  <line x1="50" y1="144.28571428571428" x2="530" y2="144.28571428571428" stroke="currentColor" opacity=".12"/>
  <text x="42" y="125.42857142857143" text-anchor="end" font-size="10" fill="currentColor">6</text>
  <line x1="50" y1="121.42857142857143" x2="530" y2="121.42857142857143" stroke="currentColor" opacity=".12"/>
  <text x="42" y="102.57142857142857" text-anchor="end" font-size="10" fill="currentColor">8</text>
  <line x1="50" y1="98.57142857142857" x2="530" y2="98.57142857142857" stroke="currentColor" opacity=".12"/>
  <text x="42" y="79.71428571428571" text-anchor="end" font-size="10" fill="currentColor">10</text>
  <line x1="50" y1="75.71428571428571" x2="530" y2="75.71428571428571" stroke="currentColor" opacity=".12"/>
  <text x="42" y="56.85714285714286" text-anchor="end" font-size="10" fill="currentColor">12</text>
  <line x1="50" y1="52.85714285714286" x2="530" y2="52.85714285714286" stroke="currentColor" opacity=".12"/>
  <polyline points="84.3,121.4 152.9,144.3 221.4,121.4 290.0,144.3 358.6,41.4 427.1,41.4 495.7,41.4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="2"/>
  <polyline points="50.0,75.7 118.6,98.6 187.1,121.4 255.7,121.4 324.3,132.9 392.9,87.1 461.4,64.3 530.0,52.9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>
  <circle cx="84.3" cy="121.4" r="3" fill="currentColor"/>
  <circle cx="152.9" cy="144.3" r="3" fill="currentColor"/>
  <circle cx="221.4" cy="121.4" r="3" fill="currentColor"/>
  <circle cx="290.0" cy="144.3" r="3" fill="currentColor"/>
  <circle cx="358.6" cy="41.4" r="3" fill="currentColor"/>
  <circle cx="427.1" cy="41.4" r="3" fill="currentColor"/>
  <circle cx="495.7" cy="41.4" r="3" fill="currentColor"/>
  <circle cx="50.0" cy="75.7" r="3" fill="none" stroke="currentColor"/>
  <circle cx="118.6" cy="98.6" r="3" fill="none" stroke="currentColor"/>
  <circle cx="187.1" cy="121.4" r="3" fill="none" stroke="currentColor"/>
  <circle cx="255.7" cy="121.4" r="3" fill="none" stroke="currentColor"/>
  <circle cx="324.3" cy="132.9" r="3" fill="none" stroke="currentColor"/>
  <circle cx="392.9" cy="87.1" r="3" fill="none" stroke="currentColor"/>
  <circle cx="461.4" cy="64.3" r="3" fill="none" stroke="currentColor"/>
  <circle cx="530.0" cy="52.9" r="3" fill="none" stroke="currentColor"/>
  <text x="520" y="155.71428571428572" text-anchor="end" font-size="11" fill="currentColor">CPU burst tᵢ (solid)</text>
  <text x="520" y="171.71428571428572" text-anchor="end" font-size="11" fill="currentColor" class="dim">guess τᵢ (dashed)</text>
  <text x="290.0" y="222" text-anchor="middle" font-size="11" fill="currentColor" class="dim">time →</text>
</svg>
<figcaption>Exponential averaging with $\alpha = \tfrac12$ and $\tau_0 = 10$ (after Galvin, Fig. 6.3): for bursts 6, 4, 6, 4, 13, 13, 13 the guesses are 10, 8, 6, 6, 5, 9, 11, 12.</figcaption>
</figure>

**Preemptive SJF.** SJF can be nonpreemptive or preemptive. The preemptive version, **shortest-remaining-time-first (SRTF)**, preempts the running process when a newly arrived process has a shorter burst than what is left of the current one.

<div class="example">

$P_1, P_2, P_3, P_4$ arrive at times 0, 1, 2, 3 with bursts 8, 4, 9, 5.

</div>

<figure class="fig">
<svg viewBox="0 0 600 62" width="600" role="img" aria-label="Gantt chart: srtf">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20.0" y="8" width="21.5" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.8" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <rect x="41.5" y="8" width="86.2" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="84.6" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <rect x="127.7" y="8" width="107.7" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="181.5" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₄</text>
  <rect x="235.4" y="8" width="150.8" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.8" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <rect x="386.2" y="8" width="193.8" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="483.1" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <text x="20.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="41.5" y="54" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <text x="127.7" y="54" text-anchor="middle" font-size="11" fill="currentColor">5</text>
  <text x="235.4" y="54" text-anchor="middle" font-size="11" fill="currentColor">10</text>
  <text x="386.2" y="54" text-anchor="middle" font-size="11" fill="currentColor">17</text>
  <text x="580.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">26</text>
</svg>
<figcaption>SRTF: $P_1$ is preempted at time 1 by $P_2$ (4 &lt; 7 remaining). Average waiting time $= (9 + 0 + 15 + 2)/4 = 6.5$; nonpreemptive SJF would give 7.75.</figcaption>
</figure>

**SJF suffers from starvation**: if processes with shorter bursts keep coming, the longer processes will never get the CPU.

##### Highest Response Ratio Next (HRRN)

A nonpreemptive fix for SJF's starvation. Whenever the CPU becomes free, compute for each waiting process

$$\text{response ratio} = \frac{\text{waiting time} + \text{burst time}}{\text{burst time}} = 1 + \frac{\text{waiting time}}{\text{burst time}}$$

and run the process with the **highest** ratio.

- Short jobs are favoured, since a small burst gives a large ratio.
- A long job's ratio keeps growing while it waits, so it is eventually chosen: **no starvation**. This is aging built into the formula.

<div class="example">

Processes $A, B, C, D, E$ arrive at times 0, 2, 4, 6, 8 with bursts 3, 6, 4, 5, 2.

</div>

- At 0 only $A$ is present, and at 3 only $B$, so they run first.
- At 9: $C = 1 + 5/4 = 2.25$, $D = 1 + 3/5 = 1.6$, $E = 1 + 1/2 = 1.5$, so $C$ runs.
- At 13: $D = 1 + 7/5 = 2.4$, $E = 1 + 5/2 = 3.5$, so $E$ runs, then $D$.

<figure class="fig">
<svg viewBox="0 0 600 62" width="600" role="img" aria-label="Gantt chart: HRRN">
  <defs><marker id="arr-hrrn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="8" width="84" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="62.0" y="28.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">A</text>
  <rect x="104" y="8" width="168" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="188.0" y="28.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">B</text>
  <rect x="272" y="8" width="112" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="328.0" y="28.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">C</text>
  <rect x="384" y="8" width="56" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="412.0" y="28.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">E</text>
  <rect x="440" y="8" width="140" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="510.0" y="28.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D</text>
  <text x="20.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="104.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <text x="272.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor">9</text>
  <text x="384.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor">13</text>
  <text x="440.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor">15</text>
  <text x="580.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor">20</text>
</svg>
<figcaption>HRRN schedule. Waiting times are 0, 1, 5, 9, 5, so the average waiting time is 4.</figcaption>
</figure>

##### Priority Scheduling

A priority is associated with each process, and the CPU is allocated to the process with the highest priority (equal priorities are scheduled FCFS). It can be preemptive or nonpreemptive. If

$$\text{priority} \propto \frac{1}{\text{(predicted) burst time}}$$

it is equivalent to SJF or SRTF (depending on whether it is preemptive).

<div class="example">

$P_1, \ldots, P_5$ arrive at time 0 with bursts 10, 1, 2, 1, 5 and priorities 3, 1, 4, 5, 2 (a smaller number means a higher priority).

</div>

<figure class="fig">
<svg viewBox="0 0 600 62" width="600" role="img" aria-label="Gantt chart: pri">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20.0" y="8" width="29.5" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34.7" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <rect x="49.5" y="8" width="147.4" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="123.2" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₅</text>
  <rect x="196.8" y="8" width="294.7" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="344.2" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <rect x="491.6" y="8" width="58.9" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="521.1" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <rect x="550.5" y="8" width="29.5" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="565.3" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₄</text>
  <text x="20.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="49.5" y="54" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <text x="196.8" y="54" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <text x="491.6" y="54" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <text x="550.5" y="54" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <text x="580.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">19</text>
</svg>
<figcaption>Nonpreemptive priority scheduling. Average waiting time $= (6 + 0 + 16 + 18 + 1)/5 = 8.2$.</figcaption>
</figure>

**Problem.** A major problem with priority scheduling algorithms is **starvation** (indefinite blocking): a steady stream of higher-priority processes can keep a low-priority process waiting forever.

**Solution: aging.** Aging gradually increases the priority of processes that wait in the system for a long time (e.g. raise it by 1 every 15 minutes), so every process eventually reaches a high enough priority to run.

##### Round Robin (RR)

RR is FCFS with preemption, designed for time sharing:

- Maintain the ready queue as a FIFO (**circular**) queue.
- After a small unit of time called a **time quantum** (typically 10–100 ms), the currently running process is preempted, and the process at the front of the ready queue is scheduled.
- The previously running process is inserted at the end of the ready queue.

If the burst is shorter than the quantum, the process releases the CPU voluntarily and the next process is scheduled immediately.

<div class="example">

$P_1, P_2, P_3$ with bursts 24, 3, 3 and a quantum of 4.

</div>

<figure class="fig">
<svg viewBox="0 0 600 62" width="600" role="img" aria-label="Gantt chart: rr">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20.0" y="8" width="74.7" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="57.3" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <rect x="94.7" y="8" width="56.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="122.7" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <rect x="150.7" y="8" width="56.0" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="178.7" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <rect x="206.7" y="8" width="373.3" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="393.3" y="28" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <text x="20.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="94.7" y="54" text-anchor="middle" font-size="11" fill="currentColor">4</text>
  <text x="150.7" y="54" text-anchor="middle" font-size="11" fill="currentColor">7</text>
  <text x="206.7" y="54" text-anchor="middle" font-size="11" fill="currentColor">10</text>
  <text x="580.0" y="54" text-anchor="middle" font-size="11" fill="currentColor">30</text>
</svg>
<figcaption>RR with $q = 4$. Average waiting time $= (6 + 4 + 7)/3 \approx 5.67$.</figcaption>
</figure>

> **Note.** The average waiting time under RR is often long. In RR no process is allocated the CPU for more than one time quantum in a row, unless it is the only runnable process. With $n$ processes and quantum $q$, no process waits more than $(n - 1)\,q$ before its next quantum.

- If $q$ is very large, RR becomes FCFS. If $q$ is very small, the system spends most of its time context switching; $q$ should be large compared with the context-switch time.
- A context switch does not take place if only one process is running.
- The average turnaround time does not necessarily improve as the time quantum increases. It improves when most processes finish their next CPU burst within a single quantum (rule of thumb: 80% of CPU bursts should be shorter than $q$). Turnaround grows for a smaller quantum, since more context switches are required.

##### Multilevel Queue Scheduling

**Without feedback.**

- Multiple queues represent different priorities (e.g. foreground/interactive and background/batch).
- Processes are permanently assigned to one queue, based on a property such as memory size, priority or type.
- Each queue has its own scheduling algorithm (e.g. RR for foreground, FCFS for background).
- A lower-priority queue's processes can only run if all higher-priority queues are empty (alternatively, the queues get time slices, e.g. 80% / 20%).

<figure class="fig">
<svg viewBox="0 0 520 260" width="520" role="img" aria-label="Multilevel queue scheduling">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20" y="14" text-anchor="start" font-size="11" fill="currentColor" class="dim">highest priority</text>
  <polyline points="60,39 100,39" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="100" y="24" width="300" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="44.0" text-anchor="middle" font-size="12" fill="currentColor">system processes</text>
  <polyline points="400,39 450,39" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="60,83 100,83" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="100" y="68" width="300" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="88.0" text-anchor="middle" font-size="12" fill="currentColor">interactive processes</text>
  <polyline points="400,83 450,83" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="60,127 100,127" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="100" y="112" width="300" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="132.0" text-anchor="middle" font-size="12" fill="currentColor">interactive editing processes</text>
  <polyline points="400,127 450,127" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="60,171 100,171" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="100" y="156" width="300" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="176.0" text-anchor="middle" font-size="12" fill="currentColor">batch processes</text>
  <polyline points="400,171 450,171" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="60,215 100,215" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="100" y="200" width="300" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="220.0" text-anchor="middle" font-size="12" fill="currentColor">student processes</text>
  <polyline points="400,215 450,215" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <line x1="450" y1="39" x2="450" y2="215" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="450,127 490,127" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="20" y="252" text-anchor="start" font-size="11" fill="currentColor" class="dim">lowest priority</text>
</svg>
<figcaption>Multilevel queue scheduling (after Galvin, Fig. 6.6).</figcaption>
</figure>

**Problem:** too many high-priority tasks means starvation will occur in the lower queues.

**With feedback (multilevel feedback queue).**

- Allows a process to move between queues.
- If a process uses too much CPU time, it will be moved to a lower-priority queue. This leaves I/O-bound and interactive processes, which have short bursts, in the higher-priority queues.
- If a process waits too long in a lower-priority queue, it may be moved to a higher-priority queue. This form of aging prevents starvation.

<figure class="fig">
<svg viewBox="0 0 520 200" width="520" role="img" aria-label="Multilevel feedback queues">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="120" y="20" width="220" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="230.0" y="42.0" text-anchor="middle" font-size="13" fill="currentColor">quantum = 8</text>
  <polyline points="60,37 120,37" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="340,37 400,37" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="406" y="41" text-anchor="start" font-size="12" fill="currentColor" class="dim">CPU</text>
  <polyline points="370,37 370,67 100,67 100,97 118,97" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="120" y="80" width="220" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="230.0" y="102.0" text-anchor="middle" font-size="13" fill="currentColor">quantum = 16</text>
  <polyline points="100,97 120,97" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="340,97 400,97" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="406" y="101" text-anchor="start" font-size="12" fill="currentColor" class="dim">CPU</text>
  <polyline points="370,97 370,127 100,127 100,157 118,157" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="120" y="140" width="220" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="230.0" y="162.0" text-anchor="middle" font-size="13" fill="currentColor">FCFS</text>
  <polyline points="100,157 120,157" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="340,157 400,157" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="406" y="161" text-anchor="start" font-size="12" fill="currentColor" class="dim">CPU</text>
  <text x="28" y="41" text-anchor="middle" font-size="11" fill="currentColor" class="dim">new</text>
  <text x="470" y="72" text-anchor="middle" font-size="10" fill="currentColor" font-style="italic" class="dim">demote</text>
  <text x="470" y="132" text-anchor="middle" font-size="10" fill="currentColor" font-style="italic" class="dim">demote</text>
</svg>
<figcaption>Multilevel feedback queues (after Galvin, Fig. 6.7): a new process gets an 8 ms quantum; if it does not finish, it gets 16 ms in the next queue, and after that it runs FCFS.</figcaption>
</figure>

A multilevel feedback queue scheduler is defined by the number of queues, the scheduling algorithm for each queue, and the rules for when to upgrade or demote a process and which queue a new process enters. It is the most general CPU-scheduling algorithm, but also the most complex to tune.

### Process Synchronization

A **cooperating process** is one that can affect or be affected by other processes executing in the system. Cooperating processes can either directly share a logical address space (both code and data), or be allowed to share data only through files or messages. The former case is achieved through the use of lightweight processes, i.e. **threads**.

#### Why Is Synchronization Needed?

Suppose $P_1$ and $P_2$ share a variable `counter = 5`; $P_1$ executes `counter++` and $P_2$ executes `counter--`. Neither statement is **atomic**: in machine language each one is three instructions (load into a register, modify the register, store it back).

<div class="code-pair">

```c
/* P1: counter++ */
R1 = counter;
R1 = R1 + 1;
counter = R1;
```

```c
/* P2: counter-- */
R2 = counter;
R2 = R2 - 1;
counter = R2;
```

</div>

A context switch can happen between any two instructions, so the six instructions can be interleaved in many orders:

<figure class="fig">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="Three interleavings of counter++ and counter-- starting from counter = 5">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="110" y="16" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">one after the other</text>
  <rect x="10" y="26" width="200" height="180" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="22" y="46" font-size="13" fill="#3b82f6">R1 ← counter</text>
  <text x="200" y="46" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 5</text>
  <text x="22" y="76" font-size="13" fill="#3b82f6">R1 ← R1 + 1</text>
  <text x="200" y="76" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 6</text>
  <text x="22" y="106" font-size="13" fill="#3b82f6">counter ← R1</text>
  <text x="200" y="106" text-anchor="end" font-size="11" fill="currentColor" class="dim">counter = 6</text>
  <line x1="4" y1="116" x2="216" y2="116" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <text x="22" y="136" font-size="13" fill="#22c55e">R2 ← counter</text>
  <text x="200" y="136" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 6</text>
  <text x="22" y="166" font-size="13" fill="#22c55e">R2 ← R2 − 1</text>
  <text x="200" y="166" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 5</text>
  <text x="22" y="196" font-size="13" fill="#22c55e">counter ← R2</text>
  <text x="200" y="196" text-anchor="end" font-size="11" fill="currentColor" class="dim">counter = 5</text>
  <text x="110" y="232" text-anchor="middle" font-size="14" fill="currentColor" font-weight="700">counter = 5</text>
  <text x="330" y="16" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₁ writes last</text>
  <rect x="230" y="26" width="200" height="180" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="242" y="46" font-size="13" fill="#3b82f6">R1 ← counter</text>
  <text x="420" y="46" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 5</text>
  <line x1="224" y1="56" x2="436" y2="56" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <text x="242" y="76" font-size="13" fill="#22c55e">R2 ← counter</text>
  <text x="420" y="76" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 5</text>
  <text x="242" y="106" font-size="13" fill="#22c55e">R2 ← R2 − 1</text>
  <text x="420" y="106" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 4</text>
  <text x="242" y="136" font-size="13" fill="#22c55e">counter ← R2</text>
  <text x="420" y="136" text-anchor="end" font-size="11" fill="currentColor" class="dim">counter = 4</text>
  <line x1="224" y1="146" x2="436" y2="146" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <text x="242" y="166" font-size="13" fill="#3b82f6">R1 ← R1 + 1</text>
  <text x="420" y="166" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 6</text>
  <text x="242" y="196" font-size="13" fill="#3b82f6">counter ← R1</text>
  <text x="420" y="196" text-anchor="end" font-size="11" fill="currentColor" class="dim">counter = 6</text>
  <text x="330" y="232" text-anchor="middle" font-size="14" fill="currentColor" font-weight="700">counter = 6</text>
  <text x="550" y="16" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₂ writes last</text>
  <rect x="450" y="26" width="200" height="180" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="462" y="46" font-size="13" fill="#3b82f6">R1 ← counter</text>
  <text x="640" y="46" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 5</text>
  <text x="462" y="76" font-size="13" fill="#3b82f6">R1 ← R1 + 1</text>
  <text x="640" y="76" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 6</text>
  <line x1="444" y1="86" x2="656" y2="86" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <text x="462" y="106" font-size="13" fill="#22c55e">R2 ← counter</text>
  <text x="640" y="106" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 5</text>
  <text x="462" y="136" font-size="13" fill="#22c55e">R2 ← R2 − 1</text>
  <text x="640" y="136" text-anchor="end" font-size="11" fill="currentColor" class="dim">= 4</text>
  <line x1="444" y1="146" x2="656" y2="146" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <text x="462" y="166" font-size="13" fill="#3b82f6">counter ← R1</text>
  <text x="640" y="166" text-anchor="end" font-size="11" fill="currentColor" class="dim">counter = 6</text>
  <line x1="444" y1="176" x2="656" y2="176" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <text x="462" y="196" font-size="13" fill="#22c55e">counter ← R2</text>
  <text x="640" y="196" text-anchor="end" font-size="11" fill="currentColor" class="dim">counter = 4</text>
  <text x="550" y="232" text-anchor="middle" font-size="14" fill="currentColor" font-weight="700">counter = 4</text>
  <line x1="140" y1="256" x2="170" y2="256" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <text x="176" y="260" text-anchor="start" font-size="11" fill="currentColor" class="dim">context switch</text>
  <text x="300" y="260" font-size="11" fill="#3b82f6">P₁: counter++</text>
  <text x="400" y="260" font-size="11" fill="#22c55e">P₂: counter−−</text>
</svg>
<figcaption>Three possible interleavings, simulated from counter = 5. Only the first gives the correct result 5; the other two lose one of the updates. So the value of counter can be 4, 5 or 6.</figcaption>
</figure>

#### Race Conditions

<div class="definition">

A *race condition* is a situation where several processes access and manipulate the same data concurrently, and the outcome of the execution depends on the particular order in which the accesses take place.

</div>

To prevent race conditions, the processes must be **synchronized** so that only one process at a time can manipulate the shared data.

> **Note.** Always use **instruction-level** interleaving to show a race condition, since high-level statements are not atomic and can be switched in the middle. For instance, with `int a[3] = {3, 4, 5}`, running `a[1] = a[0] + a[1]` in $P_1$ and `a[2] = a[1] + a[2]` in $P_2$ gives `{3, 7, 12}` or `{3, 7, 9}` depending on which runs first, but executing whole statements one after the other has no concurrent access, so it is not a valid example of a race condition. Two different execution sequences are needed to show that the answer depends on the order [[5]](#ref-5).

#### The Critical-Section Problem

<div class="definition">

A *critical section* (CS) is a segment of code in which a process accesses shared data. No more than one process should execute in its critical section at a time.

</div>

For example, with `int count;` shared, the statements `count++` in $P_1$, `count--` in $P_2$ and `cout << count` in $P_3$ are all critical sections, since `count` is shared.

A critical-section protocol consists of two parts, an **entry section** and an **exit section**. Between them is the critical section, which must run in a mutually exclusive way:

<figure class="fig">
<svg viewBox="0 0 360 190" width="360" role="img" aria-label="General structure of a process with a critical section">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="60" y="22" text-anchor="start" font-size="13" fill="currentColor">do {</text>
  <rect x="90" y="34" width="160" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170.0" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">entry section</text>
  <text x="170" y="84" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">critical section</text>
  <rect x="90" y="94" width="160" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170.0" y="112.0" text-anchor="middle" font-size="13" fill="currentColor">exit section</text>
  <text x="170" y="144" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">remainder section</text>
  <text x="60" y="176" text-anchor="start" font-size="13" fill="currentColor">} while (true);</text>
</svg>
<figcaption>General structure of a typical process (after Galvin, Fig. 5.1).</figcaption>
</figure>

##### Requirements of a Solution

A good solution to the critical-section problem must satisfy the following three requirements.

1. **Mutual exclusion.** If a process $P$ is executing in its critical section, no other process can be executing in its critical section.
   - The entry protocol should be able to block processes that wish to enter but should not.
   - When the process in its critical section exits, the entry protocol must know this and allow a waiting process to enter.
2. **Progress.** If no process is executing in its critical section and some processes want to enter theirs, then only the processes that are waiting to enter can take part in deciding which one goes next (no other process can influence this decision), and this decision cannot be postponed indefinitely (it is made in finite time). So one of the waiting processes can enter its critical section.
3. **Bounded waiting.** After a process has made a request to enter its critical section and before that request is granted, there exists a bound on the number of times that other processes are allowed to enter their critical sections.

Moreover, a solution cannot depend on the CPUs' relative speeds, timing, the scheduling policy or other external factors: we assume only that each process executes at a nonzero speed.

> **Note.** *Finite* is not the same as *bounded*. "Finite" means any value you can write down (a billion, a trillion, …); "bounded" means the value can be no larger than one particular number, the bound.

##### Progress vs Bounded Waiting

- **Progress does not imply bounded waiting.** Progress says a process can enter within a finite decision time. It does not say *which* process enters, so there is no guarantee for any particular waiting process: it could lose every time.
- **Bounded waiting does not imply progress.** Even with a bound, all processes may be locked up in the entry section (e.g. due to a deadlock), i.e. the decision time is infinite.

Hence progress and bounded waiting are independent of each other, and a solution needs both.

##### A Few Related Terms

- **Deadlock freedom**: if two or more processes are trying to enter their critical sections, one of them will eventually enter. This is progress without the "outsiders have no influence" condition. Since the entry section is able to select a process to enter, the decision is certainly finite.
- **Starvation freedom**: if a process is trying to enter its critical section, it will eventually enter.

**Q. Does starvation freedom imply deadlock freedom?** *Yes.* If every process can eventually enter its critical section (although the waiting time may vary), then the decision time of selecting a process is finite. Otherwise, all processes would wait in the entry section.

**Q. Does starvation freedom imply bounded waiting?** *No.* The waiting time may not be bounded, even though each process can eventually enter its critical section.

**Q. Does bounded waiting imply starvation freedom?** *No.* Bounded waiting does not say whether a process can actually enter; it only says there is a bound. E.g. all processes could be locked up in the entry section (a deadlock, i.e. a failure of progress).

**Q. Do bounded waiting and deadlock freedom together imply starvation freedom?** *Yes.* Deadlock freedom guarantees that some waiting process always gets in, and bounded waiting limits how many times a given process can be overtaken, so every waiting process eventually enters.

So we need **progress + bounded waiting**. Together they are in fact stronger than starvation freedom, since there is now a bound instead of some arbitrary finite amount.

#### Solutions for the Critical Section

##### Disabling Interrupts

<div class="code-pair">

```c
/* Process 1 */
while (1) {
    disable_interrupts();
    /* critical section */
    enable_interrupts();
    /* other code */
}
```

```c
/* Process 2 */
while (1) {
    disable_interrupts();
    /* critical section */
    enable_interrupts();
    /* other code */
}
```

</div>

- **Simple**: when interrupts are disabled, a context switch won't happen.
- **Requires privileges**: user processes generally cannot disable interrupts.
- **Not suited for multicore systems**: disabling interrupts on one core does not stop the other cores, and disabling them on all cores is slow (the message must be passed to every processor). It is the approach taken by some nonpreemptive kernels on a single processor.

##### Attempt 1: Strict Alternation

A single shared `turn` variable, `int turn = 1;`:

<div class="code-pair">

```c
/* Process 1 */
while (1) {
    while (turn == 2) ;   /* busy wait */
    /* critical section */
    turn = 2;
    /* other code */
}
```

```c
/* Process 2 */
while (1) {
    while (turn == 1) ;   /* busy wait */
    /* critical section */
    turn = 1;
    /* other code */
}
```

</div>

- Achieves **mutual exclusion**.
- **Busy waiting**: the waiting process keeps looping, a waste of power and time.
- **Strict alternation**: the order is always $P_1 \to P_2 \to P_1 \to P_2 \to \cdots$
- **No progress**: even when $P_2$ wants to enter its critical section, if $P_1$ has not started (or doesn't need to go into its critical section), $P_2$ cannot enter.
- **Bounded waiting is satisfied**: the bound is 1. A process will go into its critical section after the other process changes `turn`.

##### Attempt 2: Two "Inside" Flags

Two shared variables, `p1_inside = false, p2_inside = false;`:

<div class="code-pair">

```c
/* Process 1 */
while (1) {
    while (p2_inside == true) ;
    p1_inside = true;
    /* critical section */
    p1_inside = false;
    /* ... */
}
```

```c
/* Process 2 */
while (1) {
    while (p1_inside == true) ;
    p2_inside = true;
    /* critical section */
    p2_inside = false;
    /* ... */
}
```

</div>

- The processes no longer need to alternate.
- **Does not guarantee mutual exclusion**: both can pass their `while` test before either sets its flag (check, switch, check, both set), and then both are in the critical section.

##### Attempt 3: Announce Intent First

Swap the order: set your own flag *before* checking the other's. Globally defined `p1_wants_to_enter, p2_wants_to_enter`:

<div class="code-pair">

```c
/* Process 1 */
while (1) {
    p1_wants_to_enter = true;
    while (p2_wants_to_enter == true) ;
    /* critical section */
    p1_wants_to_enter = false;
    /* ... */
}
```

```c
/* Process 2 */
while (1) {
    p2_wants_to_enter = true;
    while (p1_wants_to_enter == true) ;
    /* critical section */
    p2_wants_to_enter = false;
    /* ... */
}
```

</div>

- Achieves **mutual exclusion**.
- **Does not achieve progress**: if both set their flag before either checks, each waits for the other forever (a deadlock). We can use a `turn` variable to break the deadlock.

##### Attempt 4: Peterson's Solution

Peterson's solution combines both ideas for two processes $P_i$ and $P_j$ ($j = 1 - i$), sharing `int turn;` and `boolean flag[2];`:

```c
do {
    flag[i] = true;                  /* I want to enter            */
    turn = j;                        /* you can enter next         */
    while (flag[j] && turn == j) ;   /* if you want to enter and   */
                                     /* it's your turn, I'll wait  */
    /* critical section */
    flag[i] = false;                 /* I don't want to enter anymore */
    /* remainder section */
} while (true);
```

If both processes try to enter at the same time, `turn` is set to both `i` and `j` at roughly the same time; only the last assignment lasts, and it decides who enters first.

- It **solves the critical-section problem for 2 processes**.
- **Mutual exclusion is achieved**: both could be in the critical section only if `flag[0] == flag[1] == true` and `turn` equalled both 0 and 1.
- **Progress is achieved**: a process won't have to wait for the other if the other doesn't want to enter. The deadlock of attempt 3 is broken through the `turn` variable: the process which assigns `turn` first will enter first.
- **Bounded waiting is achieved** with bound = 1: after one entry by $P_j$, $P_j$ sets `turn = i` on its next attempt, so the processes alternate when both want to enter.

> **Note.** Because modern processors and compilers may reorder loads and stores, Peterson's solution is not guaranteed to work on modern architectures without memory barriers. It is still the clearest description of what a correct solution has to do.

#### Synchronization Hardware

A solution to the critical-section problem can be built using **locks**:

```c
do {
    acquire lock
        /* critical section */
    release lock
        /* remainder section */
} while (true);
```

Many modern computer systems therefore provide special hardware instructions that allow us either to **test and modify** the content of a word, or to **swap** the contents of two words **atomically**, i.e. as one uninterruptible unit.

##### Test-and-Set

The `TestAndSet()` instruction can be defined as:

```c
boolean TestAndSet(boolean *target) {
    boolean rv = *target;
    *target = TRUE;
    return rv;
}
```

The important characteristic is that this instruction is executed **atomically**. Thus, if two `TestAndSet()` instructions are executed simultaneously (each on a different core), they will be executed sequentially in some arbitrary order.

If the machine supports `TestAndSet()`, we can implement mutual exclusion by declaring a boolean variable `lock`, initialized to `false`. The structure of $P_i$ is:

```c
do {
    while (TestAndSet(&lock))
        ;  /* do nothing: busy waiting */
    /* critical section */
    lock = FALSE;
    /* remainder section */
} while (true);
```

This type of lock is also called a **spinlock** (a mutex that spins).

> **Note.** `TestAndSet` satisfies **mutual exclusion** and **progress**, but **not bounded waiting**: when the lock is released, whichever spinning process happens to run `TestAndSet` first gets it, and an unlucky process can lose every time. (Galvin, Fig. 5.7, gives a longer version with a `waiting[]` array that does satisfy bounded waiting.)

The similar `compare_and_swap(&value, expected, new_value)` instruction sets `value` to `new_value` only if `value == expected`, and always returns the original value; `while (compare_and_swap(&lock, 0, 1) != 0) ;` gives the same spinlock.

#### Semaphores

Semaphores are the OS-level solution.

<div class="definition">

A *semaphore* $S$ is an integer variable that, apart from initialization, is accessed only through two standard atomic operations: `wait()` (originally `P()`) and `signal()` (originally `V()`).

</div>

All modifications to the integer value of the semaphore in `wait()` and `signal()` must be executed **indivisibly**: when one process modifies the semaphore value, no other process can simultaneously modify that same semaphore value.

The classical definitions busy-wait, so a semaphore defined this way is a **spinlock**:

<div class="code-pair">

```c
wait(S) {
    while (S <= 0)
        ;   /* busy waiting */
    S--;
}
```

```c
signal(S) {
    S++;
}
```

</div>

##### Counting and Binary Semaphores

- The value of a **counting semaphore** can range over an unrestricted domain ($-\infty$ to $+\infty$).
- The value of a **binary semaphore** can range only between 0 and 1. Binary semaphores behave like mutex locks and provide **mutual exclusion**.

We can use binary semaphores to deal with the critical-section problem for $n$ processes. The $n$ processes share a semaphore `mutex`, initialized to 1:

```c
do {
    wait(mutex);
        /* critical section */
    signal(mutex);
        /* remainder section */
} while (true);
```

**Counting semaphores** can be used to control access to a given resource consisting of a finite number of instances. The semaphore is initialized to the number of resources available. Each process that wishes to use a resource performs a `wait()` on the semaphore (decrementing the count), and performs a `signal()` when it releases the resource (incrementing the count). When the count becomes 0, all resources are being used; after that, processes that wish to use a resource will block until the count becomes greater than 0.

> **Note.** A counting semaphore with its value bounded by $S \le 1$ is equivalent to a binary semaphore.

##### Busy Waiting and Spinlocks

The main disadvantage of this definition is that it requires **busy waiting**. While a process is in its critical section, any other process that tries to enter must loop continuously in the entry code. This is clearly a problem in a real multiprogramming system, where a single CPU is shared among many processes: busy waiting wastes CPU cycles that some other process might be able to use productively.

> **Note.** Spinlocks do have an advantage: **no context switch** is required when a process must wait on a lock, and a context switch may take considerable time. Thus, when locks are expected to be held for short times, spinlocks are useful. They are often employed on **multiprocessor systems**, where one thread can "spin" on one processor while another thread performs its critical section on another processor.

##### Semaphores Without Busy Waiting

To overcome the need for busy waiting, we can modify the definitions of `wait()` and `signal()`. Rather than engaging in busy waiting, the process can **block** itself. The block operation places a process into a **waiting queue** associated with the semaphore, and the state of the process is switched to the waiting state. Control is then transferred to the CPU scheduler, which selects another process to execute.

A process that is blocked, waiting on a semaphore $S$, should be restarted when some other process executes a `signal()` operation. The process is restarted by a `wakeup()` operation, which changes the process from the waiting state to the ready state, and the process is placed in the ready queue. (The CPU may or may not be switched from the running process to the newly ready process, depending on the CPU-scheduling algorithm.)

So each semaphore has an integer value and a list of processes:

```c
typedef struct {
    int value;
    struct process *list;
} semaphore;
```

When a process must wait on a semaphore, it is added to the list of processes. A `signal()` operation removes one process from the list of waiting processes and awakens that process.

<div class="code-pair">

```c
wait(semaphore *S) {
    S->value--;
    if (S->value < 0) {
        add this process to S->list;
        block();    /* system call: suspends
                       the process that invokes it */
    }
}
```

```c
signal(semaphore *S) {
    S->value++;
    if (S->value <= 0) {
        remove a process P from S->list;
        wakeup(P);  /* system call: resumes
                       the blocked process P */
    }
}
```

</div>

<figure class="fig">
<svg viewBox="0 0 560 120" width="560" role="img" aria-label="A blocking semaphore: an integer value and a list of waiting processes">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="20" width="110" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="75.0" y="40.0" text-anchor="middle" font-size="13" fill="currentColor">value = −2</text>
  <rect x="20" y="50" width="110" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="75.0" y="70.0" text-anchor="middle" font-size="13" fill="currentColor">list</text>
  <text x="75" y="104" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">semaphore S</text>
  <rect x="200" y="40" width="90" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="62" width="90" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="245.0" y="80.0" text-anchor="middle" font-size="12" fill="currentColor">P₃</text>
  <rect x="340" y="40" width="90" height="22" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="62" width="90" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="80.0" text-anchor="middle" font-size="12" fill="currentColor">P₅</text>
  <polyline points="130,65 160,65 160,51 200,51" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="290,51 340,51" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="430,51 442,51" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M442,44 v14 M446,46.5 v9 M450,49 v4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="470" y="30" text-anchor="start" font-size="11" fill="currentColor" class="dim">2 processes blocked</text>
  <text x="470" y="46" text-anchor="start" font-size="11" fill="currentColor" class="dim">in wait(S)</text>
</svg>
<figcaption>With this implementation the value can become negative: its magnitude is the number of processes waiting on the semaphore.</figcaption>
</figure>

> **Note.** $S = n$: $n$ more processes can enter. $S = 0$: no process can enter (but none is waiting). $S = -n$: $n$ processes are waiting.

##### Deadlock and Starvation

The implementation of a semaphore with a waiting queue may result in a situation where two or more processes are waiting indefinitely for an event that can be caused only by one of the waiting processes (a deadlock). Let $S$ and $Q$ be two semaphores initialized to 1:

<div class="code-pair">

```c
/* P0 */
wait(S);
wait(Q);
  ...
signal(S);
signal(Q);
```

```c
/* P1 */
wait(Q);
wait(S);
  ...
signal(Q);
signal(S);
```

</div>

If $P_0$ executes `wait(S)` and then $P_1$ executes `wait(Q)`, then $P_0$ blocks in `wait(Q)` until $P_1$ signals $Q$, and $P_1$ blocks in `wait(S)` until $P_0$ signals $S$. Neither signal can ever happen, so $P_0$ and $P_1$ are deadlocked.

Another problem related to deadlocks is **indefinite blocking**, or **starvation**: a situation in which processes wait indefinitely within the semaphore. Indefinite blocking may occur if we add and remove processes from the list associated with a semaphore in LIFO (last-in, first-out) order.

A related problem is **livelock**. It is similar to a deadlock, except that the states of the processes involved keep **changing** with regard to one another, yet none of them makes progress. (Think of two people in a corridor who keep stepping aside the same way to let each other pass.) Livelock is a special case of resource starvation; starvation in general only says that some process is not progressing.

#### Priority Inversion

A scheduling challenge arises when a higher-priority process needs to read or modify kernel data that are currently being accessed by a lower-priority process, or a chain of lower-priority processes. Since kernel data are typically protected with a lock, the higher-priority process will have to wait for a lower-priority one to finish with the resource. The situation becomes more complicated if the lower-priority process is preempted in favour of another process with a higher priority.

<div class="example">

Three processes $L$, $M$ and $H$ have priorities $L < M < H$. Process $H$ requires resource $R$, which is currently being accessed by process $L$.

</div>

Ordinarily, process $H$ would wait for $L$ to finish using resource $R$. However, now suppose that process $M$ becomes runnable, thereby preempting process $L$. Indirectly, a process with a lower priority ($M$) has affected how long process $H$ must wait for $L$ to relinquish resource $R$.

<figure class="fig">
<svg viewBox="0 0 620 170" width="620" role="img" aria-label="Priority inversion: M delays H while L holds R">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="46" y="40" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">H</text>
  <line x1="60" y1="50" x2="580.0" y2="50" stroke="currentColor" opacity=".2"/>
  <text x="46" y="80" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">M</text>
  <line x1="60" y1="90" x2="580.0" y2="90" stroke="currentColor" opacity=".2"/>
  <text x="46" y="120" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">L</text>
  <line x1="60" y1="130" x2="580.0" y2="130" stroke="currentColor" opacity=".2"/>
  <rect x="60.0" y="108" width="86.7" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60.0" y="108" width="86.7" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <rect x="146.7" y="28" width="43.3" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="146.7" y="28" width="43.3" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <line x1="190.0" y1="39" x2="450.0" y2="39" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <rect x="190.0" y="108" width="43.3" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="190.0" y="108" width="43.3" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <rect x="233.3" y="68" width="173.3" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="233.3" y="68" width="173.3" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <rect x="406.7" y="108" width="43.3" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="406.7" y="108" width="43.3" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <rect x="450.0" y="28" width="86.7" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="450.0" y="28" width="86.7" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <line x1="103.3" y1="104" x2="103.3" y2="134" stroke="#ef4444" stroke-width="1.5"/>
  <text x="106.3" y="104" text-anchor="start" font-size="10" fill="currentColor" class="dim">lock R</text>
  <line x1="190.0" y1="24" x2="190.0" y2="54" stroke="#ef4444" stroke-width="1.5"/>
  <text x="193.0" y="24" text-anchor="start" font-size="10" fill="currentColor" class="dim">wants R: blocks</text>
  <line x1="233.3" y1="64" x2="233.3" y2="94" stroke="#ef4444" stroke-width="1.5"/>
  <text x="236.3" y="64" text-anchor="start" font-size="10" fill="currentColor" class="dim">M arrives</text>
  <line x1="450.0" y1="104" x2="450.0" y2="134" stroke="#ef4444" stroke-width="1.5"/>
  <text x="453.0" y="104" text-anchor="start" font-size="10" fill="currentColor" class="dim">unlock R</text>
  <text x="60.0" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="146.7" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">2</text>
  <text x="233.3" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">4</text>
  <text x="320.0" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">6</text>
  <text x="406.7" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">8</text>
  <text x="493.3" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">10</text>
  <text x="580.0" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">12</text>
</svg>
<figcaption>Priority inversion: $H$ blocks on $R$ at $t = 3$, then $M$ (which doesn't even need $R$) preempts $L$ and runs for 4 units, so $H$ waits until $t = 9$.</figcaption>
</figure>

This problem is known as **priority inversion**. It occurs only in systems with more than two priorities.

Typically, these systems solve the problem by implementing a **priority-inheritance protocol**: all processes that are accessing resources needed by a higher-priority process inherit the higher priority until they are finished with the resources in question. When they are finished, their priorities revert to their original values.

<figure class="fig">
<svg viewBox="0 0 620 170" width="620" role="img" aria-label="Priority inheritance: L runs at H's priority until it releases R">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="46" y="40" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">H</text>
  <line x1="60" y1="50" x2="580.0" y2="50" stroke="currentColor" opacity=".2"/>
  <text x="46" y="80" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">M</text>
  <line x1="60" y1="90" x2="580.0" y2="90" stroke="currentColor" opacity=".2"/>
  <text x="46" y="120" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">L</text>
  <line x1="60" y1="130" x2="580.0" y2="130" stroke="currentColor" opacity=".2"/>
  <rect x="60.0" y="108" width="86.7" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60.0" y="108" width="86.7" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <rect x="146.7" y="28" width="43.3" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="146.7" y="28" width="43.3" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <line x1="190.0" y1="39" x2="276.7" y2="39" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <rect x="190.0" y="108" width="86.7" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="2.2"/>
  <rect x="190.0" y="108" width="86.7" height="22" rx="2" fill="#ef4444" opacity=".25"/>
  <line x1="233.3" y1="79" x2="276.7" y2="79" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <rect x="276.7" y="28" width="86.7" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="276.7" y="28" width="86.7" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <rect x="363.3" y="68" width="173.3" height="22" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="363.3" y="68" width="173.3" height="22" rx="2" fill="currentColor" opacity=".14"/>
  <line x1="103.3" y1="104" x2="103.3" y2="134" stroke="#ef4444" stroke-width="1.5"/>
  <text x="106.3" y="104" text-anchor="start" font-size="10" fill="currentColor" class="dim">lock R</text>
  <line x1="190.0" y1="24" x2="190.0" y2="54" stroke="#ef4444" stroke-width="1.5"/>
  <text x="193.0" y="24" text-anchor="start" font-size="10" fill="currentColor" class="dim">wants R: blocks</text>
  <line x1="233.3" y1="64" x2="233.3" y2="94" stroke="#ef4444" stroke-width="1.5"/>
  <text x="236.3" y="64" text-anchor="start" font-size="10" fill="currentColor" class="dim">M arrives, waits</text>
  <line x1="276.7" y1="104" x2="276.7" y2="134" stroke="#ef4444" stroke-width="1.5"/>
  <text x="279.7" y="104" text-anchor="start" font-size="10" fill="currentColor" class="dim">unlock R</text>
  <text x="60.0" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="146.7" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">2</text>
  <text x="233.3" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">4</text>
  <text x="320.0" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">6</text>
  <text x="406.7" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">8</text>
  <text x="493.3" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">10</text>
  <text x="580.0" y="160" text-anchor="middle" font-size="10" fill="currentColor" class="dim">12</text>
</svg>
<figcaption>With priority inheritance, $L$ temporarily runs at $H$'s priority (highlighted), so $M$ cannot preempt it; $L$ releases $R$ at $t = 5$ and $H$ runs immediately.</figcaption>
</figure>

> **Note.** Priority inversion caused repeated system resets on NASA's Mars Pathfinder in 1997; it was fixed by enabling priority inheritance (see Galvin, sidebar *Priority Inversion and the Mars Pathfinder*, p. 218).

#### Classic Problems of Synchronization

##### Producer–Consumer Problem (Inconsistency of Data)

A **producer** process produces information that is consumed by a **consumer** process. To allow the producer and consumer to run concurrently, we must have a **buffer** of items that can be filled by the producer and emptied by the consumer. This buffer will reside in a region of memory that is shared by the producer and consumer. A producer can produce one item while the consumer is consuming another.

The producer and consumer must be synchronized, so that the consumer does not try to consume an item that has not yet been produced.

Two types of buffer can be used:

- The **unbounded buffer** places no practical limit on the size of the buffer. The consumer may have to wait for new items, but the producer can always produce new items.
- The **bounded buffer** assumes a fixed buffer size. In this case, the consumer must wait if the buffer is empty, and the producer must wait if the buffer is full.

The following variables reside in a region of memory shared by the producer and consumer processes:

```c
#define BUFFER_SIZE 10

typedef struct {
    ...
} item;

item buffer[BUFFER_SIZE];
int in = 0;    /* next free position  */
int out = 0;   /* first full position */
```

The shared buffer is implemented as a **circular array** with two logical pointers, `in` and `out`.

- The buffer is **empty** when `in == out`.
- The buffer is **full** when `((in + 1) % BUFFER_SIZE) == out`.

<figure class="fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Circular buffer with in and out pointers">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <path d="M160.0,55.0 A70,70 0 0 1 209.5,75.5 L189.7,95.3 A42,42 0 0 0 160.0,83.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="181.4" y="77.3" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <path d="M209.5,75.5 A70,70 0 0 1 230.0,125.0 L202.0,125.0 A42,42 0 0 0 189.7,95.3 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="211.7" y="107.6" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <path d="M230.0,125.0 A70,70 0 0 1 209.5,174.5 L189.7,154.7 A42,42 0 0 0 202.0,125.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M230.0,125.0 A70,70 0 0 1 209.5,174.5 L189.7,154.7 A42,42 0 0 0 202.0,125.0 z" fill="currentColor" opacity=".18"/>
  <text x="211.7" y="150.4" text-anchor="middle" font-size="10" fill="currentColor" class="dim">2</text>
  <path d="M209.5,174.5 A70,70 0 0 1 160.0,195.0 L160.0,167.0 A42,42 0 0 0 189.7,154.7 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M209.5,174.5 A70,70 0 0 1 160.0,195.0 L160.0,167.0 A42,42 0 0 0 189.7,154.7 z" fill="currentColor" opacity=".18"/>
  <text x="181.4" y="180.7" text-anchor="middle" font-size="10" fill="currentColor" class="dim">3</text>
  <path d="M160.0,195.0 A70,70 0 0 1 110.5,174.5 L130.3,154.7 A42,42 0 0 0 160.0,167.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M160.0,195.0 A70,70 0 0 1 110.5,174.5 L130.3,154.7 A42,42 0 0 0 160.0,167.0 z" fill="currentColor" opacity=".18"/>
  <text x="138.6" y="180.7" text-anchor="middle" font-size="10" fill="currentColor" class="dim">4</text>
  <path d="M110.5,174.5 A70,70 0 0 1 90.0,125.0 L118.0,125.0 A42,42 0 0 0 130.3,154.7 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="108.3" y="150.4" text-anchor="middle" font-size="10" fill="currentColor" class="dim">5</text>
  <path d="M90.0,125.0 A70,70 0 0 1 110.5,75.5 L130.3,95.3 A42,42 0 0 0 118.0,125.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="108.3" y="107.6" text-anchor="middle" font-size="10" fill="currentColor" class="dim">6</text>
  <path d="M110.5,75.5 A70,70 0 0 1 160.0,55.0 L160.0,83.0 A42,42 0 0 0 130.3,95.3 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="138.6" y="77.3" text-anchor="middle" font-size="10" fill="currentColor" class="dim">7</text>
  <polyline points="256.1,164.8 228.4,153.3" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="267.2" y="173.4" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">out</text>
  <polyline points="63.9,164.8 91.6,153.3" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="52.8" y="173.4" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">in</text>
  <text x="160" y="261" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">3 items: out → first full, in → next free</text>
  <path d="M470.0,55.0 A70,70 0 0 1 519.5,75.5 L499.7,95.3 A42,42 0 0 0 470.0,83.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M470.0,55.0 A70,70 0 0 1 519.5,75.5 L499.7,95.3 A42,42 0 0 0 470.0,83.0 z" fill="currentColor" opacity=".18"/>
  <text x="491.4" y="77.3" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <path d="M519.5,75.5 A70,70 0 0 1 540.0,125.0 L512.0,125.0 A42,42 0 0 0 499.7,95.3 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="521.7" y="107.6" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <path d="M540.0,125.0 A70,70 0 0 1 519.5,174.5 L499.7,154.7 A42,42 0 0 0 512.0,125.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M540.0,125.0 A70,70 0 0 1 519.5,174.5 L499.7,154.7 A42,42 0 0 0 512.0,125.0 z" fill="currentColor" opacity=".18"/>
  <text x="521.7" y="150.4" text-anchor="middle" font-size="10" fill="currentColor" class="dim">2</text>
  <path d="M519.5,174.5 A70,70 0 0 1 470.0,195.0 L470.0,167.0 A42,42 0 0 0 499.7,154.7 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M519.5,174.5 A70,70 0 0 1 470.0,195.0 L470.0,167.0 A42,42 0 0 0 499.7,154.7 z" fill="currentColor" opacity=".18"/>
  <text x="491.4" y="180.7" text-anchor="middle" font-size="10" fill="currentColor" class="dim">3</text>
  <path d="M470.0,195.0 A70,70 0 0 1 420.5,174.5 L440.3,154.7 A42,42 0 0 0 470.0,167.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M470.0,195.0 A70,70 0 0 1 420.5,174.5 L440.3,154.7 A42,42 0 0 0 470.0,167.0 z" fill="currentColor" opacity=".18"/>
  <text x="448.6" y="180.7" text-anchor="middle" font-size="10" fill="currentColor" class="dim">4</text>
  <path d="M420.5,174.5 A70,70 0 0 1 400.0,125.0 L428.0,125.0 A42,42 0 0 0 440.3,154.7 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M420.5,174.5 A70,70 0 0 1 400.0,125.0 L428.0,125.0 A42,42 0 0 0 440.3,154.7 z" fill="currentColor" opacity=".18"/>
  <text x="418.3" y="150.4" text-anchor="middle" font-size="10" fill="currentColor" class="dim">5</text>
  <path d="M400.0,125.0 A70,70 0 0 1 420.5,75.5 L440.3,95.3 A42,42 0 0 0 428.0,125.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M400.0,125.0 A70,70 0 0 1 420.5,75.5 L440.3,95.3 A42,42 0 0 0 428.0,125.0 z" fill="currentColor" opacity=".18"/>
  <text x="418.3" y="107.6" text-anchor="middle" font-size="10" fill="currentColor" class="dim">6</text>
  <path d="M420.5,75.5 A70,70 0 0 1 470.0,55.0 L470.0,83.0 A42,42 0 0 0 440.3,95.3 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M420.5,75.5 A70,70 0 0 1 470.0,55.0 L470.0,83.0 A42,42 0 0 0 440.3,95.3 z" fill="currentColor" opacity=".18"/>
  <text x="448.6" y="77.3" text-anchor="middle" font-size="10" fill="currentColor" class="dim">7</text>
  <polyline points="566.1,164.8 538.4,153.3" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="577.2" y="173.4" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">out</text>
  <polyline points="566.1,85.2 538.4,96.7" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="577.2" y="84.6" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">in</text>
  <text x="470" y="261" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">full: (in + 1) % 8 == out</text>
</svg>
<figcaption>The bounded buffer as a circular array of 8 slots. Shaded slots hold items. When the buffer is "full" one slot is still empty, otherwise full and empty would both look like <code>in == out</code>.</figcaption>
</figure>

The producer process has a local variable `next_produced` in which the new item to be produced is stored. The consumer process has a local variable `next_consumed` in which the item to be consumed is stored.

<div class="code-pair">

```c
/* Producer */
item next_produced;
while (true) {
    /* produce an item in next_produced */
    while (((in + 1) % BUFFER_SIZE) == out)
        ;  /* do nothing */
    buffer[in] = next_produced;
    in = (in + 1) % BUFFER_SIZE;
}
```

```c
/* Consumer */
item next_consumed;
while (true) {
    while (in == out)
        ;  /* do nothing */
    next_consumed = buffer[out];
    out = (out + 1) % BUFFER_SIZE;
    /* consume the item in next_consumed */
}
```

</div>

> **Note.** This allows at most `BUFFER_SIZE − 1` items in the buffer at the same time (only $n - 1$ positions can be used). To fix this, we can add a `counter` that counts the items.

<div class="code-pair">

```c
/* Producer */
while (true) {
    /* produce an item in next_produced */
    while (counter == BUFFER_SIZE)
        ;  /* do nothing */
    buffer[in] = next_produced;
    in = (in + 1) % BUFFER_SIZE;
    counter++;
}
```

```c
/* Consumer */
while (true) {
    while (counter == 0)
        ;  /* do nothing */
    next_consumed = buffer[out];
    out = (out + 1) % BUFFER_SIZE;
    counter--;
    /* consume the item in next_consumed */
}
```

</div>

Here `counter` and `buffer` are shared. Both routines may be correct separately, but they might not function correctly when executed concurrently, because of the race condition on the shared `counter` (exactly the `counter++` / `counter--` interleavings shown earlier).

##### Bounded Buffer with Semaphores

We can use semaphores for synchronization:

```c
semaphore mutex = 1;   /* binary semaphore for mutual exclusion   */
semaphore empty = n;   /* counting semaphore: number of empty slots */
semaphore full  = 0;   /* counting semaphore: number of full slots  */
```

<div class="code-pair">

```c
/* Producer */
do {
    /* produce next_p */
    wait(empty);   /* wait if full  */
    wait(mutex);
    /* add next_p to buffer */
    signal(mutex);
    signal(full);  /* one more item */
} while (true);
```

```c
/* Consumer */
do {
    wait(full);    /* wait if empty */
    wait(mutex);
    /* remove item to next_c */
    signal(mutex);
    signal(empty); /* one more slot */
    /* consume next_c */
} while (true);
```

</div>

Note the symmetry: we can read this as the producer producing full buffers for the consumer, or as the consumer producing empty buffers for the producer.

> **Note.** The order of the two `wait()`s matters. If the producer did `wait(mutex)` before `wait(empty)` on a full buffer, it would block while holding `mutex`, and the consumer could never get in to empty a slot: a deadlock.

##### The Readers–Writers Problem

A database is to be shared among several concurrent processes. Some of these processes may want only to read the database (**readers**), whereas others may want to update it, i.e. read and write (**writers**). If two readers access the shared data simultaneously, no adverse effects will result. However, if a writer and some other thread (either a reader or a writer) access the database simultaneously, chaos may ensue.

The readers–writers problem has several variations, all involving priorities.

- The simplest one, referred to as the **first readers–writers problem**, requires that no reader be kept waiting unless a writer has already obtained permission to use the shared object. In other words, no reader should wait for other readers to finish simply because a writer is waiting. (This variation's solution can suffer from **starvation of writers**.)
- The **second readers–writers problem** requires that, once a writer is ready, it performs its write as soon as possible: if a writer is waiting, no new readers may start reading. (Here readers may starve.)

For the first problem, the readers and writers share the following:

```c
semaphore rw_mutex = 1, mutex = 1;
int read_count = 0;
```

```c
/* Writer */
do {
    wait(rw_mutex);    /* mutually exclusive for writing */
    /* writing is performed */
    signal(rw_mutex);
} while (true);
```

```c
/* Reader */
do {
    wait(mutex);       /* mutual excl. to update read_count */
    read_count++;
    if (read_count == 1)
        wait(rw_mutex);  /* first reader in: make writers wait */
    signal(mutex);
    /* reading is performed */
    wait(mutex);       /* mutual excl. to update read_count */
    read_count--;
    if (read_count == 0)
        signal(rw_mutex);  /* last reader out: writer can write */
    signal(mutex);
} while (true);
```


`rw_mutex` works as a mutual-exclusion semaphore for the writers, and is also used by the first reader to enter and the last reader to leave; readers that come and go while other readers are reading don't touch it.

> **Note.** If a writer is in the critical section and $n$ readers are waiting, then one reader is queued on `rw_mutex`, and $n - 1$ readers are queued on `mutex`.

##### Printer Spooler Daemon (Loss of Data)

Consider a situation where there are multiple processes and only one printer for printing purposes, and the printer is a slower device as compared to the CPU and memory. So the **spooler** comes into the picture. The spooler is a program that maintains a directory containing the list of files that the printer has to print. The spooler hands over the files to the printer one by one.

Each process that wants to keep its file in the spooler directory needs to execute this program, where `IN` is shared between the processes and `SD` is the spooler directory:

```
LOAD   Ri, M[IN]          ; Ri = IN
STORE  SD[Ri], "filename" ; put the file name in slot Ri
INCR   Ri
STORE  M[IN], Ri          ; IN = Ri
```

<figure class="fig">
<svg viewBox="0 0 520 235" width="520" role="img" aria-label="Two processes reading the same IN index of the spooler directory">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="330" y="16" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">spooler directory</text>
  <rect x="270" y="26" width="120" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330.0" y="48.0" text-anchor="middle" font-size="12" fill="currentColor">abc.pdf</text>
  <text x="258" y="48" text-anchor="end" font-size="11" fill="currentColor" class="dim">4</text>
  <rect x="270" y="60" width="120" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330.0" y="82.0" text-anchor="middle" font-size="12" fill="currentColor">notes.txt</text>
  <text x="258" y="82" text-anchor="end" font-size="11" fill="currentColor" class="dim">5</text>
  <rect x="270" y="94" width="120" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330.0" y="116.0" text-anchor="middle" font-size="12" fill="currentColor">prog.c</text>
  <text x="258" y="116" text-anchor="end" font-size="11" fill="currentColor" class="dim">6</text>
  <rect x="270" y="128" width="120" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="258" y="150" text-anchor="end" font-size="11" fill="currentColor" class="dim">7</text>
  <rect x="270" y="162" width="120" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="258" y="184" text-anchor="end" font-size="11" fill="currentColor" class="dim">8</text>
  <text x="410" y="150" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">← IN = 7</text>
  <rect x="30" y="40" width="150" height="52" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="105.0" y="71.0" text-anchor="middle" font-size="12" fill="currentColor">P₁: Rᵢ ← IN = 7</text>
  <rect x="30" y="130" width="150" height="52" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="105.0" y="161.0" text-anchor="middle" font-size="12" fill="currentColor">P₂: Rⱼ ← IN = 7</text>
  <polyline points="180,66 225,66 225,135 268,135" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="180,158 268,158" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="330" y="220" text-anchor="middle" font-size="11" fill="currentColor" class="dim">both write slot 7: P₁'s file name is overwritten, and IN becomes 8</text>
</svg>
<figcaption>If $P_1$ is switched out after its <code>LOAD</code>, $P_2$ reads the same <code>IN</code>; both store into slot 7 and one file name is lost.</figcaption>
</figure>

Similar to the producer–consumer problem, we can use semaphores to prevent this data loss or inconsistency.

##### The Dining-Philosophers Problem

<figure class="fig">
<svg viewBox="0 0 340 320" width="340" role="img" aria-label="Five philosophers around a table with five forks">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <circle cx="170" cy="160" r="96" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="170" cy="160" r="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170" y="164" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">rice</text>
  <circle cx="170.0" cy="30.0" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170.0" y="35.0" text-anchor="middle" font-size="12" fill="currentColor">P₀</text>
  <circle cx="170.0" cy="90.0" r="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="199.4" y1="119.5" x2="219.4" y2="92.0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="3"/>
  <text x="191.2" y="134.9" text-anchor="middle" font-size="9" fill="currentColor" class="dim">F₀</text>
  <circle cx="293.6" cy="119.8" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="293.6" y="124.8" text-anchor="middle" font-size="12" fill="currentColor">P₁</text>
  <circle cx="236.6" cy="138.4" r="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="217.6" y1="175.5" x2="249.9" y2="186.0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="3"/>
  <text x="204.2" y="175.1" text-anchor="middle" font-size="9" fill="currentColor" class="dim">F₁</text>
  <circle cx="246.4" cy="265.2" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="246.4" y="270.2" text-anchor="middle" font-size="12" fill="currentColor">P₂</text>
  <circle cx="211.1" cy="216.6" r="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="170.0" y1="210.0" x2="170.0" y2="244.0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="3"/>
  <text x="170.0" y="200.0" text-anchor="middle" font-size="9" fill="currentColor" class="dim">F₂</text>
  <circle cx="93.6" cy="265.2" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="93.6" y="270.2" text-anchor="middle" font-size="12" fill="currentColor">P₃</text>
  <circle cx="128.9" cy="216.6" r="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="122.4" y1="175.5" x2="90.1" y2="186.0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="3"/>
  <text x="135.8" y="175.1" text-anchor="middle" font-size="9" fill="currentColor" class="dim">F₃</text>
  <circle cx="46.4" cy="119.8" r="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="46.4" y="124.8" text-anchor="middle" font-size="12" fill="currentColor">P₄</text>
  <circle cx="103.4" cy="138.4" r="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="140.6" y1="119.5" x2="120.6" y2="92.0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="3"/>
  <text x="148.8" y="134.9" text-anchor="middle" font-size="9" fill="currentColor" class="dim">F₄</text>
</svg>
<figcaption>The dining philosophers (after Galvin, Fig. 5.13): philosopher $P_i$ needs fork $F_i$ on one side and $F_{(i+4)\%5}$ on the other.</figcaption>
</figure>

- Philosophers either think or eat.
- To eat, a philosopher needs to hold both forks (the one on their left and the one on their right).
- If a philosopher is not eating, they are thinking.
- **Problem:** develop an algorithm where no philosopher starves.

It is a simple representation of the need to allocate several resources among several processes in a deadlock-free and starvation-free manner.

**First try.**

```c
#define N 5

void philosopher(int i) {
    while (true) {
        think();          /* for some time */
        take_fork(Ri);    /* take fork on the right */
        take_fork(Li);    /* take fork on the left  */
        eat();
        put_fork(Li);
        put_fork(Ri);
    }
}
```

This **could deadlock** when all philosophers take the fork on their right at the same time: there will be a **circular wait**, each philosopher holding one fork and waiting for the next.

**Second try.**

```c
#define N 5

void philosopher(int i) {
    while (true) {
        think();
        take_fork(Ri);
        if (available(Li)) {
            take_fork(Li);
            eat();
            put_fork(Ri);
            put_fork(Li);
        } else {
            put_fork(Ri);
            sleep(T);
        }
    }
}
```

If all philosophers take $R_i$, check for $L_i$ and put $R_i$ back continuously, they never eat even though nobody is blocked: a **livelock** (starvation). Even if $T$ is random for each philosopher, the possibility is still there.

**Solution using a mutex.**

```c
#define N 5

void philosopher(int i) {
    while (true) {
        think();
        lock(mutex);
        take_fork(Ri);
        take_fork(Li);
        eat();
        put_fork(Ri);
        put_fork(Li);
        unlock(mutex);
    }
}
```

- It protects the critical section with a mutex, and **prevents deadlock**.
- But it **has performance issues**: only one philosopher can eat at a time, although two non-neighbours could eat together.

**Solution with semaphores.** Use $N$ semaphores `s[0], …, s[N−1]`, all initialized to 0, and a `mutex`. Each philosopher has 3 states: `HUNGRY`, `EATING` and `THINKING`. A philosopher can only move to the `EATING` state if neither neighbour is eating (`LEFT = (i + N − 1) % N`, `RIGHT = (i + 1) % N`).

```c
void philosopher(int i) {
    while (true) {
        think();
        take_forks(i);
        eat();
        put_forks(i);
    }
}

void take_forks(int i) {
    lock(mutex);
    state[i] = HUNGRY;
    test(i);          /* try to get both forks */
    unlock(mutex);
    wait(s[i]);       /* block if forks were not acquired */
}
```

```c
void put_forks(int i) {
    lock(mutex);
    state[i] = THINKING;
    test(LEFT);       /* can the left neighbour eat now?  */
    test(RIGHT);      /* can the right neighbour eat now? */
    unlock(mutex);
}

void test(int i) {
    if (state[i] == HUNGRY &&
        state[LEFT] != EATING &&
        state[RIGHT] != EATING) {
        state[i] = EATING;
        signal(s[i]);
    }
}
```


This is deadlock-free and allows the maximum parallelism (two philosophers can eat at once). A philosopher who finishes eating checks whether a neighbour was waiting for the forks, and wakes them up.

> **Note.** Galvin's simple semaphore solution (one semaphore `chopstick[i]` per fork) deadlocks in the same way as the first try. Possible remedies are: allow at most four philosophers at the table; allow a philosopher to pick up forks only if both are available (picking them up in a critical section, as in the solution above); or use an asymmetric solution where odd philosophers pick up the left fork first and even ones the right. A deadlock-free solution does not necessarily eliminate starvation.

### Deadlocks

In a multiprogramming environment, several processes may compete for a finite number of resources. A process requests resources; if the resources are not available at that time, the process enters a waiting state. Sometimes a waiting process is never again able to change state, because the resources it has requested are held by other waiting processes. This situation is called a **deadlock**.

#### System Model

A system consists of a finite number of resources to be distributed among a number of competing processes. Resources are partitioned into **types**, each with some number of identical **instances**: if a system has two CPUs, the resource type *CPU* has 2 instances; similarly, the resource type *printer* may have 5 instances.

A process uses a resource in the following sequence:

1. **Request**: if the request cannot be granted immediately (e.g. the resource is being used by another process), the requesting process must wait until it can acquire the resource.
2. **Use**: the process operates on the resource.
3. **Release**: the process releases the resource.

> **Note.** The request and release of resources are system calls (e.g. `request()`/`release()` of a device, `open()`/`close()` of a file, `wait()`/`signal()` on a semaphore). Multithreaded programs are good candidates for deadlock because multiple threads can compete for shared resources.

<div class="definition">

A set of processes is in a *deadlocked state* when every process in the set is waiting for an event that can be caused only by another process in the set.

</div>

#### Deadlock Characterization

A deadlock can arise only if the following four conditions hold **simultaneously** in a system.

1. **Mutual exclusion**: at least one resource must be held in a non-sharable mode, i.e. only one process at a time can use it.
2. **Hold and wait**: a process must be holding at least one resource and waiting to acquire additional resources that are currently held by other processes.
3. **No preemption**: resources cannot be preempted; a resource can be released only voluntarily by the process holding it, after that process has completed its task.
4. **Circular wait**: a set $\{P_0, P_1, \ldots, P_n\}$ of waiting processes must exist such that $P_0$ is waiting for a resource held by $P_1$, $P_1$ is waiting for a resource held by $P_2$, …, and $P_n$ is waiting for a resource held by $P_0$.

> **Note.** The four conditions are not completely independent: circular wait implies hold and wait. Separating them is still useful, because each prevention strategy below attacks one of them.

#### Resource-Allocation Graphs

Deadlocks can be described more precisely in terms of a directed graph called a **resource-allocation graph** $G = (V, E)$:

- **Vertices** $V$: the processes $P_i$ (circles) and the resource types $R_j$ (rectangles, with one dot per instance).
- **Edges** $E$: a **request edge** $P_i \to R_j$ (process $P_i$ has requested an instance of $R_j$ and is waiting), and an **assignment edge** $R_j \to P_i$ (an instance of $R_j$ has been allocated to $P_i$; it starts from the particular instance).

<figure class="fig">
<svg viewBox="0 0 640 105" width="640" role="img" aria-label="Resource-allocation graph notation">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <circle cx="55" cy="42" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55" y="47" text-anchor="middle" font-size="13" fill="currentColor">Pᵢ</text>
  <text x="55" y="92" text-anchor="middle" font-size="11" fill="currentColor" class="dim">process</text>
  <rect x="165" y="25" width="54" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="178" cy="42" r="3" fill="currentColor"/>
  <circle cx="192" cy="42" r="3" fill="currentColor"/>
  <circle cx="206" cy="42" r="3" fill="currentColor"/>
  <text x="192" y="92" text-anchor="middle" font-size="11" fill="currentColor" class="dim">resource type (3 instances)</text>
  <circle cx="300" cy="42" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300" y="47" text-anchor="middle" font-size="13" fill="currentColor">Pᵢ</text>
  <rect x="368" y="25" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="391" cy="42" r="3" fill="currentColor"/>
  <polyline points="317,42 365,42" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="345" y="92" text-anchor="middle" font-size="11" fill="currentColor" class="dim">request edge Pᵢ → Rⱼ</text>
  <rect x="480" y="25" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="503" cy="42" r="3" fill="currentColor"/>
  <circle cx="590" cy="42" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="590" y="47" text-anchor="middle" font-size="13" fill="currentColor">Pᵢ</text>
  <polyline points="503,42 570,42" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="535" y="92" text-anchor="middle" font-size="11" fill="currentColor" class="dim">assignment edge Rⱼ → Pᵢ</text>
</svg>
<figcaption>Resource-allocation graph notation.</figcaption>
</figure>

<figure class="fig">
<div class="figrow">
<svg viewBox="0 0 500 240" width="500" role="img" aria-label="Resource-allocation graph without a cycle">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="147.0" y="23.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170" y="17.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₁</text>
  <circle cx="170.0" cy="40" r="3" fill="currentColor"/>
  <rect x="307.0" y="23.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330" y="17.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₃</text>
  <circle cx="330.0" cy="40" r="3" fill="currentColor"/>
  <rect x="147.0" y="193.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170" y="187.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₂</text>
  <circle cx="164.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="176.0" cy="210" r="3" fill="currentColor"/>
  <rect x="307.0" y="193.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330" y="187.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₄</text>
  <circle cx="318.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="330.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="342.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="90" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="90" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₁</text>
  <circle cx="250" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₂</text>
  <circle cx="410" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="410" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₃</text>
  <polyline points="101.7,112.6 151.2,60.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="261.7,112.6 311.2,60.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="170.0,40 236.3,110.4" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="164.0,210 103.1,140.1" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="176.0,210 236.9,140.1" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="330.0,40 396.3,110.4" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
</svg>
<svg viewBox="0 0 500 240" width="500" role="img" aria-label="Resource-allocation graph with a deadlock">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="147.0" y="23.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170" y="17.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₁</text>
  <circle cx="170.0" cy="40" r="3" fill="currentColor"/>
  <rect x="307.0" y="23.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330" y="17.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₃</text>
  <circle cx="330.0" cy="40" r="3" fill="currentColor"/>
  <rect x="147.0" y="193.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170" y="187.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₂</text>
  <circle cx="164.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="176.0" cy="210" r="3" fill="currentColor"/>
  <rect x="307.0" y="193.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330" y="187.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₄</text>
  <circle cx="318.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="330.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="342.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="90" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="90" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₁</text>
  <circle cx="250" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₂</text>
  <circle cx="410" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="410" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₃</text>
  <polyline points="101.7,112.6 151.2,60.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="261.7,112.6 311.2,60.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="394.0,130.7 196.0,200.8" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="170.0,40 236.3,110.4" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="164.0,210 103.1,140.1" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="176.0,210 236.9,140.1" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="330.0,40 396.3,110.4" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
</svg>
</div>
<figcaption>Top: no cycle, so no deadlock (after Galvin, Fig. 7.1). Bottom: once $P_3$ requests $R_2$ there are two cycles, $P_1 \to R_1 \to P_2 \to R_3 \to P_3 \to R_2 \to P_1$ and $P_2 \to R_3 \to P_3 \to R_2 \to P_2$, and $P_1, P_2, P_3$ are deadlocked (Fig. 7.2).</figcaption>
</figure>

If the graph contains no cycle, no process is deadlocked. If it contains a cycle, there **can** be a deadlock:

<figure class="fig">
<svg viewBox="0 0 330 245" width="330" role="img" aria-label="Resource-allocation graph with a cycle but no deadlock">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="137.0" y="38.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="160" y="32.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₁</text>
  <circle cx="154.0" cy="55" r="3" fill="currentColor"/>
  <circle cx="166.0" cy="55" r="3" fill="currentColor"/>
  <rect x="137.0" y="178.0" width="46" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="160" y="172.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R₂</text>
  <circle cx="154.0" cy="195" r="3" fill="currentColor"/>
  <circle cx="166.0" cy="195" r="3" fill="currentColor"/>
  <circle cx="70" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="70" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₁</text>
  <circle cx="250" cy="30" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250" y="35" text-anchor="middle" font-size="13" fill="currentColor">P₂</text>
  <circle cx="250" cy="125" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250" y="130" text-anchor="middle" font-size="13" fill="currentColor">P₃</text>
  <circle cx="250" cy="215" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250" y="220" text-anchor="middle" font-size="13" fill="currentColor">P₄</text>
  <polyline points="83.4,114.6 134.3,75.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="236.6,135.4 185.7,175.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="154.0,55 230.6,35.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="166.0,55 234.6,112.2" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="154.0,195 85.4,137.8" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="166.0,195 230.5,210.4" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
</svg>
<figcaption>A cycle $P_1 \to R_1 \to P_3 \to R_2 \to P_1$ but no deadlock (after Galvin, Fig. 7.3): $P_4$ may release its instance of $R_2$, which can then be allocated to $P_3$, breaking the cycle.</figcaption>
</figure>

$$\text{no cycle} \implies \text{no deadlock}, \qquad \text{cycle} \;\not\!\!\implies \text{deadlock}$$

If every resource type has a **single instance**, then a cycle is both necessary and sufficient: a cycle $\iff$ deadlock. With several instances per type, a cycle is necessary but not sufficient.

#### Methods for Handling Deadlocks

There are three strategies to deal with deadlocks:

1. Use a protocol to **prevent** or **avoid** deadlocks, ensuring that the system will never enter a deadlocked state.
2. **Allow** the system to enter a deadlocked state, **detect** it and **recover**.
3. **Ignore** the problem altogether and pretend that deadlocks never occur.

The third solution is the one used by most operating systems, including Linux and Windows. It is then up to application developers to write programs that handle deadlocks.

To ensure that deadlocks never occur, the system can use either a **deadlock-prevention** or a **deadlock-avoidance** scheme.

##### Deadlock Prevention

Prevent at least one of the four necessary conditions from holding, by constraining how requests for resources can be made.

- **Mutual exclusion**: cannot be prevented in general, because some resources are intrinsically non-sharable (a mutex lock cannot be shared). Sharable resources such as read-only files never need it.
- **Hold and wait**: guarantee that whenever a process requests a resource, it does not hold any others. Either a process requests all its resources before it begins execution, or it may request resources only when it holds none. Both work, but they are **very inefficient**: resource utilization is low, and a process that needs several popular resources may starve.
- **No preemption**: can be done using some approaches. If a process holding resources requests another that cannot be immediately allocated, all the resources it holds are preempted (implicitly released), and it is restarted only when it can regain them along with the new ones. This works for resources whose state can be saved and restored, like CPU registers and memory, but not for printers or mutex locks.
- **Circular wait**: one way to ensure that this condition never holds is to impose a **total ordering** of all resource types and to require that each process requests resources in an increasing order.

**Ordering resources.** Define a mapping of resources to natural numbers,

$$F : R \to \mathbb{N},$$

and require that a process holding $r_i$ can request $r_j$ only if $F(r_j) > F(r_i)$. (Equivalently, a process requesting $r_j$ must first release any $r_i$ with $F(r_i) \ge F(r_j)$.)

*Proof that no circular wait can exist.* Suppose a circular wait exists, $P_0 \to r_0 \to P_1 \to r_1 \to \cdots \to P_n \to r_n \to P_0$, where $P_{i+1}$ holds $r_i$ while requesting $r_{i+1}$. Then

$$F(r_0) < F(r_1) < \cdots < F(r_n) < F(r_0),$$

so $F(r_0) < F(r_0)$, which is not possible. Hence circular wait is avoided.

##### Deadlock Avoidance

Deadlock-prevention algorithms prevent deadlocks by restraining how requests can be made, which causes low device utilization and reduced system throughput. An alternative method for avoiding deadlocks is to require **additional information about how resources are to be requested**.

The simplest and most useful algorithm requires that each process declare the **maximum number of resources** of each type that it may need. A deadlock-avoidance algorithm then dynamically examines the resource-allocation state to ensure that a circular-wait condition can never exist.

##### Safe State

<div class="definition">

A state is *safe* if the system can allocate resources to each process (up to its maximum) in some order and still avoid a deadlock. More formally, a system is in a safe state only if there exists a *safe sequence* $\langle P_1, P_2, \ldots, P_n \rangle$: for each $P_i$, the resources $P_i$ can still request can be satisfied by the currently available resources plus those held by all $P_j$ with $j < i$. If no such sequence exists, the state is *unsafe*.

</div>

<figure class="fig">
<svg viewBox="0 0 460 210" width="460" role="img" aria-label="Safe, unsafe and deadlocked state spaces">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="10" width="420" height="190" rx="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <ellipse cx="300" cy="118" rx="125" ry="72" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>
  <ellipse cx="320" cy="135" rx="62" ry="34" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="2"/>
  <ellipse cx="320" cy="135" rx="62" ry="34" fill="currentColor" opacity=".12"/>
  <text x="95" y="60" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">safe</text>
  <text x="250" y="80" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">unsafe</text>
  <text x="320" y="140" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">deadlock</text>
</svg>
<figcaption>Safe, unsafe and deadlocked state spaces (after Galvin, Fig. 7.6).</figcaption>
</figure>

- A safe state is not a deadlocked state. A deadlocked state is an unsafe state.
- Not all unsafe states are deadlocks; an unsafe state **may** lead to a deadlock.
- In an unsafe state, the OS cannot prevent processes from requesting resources in such a way that a deadlock occurs.

Whenever a process requests a resource that is currently available, the system must decide whether the resource can be allocated immediately or whether the process must wait. The request is granted only if the allocation leaves the system in a safe state.

> **Note.** In this scheme, if a process requests a resource that is currently available, it may still have to wait. Thus resource utilization may be lower than it would otherwise be.

#### Banker's Algorithm

The resource-allocation-graph avoidance algorithm (which adds dashed *claim edges* to the graph) is not applicable to a resource-allocation system with **multiple instances of each resource type**. The **Banker's algorithm** is applicable, but it is less efficient than the graph scheme.

When a new process enters the system, it must declare the maximum number of instances of each resource type that it may need. This number may not exceed the total number of resources in the system. When a process requests a set of resources, the system must determine whether the allocation of these resources will leave the system in a safe state. If it will, the resources are allocated; otherwise, the process must wait until some other process releases enough resources.

##### Data Structures

With $n$ processes and $m$ resource types:

- $\text{Available}[m]$: $\text{Available}[j] = k$ means $k$ instances of resource type $R_j$ are available.
- $\text{Max}[n \times m]$: $\text{Max}[i][j] = k$ means process $P_i$ may request at most $k$ instances of $R_j$.
- $\text{Allocation}[n \times m]$: $\text{Allocation}[i][j] = k$ means $P_i$ is currently allocated $k$ instances of $R_j$.
- $\text{Need}[n \times m]$: $\text{Need}[i][j] = k$ means $P_i$ may need $k$ more instances of $R_j$ to complete its task. It can be computed as

$$\text{Need} = \text{Max} - \text{Allocation}$$

##### Safety Algorithm

1. Let $\text{Work} = \text{Available}$ and $\text{Finish}[i] = \text{false}$ for all $i$.
2. Find an $i$ such that $\text{Finish}[i] = \text{false}$ and $\text{Need}_i \le \text{Work}$. If no such $i$ exists, go to step 4.
3. $\text{Work} = \text{Work} + \text{Allocation}_i$, $\text{Finish}[i] = \text{true}$ ($P_i$ can finish and return its resources). Go to step 2.
4. If $\text{Finish}[i] = \text{true}$ for all $i$, the state is safe.

This takes $O(m \cdot n^2)$ operations.

##### Resource-Request Algorithm

When $P_i$ makes a request $\text{Request}_i$:

1. If $\text{Request}_i \le \text{Need}_i$, go to step 2. Otherwise raise an error: the process has exceeded its maximum claim (abort).
2. If $\text{Request}_i \le \text{Available}$, go to step 3. Otherwise $P_i$ must wait, since the resources are not available.
3. Pretend to allocate the resources:

$$\text{Available} = \text{Available} - \text{Request}_i, \quad \text{Allocation}_i = \text{Allocation}_i + \text{Request}_i, \quad \text{Need}_i = \text{Need}_i - \text{Request}_i$$

and run the safety algorithm. If the new state is safe, the resources are allocated to $P_i$. If it is unsafe, $P_i$ must wait, and the old state is restored.

##### Worked Example

<div class="example">

Five processes $P_0, \ldots, P_4$ share three resource types with $A = 10$, $B = 5$ and $C = 7$ instances.

</div>

<figure class="table">
<figcaption>The state of the system. $\text{Need} = \text{Max} - \text{Allocation}$.</figcaption>

| | Allocation<br>A B C | Max<br>A B C | Need<br>A B C |
|:-:|:-:|:-:|:-:|
| $P_0$ | 0 1 0 | 7 5 3 | 7 4 3 |
| $P_1$ | 2 0 0 | 3 2 2 | 1 2 2 |
| $P_2$ | 3 0 2 | 9 0 2 | 6 0 0 |
| $P_3$ | 2 1 1 | 2 2 2 | 0 1 1 |
| $P_4$ | 0 0 2 | 4 3 3 | 4 3 1 |
| total allocated | 7 2 5 | | |

</figure>

$$\text{Available} = \text{Total} - \text{Allocated} = (10, 5, 7) - (7, 2, 5) = (3, 3, 2)$$

Running the safety algorithm, each process that can finish returns its allocation to Work:

<figure class="table">
<figcaption>A safe sequence and the Work vector after each process finishes.</figcaption>

| Step | Process | Need $\le$ Work? | Work after |
|:-:|:-:|:-:|:-:|
| start | | | 3 3 2 |
| 1 | $P_1$ | 1 2 2 ≤ 3 3 2 | 5 3 2 |
| 2 | $P_3$ | 0 1 1 ≤ 5 3 2 | 7 4 3 |
| 3 | $P_4$ | 4 3 1 ≤ 7 4 3 | 7 4 5 |
| 4 | $P_0$ | 7 4 3 ≤ 7 4 5 | 7 5 5 |
| 5 | $P_2$ | 6 0 0 ≤ 7 5 5 | 10 5 7 |

</figure>

The safe sequence $\langle P_1, P_3, P_4, P_0, P_2 \rangle$ exists, so the state is **safe**. The safe sequence may not be unique: $\langle P_1, P_3, P_4, P_2, P_0 \rangle$ also works.

**Now suppose $P_1$ requests $\text{Request}_1 = (1, 0, 2)$.** We have to check whether we can grant it.

- $\text{Request}_1 = (1, 0, 2) \le \text{Need}_1 = (1, 2, 2)$ ✓ (abort if $>$).
- $\text{Request}_1 = (1, 0, 2) \le \text{Available} = (3, 3, 2)$ ✓.

Pretend to allocate, and check the updated vectors:

<figure class="table">
<figcaption>The state after pretending to grant $P_1$'s request.</figcaption>

| | Allocation<br>A B C | Need<br>A B C |
|:-:|:-:|:-:|
| $P_0$ | 0 1 0 | 7 4 3 |
| $P_1$ | **3 0 2** | **0 2 0** |
| $P_2$ | 3 0 2 | 6 0 0 |
| $P_3$ | 2 1 1 | 0 1 1 |
| $P_4$ | 0 0 2 | 4 3 1 |
| Available | **2 3 0** | |

</figure>

Running the safety algorithm again, $\langle P_1, P_3, P_4, P_0, P_2 \rangle$ is still a safe sequence, with Work going $(2,3,0) \to (5,3,2) \to (7,4,3) \to (7,4,5) \to (7,5,5) \to (10,5,7)$. So the state is safe and **$P_1$'s request is approved**.

> **Note.** In this new state, a request $(3, 3, 0)$ by $P_4$ cannot be granted, since the resources are not available. A request $(0, 2, 0)$ by $P_0$ cannot be granted either: the resources are available, but the resulting state, with Available $= (2, 1, 0)$, is unsafe, because no process's Need fits in Work.

#### Deadlock Detection

If a system uses neither prevention nor avoidance, a deadlock may occur. Then it needs an algorithm that examines the state of the system to **detect** whether a deadlock has occurred, and an algorithm to **recover** from it. Both cost something: the run-time cost of keeping the information and running the detection, plus the losses of recovery.

##### Single Instance of Each Resource Type

If every resource has only one instance, use a **wait-for graph**: take the resource-allocation graph, remove the resource nodes and collapse the edges. An edge $P_i \to P_j$ means $P_i$ is waiting for $P_j$ to release a resource; it exists exactly when the resource-allocation graph has edges $P_i \to R_q$ and $R_q \to P_j$ for some $R_q$.

<figure class="fig">
<svg viewBox="0 0 640 296" width="640" role="img" aria-label="A resource-allocation graph and its wait-for graph">
  <defs><marker id="arr-wfg" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <circle cx="50" cy="40" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50.0" y="45.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <circle cx="250" cy="40" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="45.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <circle cx="50" cy="240" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50.0" y="245.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₄</text>
  <circle cx="250" cy="240" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="245.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <rect x="133" y="23" width="34" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="150" cy="46" r="3" fill="currentColor"/>
  <text x="150.0" y="37.0" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">R₁</text>
  <rect x="33" y="123" width="34" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="50" cy="146" r="3" fill="currentColor"/>
  <text x="50.0" y="137.0" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">R₄</text>
  <rect x="133" y="123" width="34" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="150" cy="146" r="3" fill="currentColor"/>
  <text x="150.0" y="137.0" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">R₃</text>
  <rect x="233" y="123" width="34" height="34" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="250" cy="146" r="3" fill="currentColor"/>
  <text x="250.0" y="137.0" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">R₂</text>
  <line x1="69.0" y1="40.0" x2="129.0" y2="40.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="250.0" y1="59.0" x2="250.0" y2="119.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="236.6" y1="53.4" x2="164.8" y2="125.2" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="236.6" y1="226.6" x2="164.8" y2="154.8" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="50.0" y1="221.0" x2="50.0" y2="161.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="168.0" y1="40.0" x2="229.0" y2="40.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="250.0" y1="158.0" x2="250.0" y2="219.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="137.3" y1="152.7" x2="64.8" y2="225.2" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="50.0" y1="122.0" x2="50.0" y2="61.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <text x="150.0" y="286.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(a) resource-allocation graph</text>
  <circle cx="440" cy="40" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="440.0" y="45.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₁</text>
  <circle cx="590" cy="40" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="590.0" y="45.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₂</text>
  <circle cx="440" cy="240" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="440.0" y="245.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₄</text>
  <circle cx="590" cy="240" r="17" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="590.0" y="245.0" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">P₃</text>
  <line x1="459.0" y1="40.0" x2="569.0" y2="40.0" stroke="#ef4444" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="590.0" y1="59.0" x2="590.0" y2="219.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="578.6" y1="55.2" x2="452.6" y2="223.2" stroke="#ef4444" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="571.0" y1="240.0" x2="461.0" y2="240.0" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <line x1="440.0" y1="221.0" x2="440.0" y2="61.0" stroke="#ef4444" stroke-width="1.5" marker-end="url(#arr-wfg)"/>
  <text x="515.0" y="286.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">(b) wait-for graph</text>
</svg>
<figcaption>A resource-allocation graph and its wait-for graph. The cycle $P_1 \to P_2 \to P_4 \to P_1$ (red) is a deadlock; so is $P_1 \to P_2 \to P_3 \to P_4 \to P_1$.</figcaption>
</figure>

A deadlock exists **if and only if the wait-for graph has a cycle**. The system maintains the graph and periodically searches it for a cycle, which takes $O(n^2)$ operations for $n$ processes.

##### Several Instances of a Resource Type

The wait-for graph does not work with multiple instances. The detection algorithm instead uses data structures like the banker's algorithm, with the current **Request** in place of Need:

- **Available:** vector of length $m$, the number of available resources of each type.
- **Allocation:** $n \times m$ matrix, the resources of each type currently allocated to each process.
- **Request:** $n \times m$ matrix, the current request of each process.

The algorithm:

1. Let $\text{Work} = \text{Available}$. For each $i$, set $\text{Finish}[i] = \text{false}$ if $\text{Allocation}_i \ne 0$, otherwise $\text{true}$.
2. Find an $i$ with $\text{Finish}[i] = \text{false}$ and $\text{Request}_i \le \text{Work}$. If there is none, go to step 4.
3. $\text{Work} = \text{Work} + \text{Allocation}_i$, $\text{Finish}[i] = \text{true}$; go to step 2.
4. If $\text{Finish}[i] = \text{false}$ for some $i$, the system is deadlocked, and every such $P_i$ is deadlocked.

It takes $O(m \times n^2)$ operations.

> **Note.** Step 3 reclaims $P_i$'s resources as soon as $\text{Request}_i \le \text{Work}$. This is optimistic: we assume $P_i$ needs nothing more and will soon finish and return everything. If that is wrong, a deadlock may occur later, and the next run of the algorithm will detect it. The difference from the safety algorithm is that we use the **current request**, not the maximum future need.

<div class="example">

Five processes $P_0, \ldots, P_4$ share resource types $A$, $B$, $C$ with 7, 2 and 6 instances. Is the system deadlocked?

</div>

<figure class="table">
<figcaption>The state of the system at time $T_0$ (after Galvin, §7.6.2).</figcaption>

| | Allocation<br>A B C | Request<br>A B C |
|:-:|:-:|:-:|
| $P_0$ | 0 1 0 | 0 0 0 |
| $P_1$ | 2 0 0 | 2 0 2 |
| $P_2$ | 3 0 3 | 0 0 0 |
| $P_3$ | 2 1 1 | 1 0 0 |
| $P_4$ | 0 0 2 | 0 0 2 |
| Available | 0 0 0 | |

</figure>

Work goes $(0,0,0) \xrightarrow{P_0} (0,1,0) \xrightarrow{P_2} (3,1,3) \xrightarrow{P_3} (5,2,4) \xrightarrow{P_1} (7,2,4) \xrightarrow{P_4} (7,2,6)$. Every process can finish, with $\langle P_0, P_2, P_3, P_1, P_4 \rangle$, so the system is **not** deadlocked.

**Now suppose $P_2$ requests one more instance of $C$**, so $\text{Request}_2 = (0, 0, 1)$. $P_0$ can still finish, giving $\text{Work} = (0, 1, 0)$, but then no other request fits: $P_1$, $P_2$ and $P_4$ need $C$, and $P_3$ needs $A$. The system is **deadlocked**, and the deadlock consists of $P_1, P_2, P_3, P_4$.

##### When to Run Detection

It depends on how often deadlocks occur and how many processes they affect.

- Deadlocks happen only when a request cannot be granted immediately, so detection could run **on every such request**. This also identifies the process whose request completed the cycle, but costs a lot of computation.
- A cheaper choice is to run it **at intervals**, e.g. once per hour, or whenever CPU utilization drops below 40% (a deadlock eventually cripples throughput). Then the graph may contain many cycles, and we usually cannot tell which process "caused" the deadlock.

#### Recovery from Deadlock

Once a deadlock is detected, the operator can be told to deal with it manually, or the system can recover automatically, either by **aborting processes** or by **preempting resources**.

##### Process Termination

In both methods the system reclaims all resources of the terminated processes.

- **Abort all deadlocked processes.** This surely breaks the cycle, but at great expense: their partial computations are lost and must be redone.
- **Abort one process at a time** until the cycle is eliminated. This needs a detection run after each abort.

Aborting is not always easy: a process in the middle of updating a file leaves it in an incorrect state. For partial termination, choose the process whose termination costs least, based on factors such as:

1. its priority;
2. how long it has computed, and how much longer it needs;
3. how many and what types of resources it has used (whether they are easy to preempt);
4. how many more resources it needs to complete;
5. how many processes will need to be terminated;
6. whether it is interactive or batch.

##### Resource Preemption

Preempt resources from some processes and give them to others until the cycle is broken. Three issues must be addressed:

1. **Selecting a victim:** which resources and processes to preempt, so as to minimize cost (e.g. the number of resources held, the time used so far).
2. **Rollback:** the process cannot continue without the resource, so it must be rolled back to some safe state and restarted from there. Since a safe state is hard to determine, the simplest solution is a **total rollback**: abort and restart it.
3. **Starvation:** if victims are chosen only by cost, the same process may always be picked. A process should be picked as a victim only a finite (small) number of times; the usual fix is to include the **number of rollbacks** in the cost.

## Memory Management

### Main Memory

Main memory and the registers built into the processor itself are the only storage that the CPU can access directly. There are machine instructions that take memory addresses as arguments, but none that take disk addresses. Therefore, any instruction in execution, and any data being used by the instructions, must be in one of these direct-access storage devices. If the data are not in memory, they must be moved there before the CPU can operate on them.

<figure class="fig">
<svg viewBox="0 0 640 170" width="640" role="img" aria-label="CPU components and the storage it can access directly">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="24" width="260" height="128" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150" y="16" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">CPU</text>
  <rect x="35" y="38" width="70" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="70.0" y="57.0" text-anchor="middle" font-size="12" fill="currentColor">ALU</text>
  <rect x="125" y="38" width="140" height="28" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="195.0" y="57.0" text-anchor="middle" font-size="12" fill="currentColor">registers</text>
  <rect x="100" y="78" width="100" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150.0" y="96.0" text-anchor="middle" font-size="12" fill="currentColor">control</text>
  <rect x="35" y="114" width="70" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="70.0" y="132.0" text-anchor="middle" font-size="12" fill="currentColor">MMU</text>
  <rect x="190" y="114" width="75" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="227.5" y="132.0" text-anchor="middle" font-size="12" fill="currentColor">cache</text>
  <polyline points="280,88 370,88" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="325" y="80" text-anchor="middle" font-size="10" fill="currentColor" class="dim">address / data</text>
  <rect x="370" y="62" width="110" height="52" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="425.0" y="93.0" text-anchor="middle" font-size="12" fill="currentColor">main memory</text>
  <ellipse cx="575" cy="64" rx="38" ry="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M537,64 V112 a38,9 0 0 0 76,0 V64" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="575" y="96" text-anchor="middle" font-size="12" fill="currentColor">disk</text>
  <polyline points="537,88 482,88" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)" stroke-dasharray="4 3"/>
  <text x="510" y="132" text-anchor="middle" font-size="10" fill="currentColor" class="dim">only via I/O</text>
</svg>
<figcaption>The CPU can address its registers and main memory directly; the disk is reached only through I/O.</figcaption>
</figure>

Registers that are built into the CPU are generally accessible within one cycle of the CPU clock. Memory access may take many cycles of the CPU clock to complete, in which case the processor normally needs to **stall**, since it does not have the data required to complete the instruction that it is executing.

> **Note.** The remedy is to add fast memory between the CPU and main memory, typically on the CPU chip: a **cache**.

#### Idea of Address Translation

- There could be many programs running concurrently on a machine, and they must be protected from each other: one program should not be able to access the variables of another. This is physically done through **address translation**.
- Each program is compiled to use addresses in the range $0$ to MaxAddr (e.g. $0$ to $2^{64} - 1$).
- These addresses are not real, but only **virtual addresses**. They have to be translated into actual main-memory addresses.
- **Memory management unit (MMU):** the hardware that does the address translation.

#### Protection with Base and Limit Registers

Not only are we concerned with the relative speed of accessing physical memory, but we must also **protect** user processes from one another. We need to make sure that each process has a separate memory space. To do this, we need the ability to determine the range of legal addresses that the process may access and to ensure that the process can access only these legal addresses.

We can provide this protection by using two registers, usually a **base** and a **limit**:

- the **base register** holds the smallest legal physical memory address;
- the **limit register** specifies the size of the range.

<figure class="fig">
<svg viewBox="0 0 560 250" width="560" role="img" aria-label="A base and a limit register define a logical address space">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="300" y="20" width="150" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="375.0" y="45" text-anchor="middle" font-size="12" fill="currentColor">operating system</text>
  <rect x="300" y="60" width="150" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="375.0" y="85" text-anchor="middle" font-size="12" fill="currentColor">process</text>
  <rect x="300" y="100" width="150" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="100" width="150" height="40" fill="currentColor" opacity=".12"/>
  <text x="375.0" y="125" text-anchor="middle" font-size="12" fill="currentColor">process</text>
  <rect x="300" y="140" width="150" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="375.0" y="165" text-anchor="middle" font-size="12" fill="currentColor">process</text>
  <rect x="300" y="180" width="150" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="460" y="24" text-anchor="start" font-size="11" fill="currentColor" class="dim">0</text>
  <text x="460" y="64" text-anchor="start" font-size="11" fill="currentColor" class="dim">25600</text>
  <text x="460" y="104" text-anchor="start" font-size="11" fill="currentColor" class="dim">30004</text>
  <text x="460" y="144" text-anchor="start" font-size="11" fill="currentColor" class="dim">42094</text>
  <text x="460" y="184" text-anchor="start" font-size="11" fill="currentColor" class="dim">88000</text>
  <text x="460" y="224" text-anchor="start" font-size="11" fill="currentColor" class="dim">102400</text>
  <rect x="150" y="76" width="80" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190.0" y="93.0" text-anchor="middle" font-size="12" fill="currentColor">30004</text>
  <text x="190" y="114" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">base</text>
  <polyline points="230,88 260,88 260,100 296,100" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="150" y="132" width="80" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190.0" y="149.0" text-anchor="middle" font-size="12" fill="currentColor">12090</text>
  <text x="190" y="170" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">limit</text>
  <path d="M292,101 h-6 V139 h6" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="230,144 270,144 270,120 283,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="375" y="244" text-anchor="middle" font-size="11" fill="currentColor" class="dim">legal addresses: 30004 … 42093</text>
</svg>
<figcaption>With base = 30004 and limit = 12090, the program can legally access all addresses from 30004 through 42093 (inclusive), i.e. from <em>base</em> to <em>base + limit − 1</em> (after Galvin, Fig. 8.1).</figcaption>
</figure>

Protection of memory space is accomplished by having the CPU hardware compare **every** address generated in user mode with the registers:

<figure class="fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Hardware address protection with base and limit registers">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="70" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55.0" y="95.0" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <polyline points="90,90 173,90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="130" y="82" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">address</text>
  <polygon points="175,90 215,64 255,90 215,116" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215" y="95" text-anchor="middle" font-size="14" fill="currentColor">≥</text>
  <rect x="175" y="12" width="80" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="30.0" text-anchor="middle" font-size="12" fill="currentColor">base</text>
  <polyline points="215,38 215,62" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="255,90 358,90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="305" y="82" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">yes</text>
  <polygon points="360,90 400,64 440,90 400,116" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400" y="95" text-anchor="middle" font-size="14" fill="currentColor">&lt;</text>
  <rect x="345" y="12" width="110" height="26" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="30.0" text-anchor="middle" font-size="12" fill="currentColor">base + limit</text>
  <polyline points="400,38 400,62" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="440,90 540,90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="490" y="82" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">yes</text>
  <rect x="540" y="60" width="85" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="582.5" y="95.0" text-anchor="middle" font-size="13" fill="currentColor">memory</text>
  <polyline points="215,116 215,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="223" y="136" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">no</text>
  <polyline points="400,116 400,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="408" y="136" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">no</text>
  <rect x="170" y="150" width="275" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="307.5" y="170.0" text-anchor="middle" font-size="12" fill="currentColor">trap to the OS: addressing error</text>
</svg>
<figcaption>Hardware address protection with base and limit registers (after Galvin, Fig. 8.2).</figcaption>
</figure>

Any attempt by a program executing in user mode to access OS memory or other users' memory results in a trap to the OS, which treats it as a fatal error. This scheme prevents a user program from (accidentally or deliberately) modifying the code or data structures of either the OS or other users.

> **Note.** The base and limit registers can be loaded only by the OS, using a special **privileged instruction**. Since privileged instructions can be executed only in kernel mode, only the OS can change them.

#### Address Binding

Usually, a program resides on a disk as a binary executable file. To be executed, the program must be brought into memory and placed within a process. Depending on the memory management in use, the process may be moved between disk and memory during its execution. The processes on the disk that are waiting to be brought into memory for execution form the **input queue**.

The normal procedure is to select one of the processes in the input queue and to load that process into memory. As the process is executed, it accesses instructions and data from memory. Eventually, the process terminates, and its memory space is declared available.

Addresses in the source program are generally **symbolic** (such as the variable `count`). A compiler typically **binds** these symbolic addresses to **relocatable** addresses (such as "14 bytes from the beginning of this module"). The linkage editor or loader in turn binds the relocatable addresses to **absolute** addresses (such as 74014).

Classically, the binding of instructions and data to memory addresses can be done at any step along the way:

- **Compile time.** If you know at compile time where the process will reside in memory, then **absolute code** can be generated. If the starting location changes later, the code must be recompiled.
- **Load time.** If it is not known at compile time where the process will reside in memory, then the compiler must generate **relocatable code**, and final binding is delayed until load time.
- **Execution time.** If the process can be moved during its execution from one memory segment to another, then binding must be delayed until run time. Special hardware must be available for this scheme to work.

#### Logical vs Physical Address Space

<div class="definition">

An address generated by the CPU is commonly referred to as a *logical address*, whereas an address seen by the memory unit (that is, the one loaded into the memory-address register (MAR) of the memory) is commonly referred to as a *physical address*.

</div>

> **Note.** The compile-time and load-time address-binding methods generate **identical** logical and physical addresses. However, the execution-time address-binding scheme results in **different** logical and physical addresses. In this case, we usually refer to the logical address as a **virtual address**.

The run-time mapping from virtual to physical addresses is done by the **MMU**, a hardware device inside the CPU. In the simplest scheme, the base register is now called a **relocation register**, and its value is added to every address generated by a user process at the time the address is sent to memory:

<figure class="fig">
<svg viewBox="0 0 650 150" width="650" role="img" aria-label="Dynamic relocation using a relocation register">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="220" y="22" width="180" height="110" rx="4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5 4"/>
  <text x="310" y="126" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">MMU</text>
  <rect x="20" y="62" width="70" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55.0" y="87.0" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <rect x="265" y="32" width="90" height="24" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="49.0" text-anchor="middle" font-size="12" fill="currentColor">4000</text>
  <text x="310" y="16" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">relocation register</text>
  <circle cx="310" cy="82" r="14" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310" y="87" text-anchor="middle" font-size="16" fill="currentColor">+</text>
  <polyline points="310,56 310,66" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="90,82 294,82" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="160" y="74" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">logical address 346</text>
  <polyline points="324,82 528,82" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="466" y="74" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">physical address 4346</text>
  <rect x="530" y="52" width="100" height="60" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="580.0" y="87.0" text-anchor="middle" font-size="13" fill="currentColor">memory</text>
</svg>
<figcaption>Dynamic relocation: with the relocation register at 4000, logical address 346 is mapped to physical address 4346 (after Galvin, Fig. 8.4).</figcaption>
</figure>

The user program never sees the real physical addresses: it deals with logical addresses in the range $0$ to *max*, which are mapped to physical addresses in the range $R + 0$ to $R + \text{max}$ for a relocation value $R$.

#### Dynamic Loading

So far, the entire program and all data of a process must be in physical memory for the process to execute. The size of a process is thus limited to the size of physical memory. To obtain better memory-space utilization, we can use **dynamic loading**.

With dynamic loading, a routine is not loaded until it is called. All routines are kept on disk in a relocatable load format.

1. The main program is loaded into memory and is executed.
2. When a routine needs to call another routine, the calling routine first checks to see whether the other routine has been loaded.
3. If it has not, the relocatable linking loader is called to load the desired routine into memory and to update the program's address tables to reflect this change.
4. Then control is passed to the newly loaded routine.

The advantage of dynamic loading is that an unused routine is never loaded. This is particularly useful when large amounts of code are needed to handle infrequently occurring cases, such as error routines: the total program size may be large, but the portion that is actually used (and hence loaded) may be much smaller.

> **Note.** Dynamic loading does **not** require special support from the OS. It is the responsibility of the users to design their programs to take advantage of such a method. The OS may help, however, by providing library routines to implement dynamic loading.

#### Dynamic Linking and Shared Libraries

Some operating systems support only **static linking**, in which system language libraries are treated like any other object module and are combined by the loader into the binary program image.

With **dynamic linking**, linking is postponed until execution time. This feature is usually used with system libraries, such as language subroutine libraries; without it, each program on a system must include a copy of its language library in the executable image, which wastes both disk space and main memory.

With dynamic linking, a **stub** is included in the image for each library-routine reference. The stub is a small piece of code that indicates how to locate the appropriate memory-resident library routine, or how to load the library if the routine is not already present. When the stub is executed, it replaces itself with the address of the routine and executes it, so the next time that code segment is reached, the library routine is executed directly.

- All processes that use a language library execute only **one copy** of the library code; hence these are called **shared libraries**.
- A library can be **updated** (e.g. for bug fixes) and every program that references it automatically uses the new version, without relinking. Version information in the program and the library keeps a program from using an incompatible version.

> **Note.** Unlike dynamic loading, dynamic linking generally requires **help from the OS**. If the processes in memory are protected from one another, only the OS can check whether the needed routine is in another process's memory space, and allow multiple processes to access the same memory addresses.

#### Swapping

A process has to be in main memory while it runs, but it does not have to stay there the whole time. It can be **swapped** out to a **backing store** (usually a fast disk) for a while and later brought back to continue where it left off. Because some processes can wait on disk, the total memory needed by all processes can be larger than the physical memory, which raises the degree of multiprogramming.

<figure class="fig">
<svg viewBox="0 0 600 220" width="600" role="img" aria-label="Swapping two processes using a disk as a backing store">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="60" y="20" width="150" height="160" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="60" y1="56" x2="210" y2="56" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135" y="43" text-anchor="middle" font-size="12" fill="currentColor">operating system</text>
  <text x="135" y="168" text-anchor="middle" font-size="12" fill="currentColor">user space</text>
  <ellipse cx="480" cy="32" rx="95" ry="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M385,32 V168 a95,12 0 0 0 190,0 V32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="415" y="62" width="110" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="470.0" y="82.0" text-anchor="middle" font-size="12" fill="currentColor">process P₁</text>
  <rect x="440" y="118" width="110" height="30" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="495.0" y="138.0" text-anchor="middle" font-size="12" fill="currentColor">process P₂</text>
  <polyline points="210,77 413,77" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="300" y="70" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">① swap out</text>
  <polyline points="438,133 212,133" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="300" y="126" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">② swap in</text>
  <text x="135" y="206" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">main memory</text>
  <text x="480" y="206" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">backing store</text>
</svg>
<figcaption>Swapping: process P₁ is moved out to the backing store, and P₂ is brought in to the freed space (after Galvin, Fig. 8.5).</figcaption>
</figure>

**Swapping with round robin.** In a multiprogramming system using round-robin CPU scheduling, when a process uses up its quantum, the memory manager can move it out and bring another process into the space it frees. Meanwhile the CPU scheduler keeps giving time slices to processes that are already in memory. Ideally the swapping is fast enough that some process is always in memory and ready whenever the scheduler wants to run one. This also means the **quantum must be long enough** that a reasonable amount of computation happens between swaps.

**Swapping with priorities.** A similar policy works for priority scheduling. When a higher-priority process arrives and needs memory, the memory manager can swap out a lower-priority process to make room, run the higher-priority one, and when it finishes, swap the lower-priority process back in to continue. This variant is sometimes called **roll out, roll in**.

**Where does it come back to?** Normally a swapped-out process returns to the same memory region it used before. Whether that is required depends on **address binding**:

- if binding is done at assembly or load time, the addresses are fixed in the code, so the process cannot easily be moved to a different location;
- with execution-time binding, the physical addresses are computed while the process runs, so it can be swapped back into any free region.

**Swapping is slow.** Most of the cost is transfer time, which grows with the amount of memory moved. For example, moving a 100 MB process over a disk that transfers 50 MB/s takes $100/50 = 2$ s each way, so swapping it out and another one in takes about 4 s. This is why it helps for the OS to know how much memory a process is *actually* using, not just how much it *could* use.

> **Note.** A process should be idle when it is swapped out. If it is waiting on I/O that will write directly into its memory buffers, swapping it out would let that I/O land in memory now owned by another process. So either such processes are never swapped, or I/O goes into OS buffers first and is copied to the process when it is back in memory (*double buffering*). Because full swapping is so slow, modern systems (UNIX, Linux, Windows) swap only when free memory runs low, and often swap just parts of processes, as part of virtual memory.

#### Memory Allocation

A simple way to allocate memory is to split it into several **fixed-sized partitions**, each holding exactly one process. The degree of multiprogramming is then limited by the number of partitions. In this multiple-partition method, whenever a partition becomes free, a process from the input queue is chosen and loaded into it; when that process terminates, the partition is free again for another process.

In the **variable-partition** scheme, the OS keeps a table recording which parts of memory are free and which are in use. At the start, all memory available to user processes is one large free block, called a **hole**. When a process arrives and needs memory, the OS looks for a hole big enough for it. If one is found, the process is given only as much memory as it needs, and the rest stays free for later requests.

So at any moment there is a set of holes of different sizes scattered across memory:

- When a process arrives, the system searches this set for a hole that is large enough. If the hole is bigger than needed, it is split in two: one part goes to the process, and the other goes back into the set of holes.
- When a process terminates, its block is returned to the set of holes. If the new hole is **adjacent** to other holes, they are **merged** into one bigger hole.

This is a special case of the general **dynamic storage-allocation problem**: how to satisfy a request of size $n$ from a list of free holes. Of the many solutions, the **first-fit**, **best-fit** and **worst-fit** strategies are the ones most commonly used to pick a hole.

- **First fit:** allocate the first hole that is big enough. The search can start from the beginning of the set of holes, or from where the previous first-fit search stopped (**next fit**).
- **Best fit:** allocate the smallest hole that is big enough. The whole list must be searched, unless it is kept ordered by size. This leaves the smallest leftover hole.
- **Worst fit:** allocate the largest hole. Again the whole list must be searched unless it is sorted by size. This leaves the largest leftover hole, which may be more useful than the small leftover from best fit.

<figure class="fig">
<svg viewBox="0 0 640 160" width="640" role="img" aria-label="First fit, best fit and worst fit for a request of 212 K">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="15" y="46" width="34" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="15" y="46" width="34" height="36" fill="currentColor" opacity=".12"/>
  <rect x="49" y="46" width="50" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="74.0" y="69" text-anchor="middle" font-size="12" fill="currentColor">100 K</text>
  <rect x="99" y="46" width="34" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="99" y="46" width="34" height="36" fill="currentColor" opacity=".12"/>
  <rect x="133" y="46" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="188.0" y="69" text-anchor="middle" font-size="12" fill="currentColor">500 K</text>
  <rect x="243" y="46" width="34" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="243" y="46" width="34" height="36" fill="currentColor" opacity=".12"/>
  <rect x="277" y="46" width="65" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="309.5" y="69" text-anchor="middle" font-size="12" fill="currentColor">200 K</text>
  <rect x="342" y="46" width="34" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="342" y="46" width="34" height="36" fill="currentColor" opacity=".12"/>
  <rect x="376" y="46" width="85" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="418.5" y="69" text-anchor="middle" font-size="12" fill="currentColor">300 K</text>
  <rect x="461" y="46" width="34" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="461" y="46" width="34" height="36" fill="currentColor" opacity=".12"/>
  <rect x="495" y="46" width="125" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="557.5" y="69" text-anchor="middle" font-size="12" fill="currentColor">600 K</text>
  <text x="320" y="26" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">request: 212 K (shaded blocks are in use)</text>
  <polyline points="188.0,122 188.0,86" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="188.0" y="138" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">first fit</text>
  <text x="188.0" y="153" text-anchor="middle" font-size="10" fill="currentColor" class="dim">leaves 288 K</text>
  <polyline points="418.5,122 418.5,86" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="418.5" y="138" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">best fit</text>
  <text x="418.5" y="153" text-anchor="middle" font-size="10" fill="currentColor" class="dim">leaves 88 K</text>
  <polyline points="557.5,122 557.5,86" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="557.5" y="138" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">worst fit</text>
  <text x="557.5" y="153" text-anchor="middle" font-size="10" fill="currentColor" class="dim">leaves 388 K</text>
</svg>
<figcaption>Free holes of 100, 500, 200, 300 and 600 K and a request of 212 K: first fit takes the 500 K hole, best fit the 300 K hole and worst fit the 600 K hole.</figcaption>
</figure>

> **Note.** Both first fit and best fit are better than worst fit in terms of decreasing time and storage utilization. Neither first fit nor best fit is clearly better than the other in storage utilization, but first fit is usually faster.

Both first-fit and best-fit allocation suffer from **external fragmentation**.

#### Fragmentation

As processes are loaded into and removed from memory, the free memory gets broken into small pieces.

<div class="definition">

*External fragmentation* exists when there is enough total free memory to satisfy a request, but the free space is not contiguous: it is split into many small holes, none of which is big enough on its own.

</div>

In the worst case there could be a block of free (wasted) memory between every pair of processes. If all these pieces were one large block, several more processes might fit.

> **Note.** The **50-percent rule**: statistical analysis of first fit shows that, even with some optimization, for every $N$ allocated blocks about another $0.5N$ blocks are lost to fragmentation. That is, roughly **one-third** of memory may be unusable.

**Compaction.** One solution to external fragmentation is **compaction**: shuffle the memory contents so that all free memory is placed together in one large block.

<figure class="fig">
<svg viewBox="0 0 620 190" width="620" role="img" aria-label="Compaction moves the free holes together into one large block">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="30" y="47" text-anchor="middle" font-size="11" fill="currentColor" class="dim">before</text>
  <rect x="60" y="26" width="60" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="26" width="60" height="34" fill="currentColor" opacity=".12"/>
  <text x="90.0" y="48" text-anchor="middle" font-size="12" fill="currentColor">OS</text>
  <rect x="120" y="26" width="80" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="120" y="26" width="80" height="34" fill="currentColor" opacity=".12"/>
  <text x="160.0" y="48" text-anchor="middle" font-size="12" fill="currentColor">P₁</text>
  <rect x="200" y="26" width="60" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="230.0" y="48" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic" class="dim">free</text>
  <rect x="260" y="26" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="26" width="100" height="34" fill="currentColor" opacity=".12"/>
  <text x="310.0" y="48" text-anchor="middle" font-size="12" fill="currentColor">P₂</text>
  <rect x="360" y="26" width="50" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="48" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic" class="dim">free</text>
  <rect x="410" y="26" width="90" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="410" y="26" width="90" height="34" fill="currentColor" opacity=".12"/>
  <text x="455.0" y="48" text-anchor="middle" font-size="12" fill="currentColor">P₃</text>
  <rect x="500" y="26" width="80" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540.0" y="48" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic" class="dim">free</text>
  <polyline points="320,66 320,116" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="330" y="95" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">compaction</text>
  <text x="30" y="145" text-anchor="middle" font-size="11" fill="currentColor" class="dim">after</text>
  <rect x="60" y="124" width="60" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="124" width="60" height="34" fill="currentColor" opacity=".12"/>
  <text x="90.0" y="146" text-anchor="middle" font-size="12" fill="currentColor">OS</text>
  <rect x="120" y="124" width="80" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="120" y="124" width="80" height="34" fill="currentColor" opacity=".12"/>
  <text x="160.0" y="146" text-anchor="middle" font-size="12" fill="currentColor">P₁</text>
  <rect x="200" y="124" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="124" width="100" height="34" fill="currentColor" opacity=".12"/>
  <text x="250.0" y="146" text-anchor="middle" font-size="12" fill="currentColor">P₂</text>
  <rect x="300" y="124" width="90" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="124" width="90" height="34" fill="currentColor" opacity=".12"/>
  <text x="345.0" y="146" text-anchor="middle" font-size="12" fill="currentColor">P₃</text>
  <rect x="390" y="124" width="190" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="485.0" y="146" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic" class="dim">free (one hole)</text>
</svg>
<figcaption>Compaction moves the processes together so the scattered holes become one large hole.</figcaption>
</figure>

Compaction is not always possible, however. If relocation is **static** (done at assembly or load time), the processes cannot be moved, so compaction cannot be done. It is possible only if relocation is **dynamic** and done at execution time: moving a process then only needs its relocation (base) register to be changed. Even then it can be expensive, since the simplest algorithm moves every process towards one end of memory.

Another possible solution to external fragmentation is to permit the **logical address space** of a process to be **non-contiguous**, so that a process can be given physical memory wherever it is available. Segmentation (below) and paging are two techniques that do this.

<div class="definition">

*Internal fragmentation* is memory that is internal to a partition (allocated to a process) but is not used.

</div>

For example, if a hole of 18,464 bytes is used for a request of 18,462 bytes, a hole of 2 bytes would be left, and keeping track of it would cost more than the hole itself. So memory is usually broken into fixed-size blocks and allocated in whole blocks, and the unused part of the last block is internal fragmentation.

#### Segmentation

When writing a program, a programmer thinks of it as a main program together with a set of methods, procedures or functions, and maybe some data structures such as a stack or a symbol table. They do not care which addresses in memory these elements occupy.

<div class="definition">

*Segmentation* is a memory-management scheme that supports this programmer's view of memory. The logical address space is a collection of **segments**; each segment has a name and a length, and an address specifies both the segment and the **offset** within it.

</div>

For simplicity, segments are numbered and referred to by a segment number rather than a name. Thus a logical address consists of a two-tuple:

$$\langle\, \text{segment number},\ \text{offset} \, \rangle$$

Normally, the user program is compiled, and the compiler automatically constructs segments reflecting the input program. A C compiler might create separate segments for:

- the code;
- global variables;
- the heap, from which memory is allocated;
- the stacks used by each thread;
- the standard C library.

(Libraries that are linked in during compile time might be assigned separate segments; the loader takes all these segments and assigns them segment numbers.)

**Segmentation hardware.** The user refers to objects by a two-dimensional address, but physical memory is still a one-dimensional sequence of bytes. The mapping is done by a **segment table**. Each entry has a **segment base**, the starting physical address of the segment in memory, and a **segment limit**, the length of the segment.

<figure class="fig">
<svg viewBox="0 0 620 315" width="620" role="img" aria-label="Segmentation hardware">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="300" y="14" width="100" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="34" width="100" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="54" width="100" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="54" width="100" height="22" fill="currentColor" opacity=".12"/>
  <rect x="300" y="76" width="100" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="96" width="100" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="350" y1="14" x2="350" y2="116" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="325" y="70" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">limit</text>
  <text x="375" y="70" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">base</text>
  <text x="350" y="134" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">segment table</text>
  <path d="M296,14 q-6,0 -6,8 V40 q0,5 -5,5 q5,0 5,5 V68 q0,8 6,8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="277" y="50" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">s</text>
  <rect x="80" y="145" width="70" height="50" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="115.0" y="175.0" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <polyline points="150,170 178,170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="180" y="159" width="60" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="210" y1="159" x2="210" y2="181" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="180" y="159" width="30" height="22" fill="currentColor" opacity=".18"/>
  <rect x="210" y="159" width="30" height="22" fill="#3b82f6" opacity=".28"/>
  <text x="195" y="175" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">s</text>
  <text x="225" y="175" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">d</text>
  <polyline points="195,159 195,45 270,45" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="225,181 225,235 301,235" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polygon points="303,235 325,217 347,235 325,253" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="325" y="240" text-anchor="middle" font-size="14" fill="currentColor">&lt;</text>
  <polyline points="325,76 325,215" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="347,235 414,235" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="372" y="227" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">yes</text>
  <circle cx="430" cy="235" r="15" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="430" y="241" text-anchor="middle" font-size="16" fill="currentColor">+</text>
  <polyline points="400,65 430,65 430,218" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="445,235 498,235" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="500" y="100" width="100" height="190" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="550" y="306" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">physical memory</text>
  <polyline points="325,253 325,288" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="333" y="272" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">no</text>
  <text x="325" y="306" text-anchor="middle" font-size="12" fill="currentColor">trap: addressing error</text>
</svg>
<figcaption>Segmentation hardware (after Galvin, Fig. 8.8): the segment number $s$ (grey) selects an entry of the segment table, the offset $d$ (blue) is checked against its limit, and the physical address is base + $d$.</figcaption>
</figure>

A logical address $(s, d)$ is translated as follows:

1. The segment number $s$ is used as an index into the segment table.
2. The offset $d$ must be between $0$ and the segment limit. If it is not, the hardware traps to the OS (*addressing error*: logical addressing attempt beyond the end of the segment).
3. If the offset is legal, it is added to the segment base to produce the physical address of the desired byte.

The segment table is thus essentially an array of base–limit register pairs.

<figure class="fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Logical view of segmentation, the segment table and physical memory">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="10" y="30" width="210" height="200" rx="14" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="25" y="48" width="85" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="67.5" y="69.0" text-anchor="middle" font-size="11" fill="currentColor">subroutine</text>
  <text x="113" y="82" text-anchor="start" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="125" y="48" width="80" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="165.0" y="69.0" text-anchor="middle" font-size="11" fill="currentColor">stack</text>
  <text x="208" y="82" text-anchor="start" font-size="10" fill="currentColor" class="dim">3</text>
  <rect x="25" y="110" width="70" height="32" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="131.0" text-anchor="middle" font-size="11" fill="currentColor">sqrt</text>
  <text x="98" y="144" text-anchor="start" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="118" y="104" width="88" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="162.0" y="129.0" text-anchor="middle" font-size="11" fill="currentColor">symbol table</text>
  <text x="209" y="146" text-anchor="start" font-size="10" fill="currentColor" class="dim">4</text>
  <rect x="65" y="172" width="100" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="115.0" y="197.0" text-anchor="middle" font-size="11" fill="currentColor">main program</text>
  <text x="168" y="214" text-anchor="start" font-size="10" fill="currentColor" class="dim">2</text>
  <text x="115" y="252" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">logical address space</text>
  <text x="260" y="52" text-anchor="middle" font-size="1" fill="currentColor"></text>
  <rect x="270" y="40" width="120" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="330" y1="40" x2="330" y2="182" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300" y="56" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">limit</text>
  <text x="360" y="56" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">base</text>
  <rect x="270" y="62" width="120" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260" y="78" text-anchor="middle" font-size="11" fill="currentColor" class="dim">0</text>
  <text x="300" y="78" text-anchor="middle" font-size="12" fill="currentColor">1000</text>
  <text x="360" y="78" text-anchor="middle" font-size="12" fill="currentColor">1400</text>
  <rect x="270" y="86" width="120" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260" y="102" text-anchor="middle" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="300" y="102" text-anchor="middle" font-size="12" fill="currentColor">400</text>
  <text x="360" y="102" text-anchor="middle" font-size="12" fill="currentColor">6300</text>
  <rect x="270" y="110" width="120" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260" y="126" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="300" y="126" text-anchor="middle" font-size="12" fill="currentColor">400</text>
  <text x="360" y="126" text-anchor="middle" font-size="12" fill="currentColor">4300</text>
  <rect x="270" y="134" width="120" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260" y="150" text-anchor="middle" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="300" y="150" text-anchor="middle" font-size="12" fill="currentColor">1100</text>
  <text x="360" y="150" text-anchor="middle" font-size="12" fill="currentColor">3200</text>
  <rect x="270" y="158" width="120" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260" y="174" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4</text>
  <text x="300" y="174" text-anchor="middle" font-size="12" fill="currentColor">1000</text>
  <text x="360" y="174" text-anchor="middle" font-size="12" fill="currentColor">4700</text>
  <text x="330" y="204" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">segment table</text>
  <rect x="480" y="30" width="120" height="50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540.0" y="59" text-anchor="middle" font-size="11" fill="currentColor">segment 0</text>
  <rect x="480" y="80" width="120" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="80" width="120" height="40" fill="currentColor" opacity=".12"/>
  <rect x="480" y="120" width="120" height="55" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540.0" y="152" text-anchor="middle" font-size="11" fill="currentColor">segment 3</text>
  <rect x="480" y="175" width="120" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540.0" y="189" text-anchor="middle" font-size="11" fill="currentColor">segment 2</text>
  <rect x="480" y="195" width="120" height="50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540.0" y="224" text-anchor="middle" font-size="11" fill="currentColor">segment 4</text>
  <rect x="480" y="245" width="120" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="245" width="120" height="30" fill="currentColor" opacity=".12"/>
  <rect x="480" y="275" width="120" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540.0" y="289" text-anchor="middle" font-size="11" fill="currentColor">segment 1</text>
  <text x="472" y="34" text-anchor="end" font-size="10" fill="currentColor" class="dim">1400</text>
  <text x="472" y="84" text-anchor="end" font-size="10" fill="currentColor" class="dim">2400</text>
  <text x="472" y="124" text-anchor="end" font-size="10" fill="currentColor" class="dim">3200</text>
  <text x="472" y="179" text-anchor="end" font-size="10" fill="currentColor" class="dim">4300</text>
  <text x="472" y="199" text-anchor="end" font-size="10" fill="currentColor" class="dim">4700</text>
  <text x="472" y="249" text-anchor="end" font-size="10" fill="currentColor" class="dim">5700</text>
  <text x="472" y="279" text-anchor="end" font-size="10" fill="currentColor" class="dim">6300</text>
  <text x="472" y="299" text-anchor="end" font-size="10" fill="currentColor" class="dim">6700</text>
  <text x="540.0" y="318" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">physical memory</text>
</svg>
<figcaption>Example of segmentation (after Galvin, Fig. 8.9): five segments of a program stored in physical memory, with segment 2 at 4300–4700, segment 3 at 3200–4300, and so on.</figcaption>
</figure>

<div class="example">

Using the segment table above:

</div>

- Byte 53 of segment 2 is mapped to $4300 + 53 = 4353$.
- Byte 852 of segment 3 is mapped to $3200 + 852 = 4052$.
- A reference to byte 1222 of segment 0 results in a trap to the OS, since segment 0 is only 1000 bytes long.

> **Note.** Since segments have different lengths and are allocated contiguously, segmentation can still suffer from **external fragmentation**; it simply moves the problem from whole processes to individual segments. Paging avoids it by using fixed-size blocks.

#### Paging

Segmentation still lets a process be placed non-contiguously, but each segment must be contiguous, so external fragmentation remains. **Paging** avoids external fragmentation and the need for compaction.

<div class="definition">

In *paging*, the logical address space is divided into fixed-size blocks called **pages**, and physical memory is divided into fixed-size blocks of the **same size** called **frames**. A **page table** maps each page to the frame that holds it.

</div>

<figure class="fig">
<svg viewBox="0 0 600 344" width="600" role="img" aria-label="Paging model of logical and physical memory">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="30" y="40" width="90" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="75.0" y="67.0" text-anchor="middle" font-size="12" fill="currentColor">page 0</text>
  <text x="18" y="67" text-anchor="end" font-size="11" fill="currentColor" class="dim">0</text>
  <rect x="30" y="84" width="90" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="75.0" y="111.0" text-anchor="middle" font-size="12" fill="currentColor">page 1</text>
  <text x="18" y="111" text-anchor="end" font-size="11" fill="currentColor" class="dim">1</text>
  <rect x="30" y="128" width="90" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="75.0" y="155.0" text-anchor="middle" font-size="12" fill="currentColor">page 2</text>
  <text x="18" y="155" text-anchor="end" font-size="11" fill="currentColor" class="dim">2</text>
  <rect x="30" y="172" width="90" height="44" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="75.0" y="199.0" text-anchor="middle" font-size="12" fill="currentColor">page 3</text>
  <text x="18" y="199" text-anchor="end" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="75" y="28" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">logical memory</text>
  <rect x="210" y="62" width="50" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235" y="84" text-anchor="middle" font-size="13" fill="currentColor">1</text>
  <text x="200" y="84" text-anchor="end" font-size="11" fill="currentColor" class="dim">0</text>
  <polyline points="120,62 206,79" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="210" y="96" width="50" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235" y="118" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="200" y="118" text-anchor="end" font-size="11" fill="currentColor" class="dim">1</text>
  <polyline points="120,106 206,113" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="210" y="130" width="50" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235" y="152" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="200" y="152" text-anchor="end" font-size="11" fill="currentColor" class="dim">2</text>
  <polyline points="120,150 206,147" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="210" y="164" width="50" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235" y="186" text-anchor="middle" font-size="13" fill="currentColor">7</text>
  <text x="200" y="186" text-anchor="end" font-size="11" fill="currentColor" class="dim">3</text>
  <polyline points="120,194 206,181" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="235" y="50" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">page table</text>
  <rect x="420" y="20" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540" y="43" text-anchor="start" font-size="11" fill="currentColor" class="dim">0</text>
  <rect x="420" y="56" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="56" width="110" height="36" fill="currentColor" opacity=".12"/>
  <text x="475" y="79" text-anchor="middle" font-size="12" fill="currentColor">page 0</text>
  <text x="540" y="79" text-anchor="start" font-size="11" fill="currentColor" class="dim">1</text>
  <rect x="420" y="92" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540" y="115" text-anchor="start" font-size="11" fill="currentColor" class="dim">2</text>
  <rect x="420" y="128" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="128" width="110" height="36" fill="currentColor" opacity=".12"/>
  <text x="475" y="151" text-anchor="middle" font-size="12" fill="currentColor">page 2</text>
  <text x="540" y="151" text-anchor="start" font-size="11" fill="currentColor" class="dim">3</text>
  <rect x="420" y="164" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="164" width="110" height="36" fill="currentColor" opacity=".12"/>
  <text x="475" y="187" text-anchor="middle" font-size="12" fill="currentColor">page 1</text>
  <text x="540" y="187" text-anchor="start" font-size="11" fill="currentColor" class="dim">4</text>
  <rect x="420" y="200" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540" y="223" text-anchor="start" font-size="11" fill="currentColor" class="dim">5</text>
  <rect x="420" y="236" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540" y="259" text-anchor="start" font-size="11" fill="currentColor" class="dim">6</text>
  <rect x="420" y="272" width="110" height="36" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="272" width="110" height="36" fill="currentColor" opacity=".12"/>
  <text x="475" y="295" text-anchor="middle" font-size="12" fill="currentColor">page 3</text>
  <text x="540" y="295" text-anchor="start" font-size="11" fill="currentColor" class="dim">7</text>
  <polyline points="260,79 416,74" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="260,113 416,182" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="260,147 416,146" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="260,181 416,290" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="475" y="334" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">physical memory (frames)</text>
</svg>
<figcaption>Paging model (after Galvin, Fig. 8.12): any page can go in any free frame, so a process no longer needs one contiguous region.</figcaption>
</figure>

Every logical address is split into a **page number** $p$, which indexes the page table, and a **page offset** $d$, which is copied unchanged into the physical address. With a logical address space of $2^m$ and a page size of $2^n$, the high $m - n$ bits are the page number and the low $n$ bits are the offset.

> **Note.** Paging has **no external fragmentation**, since any free frame can be used. It can have **internal fragmentation**: the last page of a process is usually not completely full.

##### Size of the Page Table

But what will be the size of the page table? Take a 32-bit machine with 4-byte (32-bit) page-table entries.

<figure class="fig">
<svg viewBox="0 0 360 204" width="360" role="img" aria-label="A page table with one entry per byte">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="180" y="20" width="120" height="38" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240" y="44" text-anchor="middle" font-size="13" fill="currentColor">0x100</text>
  <text x="170" y="44" text-anchor="end" font-size="12" fill="currentColor">0</text>
  <rect x="180" y="58" width="120" height="38" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240" y="82" text-anchor="middle" font-size="13" fill="currentColor">⋮</text>
  <text x="170" y="82" text-anchor="end" font-size="12" fill="currentColor">1</text>
  <rect x="180" y="96" width="120" height="38" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240" y="120" text-anchor="middle" font-size="13" fill="currentColor">⋮</text>
  <text x="170" y="120" text-anchor="end" font-size="12" fill="currentColor">⋮</text>
  <rect x="180" y="134" width="120" height="38" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240" y="158" text-anchor="middle" font-size="13" fill="currentColor">0xFFF</text>
  <text x="170" y="158" text-anchor="end" font-size="12" fill="currentColor">2³² − 1</text>
  <polyline points="70,39 130,39" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="60" y="44" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">VA</text>
  <text x="240" y="194" text-anchor="middle" font-size="12" fill="currentColor" class="dim">2³² entries × 4 B = 16 GB</text>
</svg>
<figcaption>Mapping every byte: one page-table entry for each of the 2³² virtual addresses.</figcaption>
</figure>

- **If we map every byte:** $2^{32}$ entries, each $32$ bits, so

$$\text{page table size} = 2^{32} \times 4\,\text{B} = 16\,\text{GB} \quad \text{(per process!)}$$

  which is far too big.
- **If we map each word (4 B):** $2^{30}$ entries $\times\ 4\,\text{B} = 4\,\text{GB}$, still too big.
- **If we map each 256 B unit:** $2^{24}$ entries $\times\ 4\,\text{B} = 64\,\text{MB}$.

The size of the page table can be **reduced by using a larger page size**, but this also **increases internal fragmentation** (more unused space in the last page).

> **Note.** In general, with a $2^m$-byte address space, $2^n$-byte pages and $e$-byte entries, a flat page table has $2^{m-n}$ entries and takes $2^{m-n} \cdot e$ bytes. Typical page sizes today are 4 KB to 8 KB (with larger "huge pages" also supported).

##### Implementation of Address Translation

- The **memory management unit (MMU)** is the part of the CPU that does address translation.
- **Recall the problem of page size:** with 32-bit addresses and a 256 B page size, the page table is 64 MB (per process). It can be stored in memory, but then, to translate a virtual address, the MMU has to **read the relevant page-table entry out of memory** first.
- The hardware must provide page-table entries **faster than that** (most of the time), so it keeps some of them inside the MMU.

##### Translation Look-aside Buffer (TLB)

<div class="definition">

The *translation look-aside buffer (TLB)* is a small, fast memory in the MMU that contains **some page-table entries** that are likely to be needed soon.

</div>

- If the required page-table entry is present in the TLB (a **TLB hit**), the MMU can do the translation fast.
- Otherwise it is a **TLB miss**: the entry must be fetched from the page table in memory (and added to the TLB). A TLB miss must be handled, possibly like the OS handles a page fault.

<figure class="fig">
<svg viewBox="0 0 700 345" width="700" role="img" aria-label="Paging hardware with a translation look-aside buffer">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="40" width="60" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50.0" y="65.0" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <rect x="110" y="48" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="110" y="48" width="30" height="24" fill="#ef4444" opacity=".22"/>
  <text x="125.0" y="65.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">p</text>
  <rect x="140" y="48" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="155.0" y="65.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">d</text>
  <polyline points="80,60 106,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="140" y="126" text-anchor="middle" font-size="11" fill="currentColor" class="dim">logical address</text>
  <text x="295" y="24" text-anchor="middle" font-size="10" fill="currentColor" class="dim">page no.</text>
  <text x="365" y="24" text-anchor="middle" font-size="10" fill="currentColor" class="dim">frame no.</text>
  <rect x="260" y="30" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="30" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="52" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="52" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="74" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="74" width="70" height="22" fill="#ef4444" opacity=".22"/>
  <rect x="330" y="74" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="74" width="70" height="22" fill="#3b82f6" opacity=".25"/>
  <rect x="260" y="96" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="96" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="118" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="118" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="140" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="140" width="70" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="295" y="90" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">p</text>
  <text x="365" y="90" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">f</text>
  <text x="330" y="180" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">TLB</text>
  <polyline points="125,72 125,100 256,100" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="215" y="94" text-anchor="middle" font-size="10" fill="currentColor" class="dim">search</text>
  <polyline points="400,85 485,85 485,148" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="445" y="79" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">TLB hit</text>
  <polyline points="155,48 155,8 515,8 515,148" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <rect x="470" y="150" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="470" y="150" width="30" height="24" fill="#3b82f6" opacity=".25"/>
  <text x="485.0" y="167.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">f</text>
  <rect x="500" y="150" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="515.0" y="167.0" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">d</text>
  <text x="505" y="196" text-anchor="middle" font-size="11" fill="currentColor" class="dim">physical address</text>
  <circle cx="190" cy="100" r="2.6" fill="currentColor"/>
  <polyline points="190,100 190,255 256,255" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="196" y="230" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">TLB miss</text>
  <rect x="260" y="200" width="140" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="222" width="140" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="244" width="140" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="244" width="140" height="22" fill="#3b82f6" opacity=".25"/>
  <rect x="260" y="266" width="140" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="288" width="140" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330" y="260" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">f</text>
  <text x="330" y="328" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">page table (in memory)</text>
  <polyline points="400,255 445,255 445,162 466,162" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="590" y="60" width="90" height="250" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="635" y="330" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">physical memory</text>
  <polyline points="530,162 586,162" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
</svg>
<figcaption>Paging hardware with a TLB (after Galvin, Fig. 8.14). The page number $p$ is looked up in the TLB; on a hit the frame number $f$ comes straight from the TLB, on a miss it comes from the page table in memory. The offset $d$ is copied unchanged.</figcaption>
</figure>

- Some TLBs allow entries to be **wired down**, meaning that they cannot be removed from the TLB. Typically, TLB entries for **kernel code** are wired down.
- Some TLBs store **address-space identifiers (ASIDs)** in each TLB entry. An ASID uniquely identifies each process and is used to provide address-space protection for that process.
  - When the TLB attempts to resolve virtual page numbers, it ensures that the ASID for the currently running process matches the ASID associated with the virtual page. If the ASIDs do not match, the attempt is treated as a **TLB miss**.
  - This allows the TLB to contain entries for **several different processes** simultaneously.
  - If the TLB does not support separate ASIDs, then every time a new page table is selected (on a context switch), the TLB must be **flushed** (erased) to ensure that the next running process does not use the wrong translation information.

##### Effective Memory-Access Time

Let $h$ be the TLB **hit ratio**, $T_A$ the TLB access (search) time and $M_A$ the memory-access time.

$$
\begin{aligned}
\text{TLB hit time} &= T_A + M_A && \text{(get the page from memory)} \\
\text{TLB miss time} &= T_A + M_A + M_A && \text{(get the page-table entry, then the page)}
\end{aligned}
$$

$$\text{EMAT} = h\,(T_A + M_A) + (1 - h)\,(T_A + 2M_A)$$

Simplifying, we can get

$$\text{EMAT} = \underbrace{T_A}_{\text{access TLB}} + \underbrace{M_A}_{\text{get the page from memory}} + \underbrace{(1 - h)\,M_A}_{\text{extra access to the page table on a miss}}$$

<div class="example">

With $M_A = 100$ ns, a hit ratio of 80%, and $T_A$ negligible: $\text{EMAT} = 0.8 \times 100 + 0.2 \times 200 = 120$ ns, a 20% slowdown over a single memory access. With a 99% hit ratio, $\text{EMAT} = 0.99 \times 100 + 0.01 \times 200 = 101$ ns, only a 1% slowdown.

</div>

#### Multi-Level Paging

A flat page table has one entry for every page of the **virtual** address space, used or not:

- 32-bit virtual address: several MB per process.
- 64-bit virtual address: far too big.

Yet a process uses only a small part of its address space: code, data and heap at the bottom, the stack at the top, and many terabytes unused in between. *Multi-level page tables* use bits of the virtual address to index a tree of smaller tables, and simply leave out the tables for the unused regions.

<figure class="fig">
<svg viewBox="0 0 460 286" width="460" role="img" aria-label="Sparse virtual address space: code, data and heap at the bottom, the stack at the top">
  <defs><marker id="arr-vas" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="80" y="14" width="150" height="262" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="80" y="14" width="150" height="26" fill="#3b82f6" opacity=".18"/>
  <line x1="80" y1="40" x2="230" y2="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="155" y="31" text-anchor="middle" font-size="12" fill="currentColor">code</text>
  <rect x="80" y="40" width="150" height="26" fill="#3b82f6" opacity=".18"/>
  <line x1="80" y1="66" x2="230" y2="66" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="155" y="57" text-anchor="middle" font-size="12" fill="currentColor">data</text>
  <rect x="80" y="66" width="150" height="26" fill="#3b82f6" opacity=".18"/>
  <line x1="80" y1="92" x2="230" y2="92" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="155" y="83" text-anchor="middle" font-size="12" fill="currentColor">heap</text>
  <polyline points="155,96 155,116" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-vas)"/>
  <rect x="80" y="250" width="150" height="26" fill="#3b82f6" opacity=".18"/>
  <line x1="80" y1="250" x2="230" y2="250" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="155" y="267" text-anchor="middle" font-size="12" fill="currentColor">stack</text>
  <polyline points="155,246 155,226" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-vas)"/>
  <text x="70" y="20" text-anchor="end" font-size="11" fill="currentColor">0</text>
  <text x="70" y="278" text-anchor="end" font-size="11" fill="currentColor">2⁶⁴ − 1</text>
  <path d="M240,14 h8 v78 h-8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="256" y="57" text-anchor="start" font-size="12" fill="currentColor">used</text>
  <path d="M240,98 h8 v146 h-8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="256" y="166" text-anchor="start" font-size="12" fill="#ef4444">many terabytes unused:</text>
  <text x="256" y="182" text-anchor="start" font-size="12" fill="currentColor" class="dim">no page-table entries needed</text>
  <path d="M240,250 h8 v26 h-8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="256" y="267" text-anchor="start" font-size="12" fill="currentColor">used</text>
</svg>
<figcaption>A typical virtual address space: code, data and heap grow from the bottom, the stack from the top, and the gap between them is never used.</figcaption>
</figure>

##### Structure

The page number is split into an **outer** and an **inner** part. The outer part indexes the *outer page table*, whose entry gives the location of an *inner page table*; the inner part indexes that table, whose entry gives the frame number. In other words, the page table itself is paged.

<figure class="fig">
<svg viewBox="0 0 560 236" width="560" role="img" aria-label="Address translation with a two-level page table">
  <defs><marker id="arr-mlp" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="95" y="12" text-anchor="middle" font-size="11" fill="currentColor" class="dim">logical address</text>
  <rect x="20" y="20" width="50" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="45" y="37" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₁</text>
  <rect x="70" y="20" width="50" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95" y="37" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₂</text>
  <rect x="120" y="20" width="50" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="145" y="37" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">d</text>
  <rect x="20" y="20" width="50" height="24" fill="#ef4444" opacity=".22"/>
  <rect x="70" y="20" width="50" height="24" fill="#22c55e" opacity=".22"/>
  <rect x="110" y="80" width="80" height="110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="110" y="120" width="80" height="20" fill="#ef4444" opacity=".22"/>
  <line x1="110" y1="120" x2="190" y2="120" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="110" y1="140" x2="190" y2="140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="102" y="134" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">p₁</text>
  <text x="150" y="208" text-anchor="middle" font-size="11" fill="currentColor" class="dim">outer page table</text>
  <polyline points="45,44 45,130 108,130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mlp)"/>
  <rect x="270" y="100" width="80" height="110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="270" y="150" width="80" height="20" fill="#22c55e" opacity=".22"/>
  <line x1="270" y1="150" x2="350" y2="150" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="270" y1="170" x2="350" y2="170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="262" y="164" text-anchor="end" font-size="11" fill="currentColor" font-style="italic">p₂</text>
  <text x="310" y="228" text-anchor="middle" font-size="11" fill="currentColor" class="dim">inner page table</text>
  <polyline points="190,130 230,130 230,110 268,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mlp)"/>
  <polyline points="95,44 95,60 240,60 240,160 268,160" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#arr-mlp)"/>
  <rect x="440" y="150" width="50" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="465" y="167" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">f</text>
  <rect x="490" y="150" width="50" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="515" y="167" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">d</text>
  <rect x="440" y="150" width="50" height="24" fill="#3b82f6" opacity=".25"/>
  <text x="490" y="196" text-anchor="middle" font-size="11" fill="currentColor" class="dim">physical address</text>
  <polyline points="350,162 436,162" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mlp)"/>
  <text x="393" y="155" text-anchor="middle" font-size="10" fill="currentColor" class="dim">frame no.</text>
  <polyline points="145,20 145,6 515,6 515,146" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#arr-mlp)"/>
</svg>
<figcaption>Two-level address translation (after Galvin, Fig. 8.18). $p_1$ selects an entry of the outer page table, which points to an inner page table; $p_2$ selects the entry there that holds the frame number $f$. The offset $d$ is copied unchanged.</figcaption>
</figure>

Because translation works from the outer table inward, this is also called a *forward-mapped page table*. An outer entry whose region is unused is marked invalid, and its inner table is **not stored at all**. That is where the saving comes from.

<figure class="fig">
<svg viewBox="0 0 520 296" width="520" role="img" aria-label="Two-level page table in which the inner tables for unused regions are not stored">
  <defs><marker id="arr-2lx" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="14" width="34" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="37.0" y="30" text-anchor="middle" font-size="11" fill="currentColor">2 b</text>
  <rect x="54" y="14" width="34" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="71.0" y="30" text-anchor="middle" font-size="11" fill="currentColor">2 b</text>
  <rect x="88" y="14" width="70" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="123.0" y="30" text-anchor="middle" font-size="11" fill="currentColor">offset</text>
  <polyline points="37,38 37,70 135,70 135,97" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-2lx)"/>
  <rect x="110" y="100" width="50" height="80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="110" y1="120" x2="160" y2="120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="110" y1="140" x2="160" y2="140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="110" y1="160" x2="160" y2="160" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="102" y="114" text-anchor="end" font-size="11" fill="currentColor" class="dim">0</text>
  <text x="102" y="134" text-anchor="end" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="102" y="154" text-anchor="end" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="102" y="174" text-anchor="end" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="135" y="155" text-anchor="middle" font-size="13" fill="#ef4444">×</text>
  <text x="135" y="175" text-anchor="middle" font-size="13" fill="#ef4444">×</text>
  <text x="135" y="200" text-anchor="middle" font-size="11" fill="currentColor" class="dim">outer page table</text>
  <rect x="300" y="14" width="60" height="56" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300" y1="28" x2="360" y2="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300" y1="42" x2="360" y2="42" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300" y1="56" x2="360" y2="56" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="80" width="60" height="56" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300" y1="94" x2="360" y2="94" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300" y1="108" x2="360" y2="108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300" y1="122" x2="360" y2="122" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="300" y="146" width="60" height="56" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="160" x2="360" y2="160" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="174" x2="360" y2="174" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="188" x2="360" y2="188" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="146" x2="360" y2="202" stroke="#ef4444" stroke-width="1.5"/>
  <line x1="360" y1="146" x2="300" y2="202" stroke="#ef4444" stroke-width="1.5"/>
  <rect x="300" y="212" width="60" height="56" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="226" x2="360" y2="226" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="240" x2="360" y2="240" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="254" x2="360" y2="254" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <line x1="300" y1="212" x2="360" y2="268" stroke="#ef4444" stroke-width="1.5"/>
  <line x1="360" y1="212" x2="300" y2="268" stroke="#ef4444" stroke-width="1.5"/>
  <polyline points="150,110 210,110 210,42 297,42" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-2lx)"/>
  <polyline points="150,130 230,130 230,108 297,108" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-2lx)"/>
  <circle cx="340" cy="101" r="2.4" fill="#22c55e"/>
  <polyline points="340,101 400,101" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-2lx)"/>
  <text x="406" y="105" text-anchor="start" font-size="11" fill="#22c55e">frame no.</text>
  <text x="330" y="284" text-anchor="middle" font-size="11" fill="currentColor" class="dim">inner page tables</text>
  <text x="370" y="172" text-anchor="start" font-size="11" fill="#ef4444">not stored:</text>
  <text x="370" y="187" text-anchor="start" font-size="11" fill="currentColor" class="dim">regions 2 and 3 unused</text>
</svg>
<figcaption>A small two-level example (2-bit outer index, 2-bit inner index). Outer entries 2 and 3 cover unused regions, so they are invalid and their inner tables are not stored.</figcaption>
</figure>

##### Two-Level Example

<div class="example">

A system has a 32-bit address space, 4 KB pages and 8 B page-table entries. A program uses only a small region near address $\texttt{0x0001\,0000}$ and the region $\texttt{0xFFFF\,0000}$–$\texttt{0xFFFF\,FFFF}$. Compare a flat page table with a two-level one.

</div>

**Flat.** There are $2^{32} / 2^{12} = 2^{20}$ pages, so the table is $2^{20} \times 8\text{ B} = 8$ MB.

**Two-level.** Split the 20-bit page number into two 10-bit parts, so that every table has $2^{10} = 1024$ entries:

<figure class="fig">
<svg viewBox="0 0 560 68" width="560" role="img" aria-label="32-bit address split for two-level paging">
  <defs><marker id="arr-sp2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="88" y="18" width="120" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="148.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₁</text>
  <text x="148.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">10 bits</text>
  <rect x="208" y="18" width="120" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₂</text>
  <text x="268.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">10 bits</text>
  <rect x="328" y="18" width="144" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">offset d</text>
  <text x="400.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">12 bits</text>
</svg>
<figcaption>32-bit address for two-level paging with 4 KB pages.</figcaption>
</figure>

- The outer page table has 1024 entries: $2^{10} \times 8\text{ B} = 8$ KB.
- Each inner table covers $2^{10}$ pages $= 4$ MB of address space. The two used regions fall in outer entries 0 and 1023, so only **two** inner tables are needed: $2 \times 2^{10} \times 8\text{ B} = 16$ KB.

<figure class="fig">
<svg viewBox="0 0 620 206" width="620" role="img" aria-label="Two-level page table for the 32-bit example: only outer entries 0 and 1023 are used">
  <defs><marker id="arr-32" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="40" y="20" width="90" height="132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="40" y1="42" x2="130" y2="42" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="40" y1="64" x2="130" y2="64" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="40" y1="86" x2="130" y2="86" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="40" y1="108" x2="130" y2="108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="40" y1="130" x2="130" y2="130" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="32" y="36" text-anchor="end" font-size="11" fill="currentColor" class="dim">0</text>
  <text x="32" y="58" text-anchor="end" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="32" y="80" text-anchor="end" font-size="11" fill="currentColor" class="dim">⋮</text>
  <text x="32" y="102" text-anchor="end" font-size="11" fill="currentColor" class="dim">⋮</text>
  <text x="32" y="124" text-anchor="end" font-size="11" fill="currentColor" class="dim">1022</text>
  <text x="32" y="146" text-anchor="end" font-size="11" fill="currentColor" class="dim">1023</text>
  <text x="85" y="58" text-anchor="middle" font-size="13" fill="#ef4444">×</text>
  <text x="85" y="80" text-anchor="middle" font-size="13" fill="#ef4444">×</text>
  <text x="85" y="102" text-anchor="middle" font-size="13" fill="#ef4444">×</text>
  <text x="85" y="124" text-anchor="middle" font-size="13" fill="#ef4444">×</text>
  <text x="85" y="176" text-anchor="middle" font-size="11" fill="currentColor">outer: 2¹⁰ × 8 B = 8 KB</text>
  <rect x="250" y="10" width="90" height="72" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="250" y1="28" x2="340" y2="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="250" y1="46" x2="340" y2="46" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="250" y1="64" x2="340" y2="64" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="104" width="90" height="72" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="250" y1="122" x2="340" y2="122" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="250" y1="140" x2="340" y2="140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="250" y1="158" x2="340" y2="158" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="110,31 180,31 180,46 247,46" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-32)"/>
  <polyline points="110,141 180,141 180,140 247,140" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-32)"/>
  <text x="350" y="50" text-anchor="start" font-size="11" fill="currentColor" class="dim">inner table for 0x0000 0000 – 0x003F FFFF</text>
  <text x="350" y="144" text-anchor="start" font-size="11" fill="currentColor" class="dim">inner table for 0xFFC0 0000 – 0xFFFF FFFF</text>
  <text x="295" y="196" text-anchor="middle" font-size="11" fill="currentColor">2 inner tables: 2 × 2¹⁰ × 8 B = 16 KB</text>
</svg>
<figcaption>The two-level table of the example: of the 1024 outer entries only 0 and 1023 are valid, so only two inner tables exist.</figcaption>
</figure>

$$\text{Total} = 8\text{ KB} + 16\text{ KB} = 24\text{ KB} \quad\text{instead of } 8\text{ MB}$$

##### Four-Level Example

<div class="example">

A system has a 64-bit address space, 64 KB pages ($2^{16}$) and 8 B page-table entries, with the page number split equally over 4 levels. A program uses only addresses $0$ to $4$ GB. Compare a flat page table with the 4-level one.

</div>

**Flat.** There are $2^{64} / 2^{16} = 2^{48}$ entries, so the table is $2^{48} \times 8\text{ B} = 2^{51}$ B, about 2 PB.

**Four-level.** The 48-bit page number is split into four 12-bit parts, so every table has $2^{12}$ entries and is $2^{12} \times 8\text{ B} = 32$ KB:

<figure class="fig">
<svg viewBox="0 0 560 68" width="560" role="img" aria-label="64-bit address split for four-level paging">
  <defs><marker id="arr-sp4" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="56" y="18" width="84" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="98.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₁</text>
  <text x="98.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">12 bits</text>
  <rect x="140" y="18" width="84" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="182.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₂</text>
  <text x="182.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">12 bits</text>
  <rect x="224" y="18" width="84" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="266.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₃</text>
  <text x="266.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">12 bits</text>
  <rect x="308" y="18" width="84" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">p₄</text>
  <text x="350.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">12 bits</text>
  <rect x="392" y="18" width="112" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="448.0" y="36" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">offset d</text>
  <text x="448.0" y="60" text-anchor="middle" font-size="11" fill="currentColor" class="dim">16 bits</text>
</svg>
<figcaption>64-bit address for four-level paging with 64 KB pages.</figcaption>
</figure>

- The program uses $2^{32} / 2^{16} = 2^{16}$ pages.
- One last-level table ($P_4$) holds $2^{12}$ pages, so we need $2^{16} / 2^{12} = 2^4 = 16$ of them.
- One $P_3$ table can point to $2^{12}$ $P_4$ tables, so a single $P_3$ table is enough, and likewise a single $P_2$ and a single $P_1$ table.

<figure class="fig">
<svg viewBox="0 0 500 176" width="500" role="img" aria-label="Four-level page table for the 64-bit example: one table at each of the first three levels and sixteen at the last">
  <defs><marker id="arr-4l" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="20" width="70" height="80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="20" y1="40" x2="90" y2="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="20" y1="60" x2="90" y2="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="20" y1="80" x2="90" y2="80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="55" y="120" text-anchor="middle" font-size="12" fill="currentColor">1 × P₁</text>
  <rect x="140" y="20" width="70" height="80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="140" y1="40" x2="210" y2="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="140" y1="60" x2="210" y2="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="140" y1="80" x2="210" y2="80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175" y="120" text-anchor="middle" font-size="12" fill="currentColor">1 × P₂</text>
  <rect x="260" y="20" width="70" height="80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="260" y1="40" x2="330" y2="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="260" y1="60" x2="330" y2="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="260" y1="80" x2="330" y2="80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="295" y="120" text-anchor="middle" font-size="12" fill="currentColor">1 × P₃</text>
  <polyline points="80,30 137,30" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-4l)"/>
  <polyline points="200,30 257,30" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-4l)"/>
  <rect x="420" y="10" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="40" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="70" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="437" y="85" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
  <rect x="420" y="100" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="320,30 400,30 400,21 417,21" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-4l)"/>
  <polyline points="320,50 400,50 400,51 417,51" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-4l)"/>
  <polyline points="320,70 400,70 400,111 417,111" stroke="#22c55e" stroke-width="1.5" fill="none" marker-end="url(#arr-4l)"/>
  <text x="437" y="140" text-anchor="middle" font-size="12" fill="currentColor">16 × P₄</text>
  <text x="250" y="166" text-anchor="middle" font-size="11" fill="currentColor" class="dim">every table: 2¹² × 8 B = 32 KB, so (1 + 1 + 1 + 16) × 32 KB = 608 KB</text>
</svg>
<figcaption>The four-level table of the example: one table at each of the first three levels, and sixteen at the last.</figcaption>
</figure>

$$\text{Total} = (1 + 1 + 1 + 16) \times 32\text{ KB} = 608\text{ KB} \quad\text{instead of } 2^{51}\text{ B}$$

The saving is huge for a sparse address space. For a process that really used its whole address space, a multi-level table would be slightly *larger* than a flat one, because the upper levels come on top.

##### Effective Memory-Access Time with $L$ Levels

The price is time: on a TLB miss, the MMU now has to read **one entry per level** before it can fetch the data.

$$
\begin{aligned}
\text{TLB hit} &= T_A + M_A && \text{(get the page from memory)} \\
\text{TLB miss} &= T_A + L \cdot M_A + M_A && \text{(walk all } L \text{ levels, then get the page)}
\end{aligned}
$$

$$\text{EMAT} = h\,(T_A + M_A) + (1 - h)\,\big(T_A + (L + 1)\,M_A\big)$$

With $L = 1$ this is the formula for a flat page table above. A high TLB hit ratio is what makes deep page tables affordable.

#### Hashed Page Tables

For 64-bit addresses even a hierarchy gets deep. With 4 KB pages and 1024-entry inner tables, a two-level split leaves a 42-bit outer index, i.e. an outer table of $2^{42}$ entries; paging that again still leaves $2^{34}$ bytes (16 GB) at the top. The 64-bit UltraSPARC would need **seven** levels, i.e. seven memory accesses per TLB miss, so for 64-bit architectures hierarchical page tables are generally considered inappropriate.

A common alternative for address spaces larger than 32 bits is a *hashed page table*: the virtual page number is hashed, and each entry of the hash table holds a **linked list** of the pages that hash to it (to handle collisions). Each list element has three fields:

1. the virtual page number,
2. the frame number it maps to,
3. a pointer to the next element.

To translate, hash the virtual page number $p$ and walk the list of that entry, comparing $p$ with field 1. On a match, field 2 gives the frame $r$, and the physical address is $(r, d)$.

<figure class="fig">
<svg viewBox="0 0 540 256" width="540" role="img" aria-label="Hashed page table">
  <defs><marker id="arr-hpt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="56" y="62" text-anchor="start" font-size="10" fill="currentColor" class="dim">logical address</text>
  <rect x="35" y="22" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="35" y="22" width="30" height="24" fill="#ef4444" opacity=".25"/>
  <text x="50.0" y="38" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">p</text>
  <rect x="65" y="22" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="80.0" y="38" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">d</text>
  <polyline points="50,46 50,118" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-hpt)"/>
  <ellipse cx="50" cy="140" rx="40" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50" y="136" text-anchor="middle" font-size="11" fill="currentColor">hash</text>
  <text x="50" y="149" text-anchor="middle" font-size="11" fill="currentColor">function</text>
  <rect x="130" y="60" width="50" height="170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="130" y="130" width="50" height="20" fill="#ef4444" opacity=".22"/>
  <line x1="130" y1="130" x2="180" y2="130" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="130" y1="150" x2="180" y2="150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="90,140 127,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-hpt)"/>
  <text x="155" y="248" text-anchor="middle" font-size="11" fill="currentColor" class="dim">hash table</text>
  <polyline points="180,140 216,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-hpt)"/>
  <rect x="220" y="128" width="26" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="233.0" y="144" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">q</text>
  <rect x="246" y="128" width="26" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="259.0" y="144" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">s</text>
  <rect x="272" y="128" width="26" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="285.0" y="144" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic"></text>
  <polyline points="298,140 336,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-hpt)"/>
  <rect x="340" y="128" width="26" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="128" width="26" height="24" fill="#ef4444" opacity=".25"/>
  <text x="353.0" y="144" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">p</text>
  <rect x="366" y="128" width="26" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="366" y="128" width="26" height="24" fill="#3b82f6" opacity=".25"/>
  <text x="379.0" y="144" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">r</text>
  <rect x="392" y="128" width="26" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="405.0" y="144" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic"></text>
  <polyline points="418,140 452,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-hpt)"/>
  <text x="468" y="145" text-anchor="middle" font-size="14" fill="currentColor">…</text>
  <text x="259" y="172" text-anchor="middle" font-size="10" fill="currentColor" class="dim">virtual page, frame, next</text>
  <text x="379" y="172" text-anchor="middle" font-size="10" fill="currentColor" class="dim">match on p</text>
  <rect x="460" y="22" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="460" y="22" width="30" height="24" fill="#3b82f6" opacity=".25"/>
  <text x="475.0" y="38" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">r</text>
  <rect x="490" y="22" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="505.0" y="38" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">d</text>
  <text x="468" y="62" text-anchor="end" font-size="11" fill="currentColor" class="dim">physical address</text>
  <polyline points="379,128 379,90 475,90 475,49" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-hpt)"/>
  <polyline points="65,22 65,8 505,8 505,19" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#arr-hpt)"/>
</svg>
<figcaption>Hashed page table (after Galvin, Fig. 8.19). The page number $p$ is hashed; the list at that entry is searched until an element with virtual page $p$ is found, and its frame $r$ forms the physical address.</figcaption>
</figure>

A variation for 64-bit address spaces is the *clustered page table*: each hash entry maps several consecutive pages (e.g. 16) instead of one. This suits *sparse* address spaces, where references are scattered over the address space.

#### Inverted Page Tables

An ordinary page table has one entry per **virtual** page of each process, so with many processes the page tables alone can take a lot of physical memory. An *inverted page table* turns this around:

- it has one entry for each **physical frame**, holding the virtual page stored in that frame and the process that owns it;
- there is only **one** page table in the whole system.

A virtual address is the triple $\langle \text{process-id}, \text{page-number}, \text{offset} \rangle$. The pair $\langle \text{process-id}, \text{page-number} \rangle$ is searched for in the inverted table; if it is found at entry $i$, the physical address is $\langle i, \text{offset} \rangle$. If no match is found, the access is illegal. The process id plays the role of an address-space identifier, which is needed because the table holds the pages of many address spaces at once.

<figure class="fig">
<svg viewBox="0 0 510 298" width="510" role="img" aria-label="Inverted page table">
  <defs><marker id="arr-ipt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="10" y="40" width="60" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="40" y="65" text-anchor="middle" font-size="13" fill="currentColor">CPU</text>
  <polyline points="70,60 86,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ipt)"/>
  <rect x="90" y="48" width="34" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="90" y="48" width="34" height="24" fill="#ef4444" opacity=".25"/>
  <text x="107.0" y="64" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">pid</text>
  <rect x="124" y="48" width="34" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="124" y="48" width="34" height="24" fill="#ef4444" opacity=".25"/>
  <text x="141.0" y="64" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">p</text>
  <rect x="158" y="48" width="34" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.0" y="64" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">d</text>
  <text x="148" y="92" text-anchor="middle" font-size="11" fill="currentColor" class="dim">logical address</text>
  <rect x="110" y="110" width="80" height="150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="118" y1="130" x2="182" y2="130" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <line x1="118" y1="150" x2="182" y2="150" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <line x1="118" y1="170" x2="182" y2="170" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <line x1="118" y1="210" x2="182" y2="210" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <line x1="118" y1="230" x2="182" y2="230" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <rect x="110" y="180" width="80" height="22" fill="#ef4444" opacity=".22"/>
  <line x1="110" y1="180" x2="190" y2="180" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="110" y1="202" x2="190" y2="202" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="150" y1="180" x2="150" y2="202" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130" y="196" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">pid</text>
  <text x="170" y="196" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">p</text>
  <text x="150" y="278" text-anchor="middle" font-size="11" fill="currentColor" class="dim">page table (one entry per frame)</text>
  <polyline points="107,72 100,72 100,190 107,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ipt)"/>
  <text x="94" y="140" text-anchor="end" font-size="11" fill="currentColor" class="dim">search</text>
  <path d="M196,112 q8,0 8,8 v52 q0,8 -8,8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212" y="150" text-anchor="start" font-size="13" fill="currentColor" font-style="italic">i</text>
  <rect x="260" y="48" width="34" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="260" y="48" width="34" height="24" fill="#3b82f6" opacity=".25"/>
  <text x="277.0" y="64" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">i</text>
  <rect x="294" y="48" width="34" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="311.0" y="64" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">d</text>
  <text x="284" y="92" text-anchor="start" font-size="11" fill="currentColor" class="dim">physical address</text>
  <polyline points="190,191 277,191 277,75" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ipt)"/>
  <polyline points="175,48 175,28 311,28 311,45" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#arr-ipt)"/>
  <rect x="380" y="20" width="110" height="250" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="435" y="290" text-anchor="middle" font-size="11" fill="currentColor" class="dim">physical memory</text>
  <polyline points="328,60 377,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ipt)"/>
</svg>
<figcaption>Inverted page table (after Galvin, Fig. 8.20). The pair (pid, $p$) is searched for in the table; the index $i$ of the matching entry is the frame number.</figcaption>
</figure>

**Trade-offs.**

- **Less memory, more time:** the table is sorted by physical frame but looked up by virtual page, so in the worst case the whole table must be searched. A hash table limits the search to one or a few entries, but adds a memory access: one virtual reference now needs at least two real memory reads, one for the hash entry and one for the page table. (The TLB is searched first, which hides most of this.)
- **Shared memory is hard:** sharing normally maps several virtual addresses to the same frame, but here each frame has only one entry, so it can record only one virtual address. A common fix is to allow only one mapping of the shared frame at a time; references through the other virtual addresses then cause page faults.

Systems that use inverted page tables include the 64-bit UltraSPARC, the PowerPC and the IBM RT.

### Virtual Memory

With virtual memory a process can run even when only part of it is in main memory: its pages stay on disk and are brought in when they are needed.

#### Paged Virtual Memory

Take a program (process) on a 32-bit machine, so its virtual address space is $2^{32}$ B = 4 GB, divided into **256 B pages**. Suppose physical memory is only 16 MB, i.e. 24-bit physical addresses, so it holds $2^{24} / 2^8 = 2^{16}$ physical pages.

<figure class="fig">
<svg viewBox="0 0 660 360" width="660" role="img" aria-label="A 4 GB virtual address space of 256 B pages mapped onto 16 MB of physical memory">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="215.0" y="16" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">virtual address space (4 GB)</text>
  <rect x="150" y="28" width="130" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="62" text-anchor="middle" font-size="12" fill="currentColor">virtual page 0</text>
  <text x="142" y="40" text-anchor="end" font-size="10" fill="currentColor" class="dim">0x00000000</text>
  <text x="142" y="86" text-anchor="end" font-size="10" fill="currentColor" class="dim">0x000000FF</text>
  <rect x="150" y="88" width="130" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="114" text-anchor="middle" font-size="12" fill="currentColor">virtual page 1</text>
  <text x="142" y="100" text-anchor="end" font-size="10" fill="currentColor" class="dim">0x00000100</text>
  <text x="142" y="146" text-anchor="end" font-size="10" fill="currentColor" class="dim">0x000001FF</text>
  <rect x="150" y="148" width="130" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="182" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
  <rect x="150" y="208" width="130" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="242" text-anchor="middle" font-size="12" fill="currentColor">virtual page 2²⁴ − 1</text>
  <text x="142" y="220" text-anchor="end" font-size="10" fill="currentColor" class="dim">0xFFFFFF00</text>
  <text x="142" y="266" text-anchor="end" font-size="10" fill="currentColor" class="dim">0xFFFFFFFF</text>
  <rect x="150" y="124" width="130" height="12" fill="#3b82f6" opacity=".25"/>
  <text x="215.0" y="134" text-anchor="middle" font-size="9" fill="currentColor">0x00000124</text>
  <text x="535.0" y="16" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">physical memory (16 MB)</text>
  <rect x="470" y="28" width="130" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="535.0" y="52" text-anchor="middle" font-size="12" fill="currentColor">physical page 0</text>
  <text x="608" y="40" text-anchor="start" font-size="10" fill="currentColor" class="dim">0x000000</text>
  <text x="608" y="86" text-anchor="start" font-size="10" fill="currentColor" class="dim">0x0000FF</text>
  <rect x="470" y="88" width="130" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="535.0" y="122" text-anchor="middle" font-size="12" fill="currentColor">⋮</text>
  <rect x="470" y="148" width="130" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="535.0" y="182" text-anchor="middle" font-size="12" fill="currentColor">physical page 2¹⁶ − 1</text>
  <text x="608" y="160" text-anchor="start" font-size="10" fill="currentColor" class="dim">0xFFFF00</text>
  <text x="608" y="206" text-anchor="start" font-size="10" fill="currentColor" class="dim">0xFFFFFF</text>
  <rect x="470" y="68" width="130" height="12" fill="#3b82f6" opacity=".25"/>
  <text x="535.0" y="78" text-anchor="middle" font-size="9" fill="currentColor">0x000024</text>
  <path d="M280,130 C370,130 380,74 466,74" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="375" y="152" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">page table:</text>
  <text x="375" y="167" text-anchor="middle" font-size="11" fill="currentColor">virtual page 1 → physical page 0</text>
  <text x="140" y="303" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">VA</text>
  <rect x="150" y="284" width="100" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="284" width="100" height="28" fill="#ef4444" opacity=".22"/>
  <text x="200.0" y="303" text-anchor="middle" font-size="12" fill="currentColor">0x000001</text>
  <rect x="250" y="284" width="64" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="282.0" y="303" text-anchor="middle" font-size="12" fill="currentColor">24</text>
  <path d="M150,316 q0,6 6,6 H194.0 q6,0 6,6 q0,-6 6,-6 H244 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="200.0" y="342" text-anchor="middle" font-size="10" fill="currentColor" class="dim">page number (24 b)</text>
  <path d="M250,316 q0,6 6,6 H276.0 q6,0 6,6 q0,-6 6,-6 H308 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="282.0" y="342" text-anchor="middle" font-size="10" fill="currentColor" class="dim">offset (8 b)</text>
  <text x="460" y="303" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">PA</text>
  <rect x="470" y="284" width="100" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="470" y="284" width="100" height="28" fill="#3b82f6" opacity=".25"/>
  <text x="520.0" y="303" text-anchor="middle" font-size="12" fill="currentColor">0x0000</text>
  <rect x="570" y="284" width="64" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="602.0" y="303" text-anchor="middle" font-size="12" fill="currentColor">24</text>
  <path d="M470,316 q0,6 6,6 H514.0 q6,0 6,6 q0,-6 6,-6 H564 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="520.0" y="342" text-anchor="middle" font-size="10" fill="currentColor" class="dim">page number (16 b)</text>
  <path d="M570,316 q0,6 6,6 H596.0 q6,0 6,6 q0,-6 6,-6 H628 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="602.0" y="342" text-anchor="middle" font-size="10" fill="currentColor" class="dim">offset (8 b)</text>
</svg>
<figcaption>Virtual address 0x00000124 lies in virtual page 1 at offset 0x24. The page table maps virtual page 1 to physical page 0, so the physical address is 0x000024; the braces show how each address splits into page number and offset.</figcaption>
</figure>

- A virtual address splits into a **page number** (the top 24 bits) and an **offset** within the page (the low 8 bits, since $2^8 = 256$). For 0x000001**24**, the page number is 0x000001 and the offset is 0x24.
- The page table has an entry for this mapping: virtual page 1 → physical page 0.
- The offset is **not translated**; it is simply copied into the physical address.

> **Note.** Physical memory can be **smaller** than the virtual address space. Only some of the virtual pages are in main memory at any time; the rest stay on disk.

#### Address Translation

Each page-table entry holds the **physical page number (PPN)**, a **disk address**, and a **valid bit**:

<figure class="fig">
<svg viewBox="0 0 700 262" width="700" role="img" aria-label="Translating a virtual address through a page table with PPN, disk address and valid bit">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="110" y="50" text-anchor="middle" font-size="11" fill="currentColor" class="dim">virtual address</text>
  <rect x="40" y="60" width="100" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="40" y="60" width="100" height="28" fill="#ef4444" opacity=".22"/>
  <text x="90.0" y="79" text-anchor="middle" font-size="12" fill="currentColor">0x000001</text>
  <rect x="140" y="60" width="40" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="160.0" y="79" text-anchor="middle" font-size="12" fill="currentColor">24</text>
  <path d="M40,92 q0,6 6,6 H84.0 q6,0 6,6 q0,-6 6,-6 H134 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="90.0" y="118" text-anchor="middle" font-size="10" fill="currentColor" class="dim">virtual page no.</text>
  <path d="M140,92 q0,6 6,6 H154.0 q6,0 6,6 q0,-6 6,-6 H174 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="160.0" y="118" text-anchor="middle" font-size="10" fill="currentColor" class="dim">offset</text>
  <text x="310.0" y="50" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">PPN</text>
  <text x="405.0" y="50" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">disk addr</text>
  <text x="460.0" y="50" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">valid</text>
  <text x="500.0" y="50" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">⋯</text>
  <rect x="250" y="58" width="120" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="58" width="70" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="58" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="58" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="460" y="78" text-anchor="middle" font-size="12" fill="currentColor" class="dim">0</text>
  <text x="500" y="78" text-anchor="middle" font-size="12" fill="currentColor" class="dim">⋯</text>
  <rect x="250" y="88" width="120" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="88" width="70" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="88" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="88" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="88" width="270" height="30" fill="#ef4444" opacity=".22"/>
  <text x="310" y="108" text-anchor="middle" font-size="12" fill="currentColor">0x0000</text>
  <text x="460" y="108" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="500" y="108" text-anchor="middle" font-size="12" fill="currentColor" class="dim">⋯</text>
  <rect x="250" y="118" width="120" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="118" width="70" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="118" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="118" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="460" y="138" text-anchor="middle" font-size="12" fill="currentColor" class="dim">0</text>
  <text x="500" y="138" text-anchor="middle" font-size="12" fill="currentColor" class="dim">⋯</text>
  <rect x="250" y="148" width="120" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="148" width="70" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="148" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="148" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="460" y="168" text-anchor="middle" font-size="12" fill="currentColor" class="dim">⋮</text>
  <text x="500" y="168" text-anchor="middle" font-size="12" fill="currentColor" class="dim">⋯</text>
  <rect x="250" y="178" width="120" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="178" width="70" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="178" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="480" y="178" width="40" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="460" y="198" text-anchor="middle" font-size="12" fill="currentColor" class="dim">0</text>
  <text x="500" y="198" text-anchor="middle" font-size="12" fill="currentColor" class="dim">⋯</text>
  <text x="385.0" y="228" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">page table</text>
  <polyline points="40,74 24,74 24,150 226,150 226,103.0 247,103.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="130" y="144" text-anchor="middle" font-size="10" fill="currentColor" class="dim">index</text>
  <text x="610" y="50" text-anchor="middle" font-size="11" fill="currentColor" class="dim">physical address</text>
  <rect x="560" y="89" width="64" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="560" y="89" width="64" height="28" fill="#3b82f6" opacity=".25"/>
  <text x="592.0" y="108" text-anchor="middle" font-size="12" fill="currentColor">0x0000</text>
  <rect x="624" y="89" width="34" height="28" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="641.0" y="108" text-anchor="middle" font-size="12" fill="currentColor">24</text>
  <polyline points="520,103.0 556,103.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <path d="M560,121 q0,6 6,6 H586.0 q6,0 6,6 q0,-6 6,-6 H618 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="592.0" y="147" text-anchor="middle" font-size="10" fill="currentColor" class="dim">PPN</text>
  <path d="M624,121 q0,6 6,6 H635.0 q6,0 6,6 q0,-6 6,-6 H652 q6,0 6,-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="641.0" y="147" text-anchor="middle" font-size="10" fill="currentColor" class="dim">offset</text>
  <path d="M160,60 V24 H641 V85" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="400" y="16" text-anchor="middle" font-size="10" fill="currentColor" class="dim">offset copied unchanged</text>
  <text x="385.0" y="250" text-anchor="middle" font-size="10" fill="currentColor" class="dim">valid = 0: page not in memory (the disk address says where it is); ⋯ = other bits</text>
</svg>
<figcaption>The virtual page number 0x000001 indexes the page table. Its entry is valid, with PPN 0x0000, so the physical address is the PPN followed by the same offset: 0x0000<strong>24</strong>.</figcaption>
</figure>

1. The virtual page number is used as an index into the page table.
2. If the entry's **valid bit** is 1, the page is in main memory and the entry gives its PPN.
3. The physical address is the PPN followed by the unchanged offset.

Suppose there are many virtual pages for a process, which cannot all be stored in main memory. Then we store them on the **hard disk**, and the page table records where each one is:

<figure class="fig">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="Page tables of three processes mapping virtual pages to main memory or the hard disk">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="70" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">main memory</text>
  <rect x="20" y="30" width="100" height="48" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="30" width="100" height="48" fill="#ef4444" opacity=".22"/>
  <text x="70" y="59" text-anchor="middle" font-size="11" fill="currentColor">P₁ page 0</text>
  <text x="12" y="59" text-anchor="end" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="20" y="78" width="100" height="48" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="78" width="100" height="48" fill="#3b82f6" opacity=".25"/>
  <text x="70" y="107" text-anchor="middle" font-size="11" fill="currentColor">P₃ page 2</text>
  <text x="12" y="107" text-anchor="end" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="20" y="126" width="100" height="48" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="126" width="100" height="48" fill="#3b82f6" opacity=".25"/>
  <text x="70" y="155" text-anchor="middle" font-size="11" fill="currentColor">P₃ page 0</text>
  <text x="12" y="155" text-anchor="end" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="20" y="174" width="100" height="48" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="70" y="203" text-anchor="middle" font-size="11" fill="currentColor">P₂ page 2</text>
  <text x="12" y="203" text-anchor="end" font-size="10" fill="currentColor" class="dim">3</text>
  <text x="220" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₁</text>
  <rect x="200" y="30" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220" y="48" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <text x="194" y="48" text-anchor="end" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="200" y="56" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220" y="74" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="194" y="74" text-anchor="end" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="200" y="82" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220" y="100" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="194" y="100" text-anchor="end" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="200" y="108" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220" y="126" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="194" y="126" text-anchor="end" font-size="10" fill="currentColor" class="dim">3</text>
  <text x="310" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₂</text>
  <rect x="290" y="30" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310" y="48" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="284" y="48" text-anchor="end" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="290" y="56" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310" y="74" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="284" y="74" text-anchor="end" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="290" y="82" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310" y="100" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="284" y="100" text-anchor="end" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="290" y="108" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310" y="126" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="284" y="126" text-anchor="end" font-size="10" fill="currentColor" class="dim">3</text>
  <text x="400" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₃</text>
  <rect x="380" y="30" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400" y="48" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="374" y="48" text-anchor="end" font-size="10" fill="currentColor" class="dim">0</text>
  <rect x="380" y="56" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400" y="74" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="374" y="74" text-anchor="end" font-size="10" fill="currentColor" class="dim">1</text>
  <rect x="380" y="82" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400" y="100" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="374" y="100" text-anchor="end" font-size="10" fill="currentColor" class="dim">2</text>
  <rect x="380" y="108" width="40" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400" y="126" text-anchor="middle" font-size="12" fill="currentColor">–</text>
  <text x="374" y="126" text-anchor="end" font-size="10" fill="currentColor" class="dim">3</text>
  <rect x="196" y="104" width="48" height="30" rx="8" stroke="currentColor" stroke-width="1.5" fill="none" stroke="#ef4444"/>
  <text x="310" y="158" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">page tables (– = not in memory)</text>
  <ellipse cx="565" cy="40" rx="80" ry="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M485,40 V250 a80,12 0 0 0 160,0 V40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="500" y="70" width="130" height="32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="500" y="70" width="130" height="32" fill="#ef4444" opacity=".22"/>
  <text x="565" y="91" text-anchor="middle" font-size="11" fill="currentColor">P₁: 0 1 2 3</text>
  <rect x="500" y="120" width="130" height="32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="565" y="141" text-anchor="middle" font-size="11" fill="currentColor">P₂: 0 1 2 3</text>
  <rect x="500" y="170" width="130" height="32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="500" y="170" width="130" height="32" fill="#3b82f6" opacity=".25"/>
  <text x="565" y="191" text-anchor="middle" font-size="11" fill="currentColor">P₃: 0 1 2 3</text>
  <text x="565" y="230" text-anchor="middle" font-size="11" fill="currentColor" class="dim">contents of all</text>
  <text x="565" y="245" text-anchor="middle" font-size="11" fill="currentColor" class="dim">virtual pages</text>
  <text x="565" y="286" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">hard disk</text>
  <polyline points="220,134 220,190 482,190" stroke="currentColor" stroke-width="1.5" fill="none" stroke="#ef4444" stroke-dasharray="4 3" marker-end="url(#arr)"/>
  <text x="355" y="208" text-anchor="middle" font-size="10" fill="currentColor" class="dim">P₁ page 3 is only on disk</text>
</svg>
<figcaption>Three processes share four frames of main memory. Each page table maps a virtual page to a frame, or marks it as not in memory (–); the contents of every virtual page are kept on the hard disk.</figcaption>
</figure>

For example, $P_1$'s page 0 is in frame 0, $P_2$'s page 2 is in frame 3, and $P_3$'s pages 0 and 2 are in frames 2 and 1. $P_1$'s page 3 is not in main memory at all: its entry is invalid, and its contents are only on disk.

> **Note.** This is the idea behind **virtual memory**: a process can run even if only part of it is in memory. The page table, together with the disk address of each page, lets the OS bring pages in only when they are needed.

#### Page Fault

What happens when process $P_1$ now accesses a variable that is on its virtual page 3, which is not in main memory?

<div class="definition">

A *page fault* is the situation where the virtual address generated by the processor is not available in main memory.

</div>

- It is detected on the attempt to translate the address: the **page-table entry is invalid**.
- It must be **handled by the OS**:
  1. identify a slot (frame) in main memory to be used;
  2. get the page contents from disk;
  3. update the page-table entry.
- The data can then be provided to the processor.

<figure class="fig">
<svg viewBox="0 0 690 320" width="690" role="img" aria-label="Steps in handling a page fault">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="205" y="20" width="120" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="265.0" y="45.0" text-anchor="middle" font-size="12" fill="currentColor">operating system</text>
  <text x="70" y="128" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">process</text>
  <rect x="20" y="139" width="100" height="40" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="70.0" y="164.0" text-anchor="middle" font-size="13" fill="currentColor">load M</text>
  <rect x="200" y="120" width="50" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="250" y="120" width="30" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="146" width="50" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="250" y="146" width="30" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="172" width="50" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="250" y="172" width="30" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="198" width="50" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="250" y="198" width="30" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="265" y="164" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">i</text>
  <text x="240" y="242" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">page table</text>
  <rect x="420" y="90" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="124" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="158" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="192" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="226" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="260" width="100" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="158" width="100" height="34" fill="currentColor" opacity=".12"/>
  <text x="470" y="179" text-anchor="middle" font-size="11" fill="currentColor">free frame</text>
  <text x="470" y="312" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic">physical memory</text>
  <ellipse cx="610" cy="66" rx="42" ry="9" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M568,66 V136 a42,9 0 0 0 84,0 V66" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="610" y="104" text-anchor="middle" font-size="11" fill="currentColor">backing</text>
  <text x="610" y="118" text-anchor="middle" font-size="11" fill="currentColor">store</text>
  <polyline points="120,159 196,159" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="158" cy="141" r="9" stroke="currentColor" stroke-width="1.5" fill="var(--theme, #fff)"/>
  <text x="158" y="145" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <text x="158" y="181" text-anchor="middle" font-size="10" fill="currentColor" class="dim">reference</text>
  <polyline points="265,120 265,64" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="285" cy="92" r="9" stroke="currentColor" stroke-width="1.5" fill="var(--theme, #fff)"/>
  <text x="285" y="96" text-anchor="middle" font-size="11" fill="currentColor">2</text>
  <text x="300" y="96" text-anchor="start" font-size="10" fill="currentColor" class="dim">trap</text>
  <polyline points="325,40 610,40 610,53" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="440" cy="40" r="9" stroke="currentColor" stroke-width="1.5" fill="var(--theme, #fff)"/>
  <text x="440" y="44" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <text x="456" y="30" text-anchor="start" font-size="10" fill="currentColor" class="dim">page is on backing store</text>
  <polyline points="610,146 610,175 524,175" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="610" cy="160" r="9" stroke="currentColor" stroke-width="1.5" fill="var(--theme, #fff)"/>
  <text x="610" y="164" text-anchor="middle" font-size="11" fill="currentColor">4</text>
  <text x="626" y="196" text-anchor="start" font-size="10" fill="currentColor" class="dim">bring in</text>
  <text x="626" y="210" text-anchor="start" font-size="10" fill="currentColor" class="dim">missing page</text>
  <polyline points="420,175 350,175 350,159 284,159" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="385" cy="175" r="9" stroke="currentColor" stroke-width="1.5" fill="var(--theme, #fff)"/>
  <text x="385" y="179" text-anchor="middle" font-size="11" fill="currentColor">5</text>
  <text x="380" y="199" text-anchor="end" font-size="10" fill="currentColor" class="dim">reset page table</text>
  <polyline points="225,224 225,270 70,270 70,183" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="150" cy="270" r="9" stroke="currentColor" stroke-width="1.5" fill="var(--theme, #fff)"/>
  <text x="150" y="274" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <text x="150" y="294" text-anchor="middle" font-size="10" fill="currentColor" class="dim">restart instruction</text>
</svg>
<figcaption>Steps in handling a page fault (after Galvin, Fig. 9.6).</figcaption>
</figure>

In more detail:

1. The process references a page, and the hardware finds its page-table entry marked invalid.
2. This causes a **trap** to the OS.
3. The OS checks that the reference was a legal address (otherwise the process is terminated) and finds where the page is on the backing store.
4. It finds a free frame and schedules a disk read of the missing page into it.
5. When the read is complete, it updates the page table to mark the page valid and record the frame.
6. The instruction that was interrupted by the trap is **restarted**; the process can now access the page as though it had always been in memory.

#### Page-Fault Handler

- The handler identifies a slot in main memory to be used.
- It must keep track of the available, unused physical pages, maybe in a **free list**.
- **What if the free list is empty?** That is, all the main-memory physical pages are already mapped to virtual pages.
  - Then the page-fault handler must identify a page to be **replaced (evicted)** from main memory. How it picks one is decided by a **page-replacement policy** (below).

> **Note.** Paging in a page only when it is needed is called **demand paging**, and the component that does it is a **lazy swapper**: it never swaps a page into memory unless that page will be needed. In the extreme case, *pure demand paging*, a process starts with **no** pages in memory and faults on its very first instruction.

#### Performance of Demand Paging

As long as there are no page faults, the effective access time is the memory-access time $ma$. On a page fault, the page must first be read from disk. Let $p$ be the probability of a page fault ($0 \le p \le 1$):

$$\text{EAT} = (1 - p) \times ma + p \times \text{page-fault service time}$$

The service time has three main parts: service the page-fault interrupt, **read in the page**, and restart the process. The first and third take microseconds; reading the page takes milliseconds (seek + latency + transfer), so it dominates.

<div class="example">

Memory access takes 200 ns and the average page-fault service time is 8 ms. Find the EAT, and the largest page-fault rate that keeps the slowdown under 10%.

</div>

$$\text{EAT} = (1 - p) \times 200 + p \times 8{,}000{,}000 = 200 + 7{,}999{,}800\,p \text{ ns}$$

If one access in 1000 faults ($p = 0.001$), EAT $\approx 8.2\ \mu$s: the machine is **40 times slower**. For less than 10% slowdown:

$$220 > 200 + 7{,}999{,}800\,p \quad\Rightarrow\quad p < 0.0000025$$

i.e. fewer than one access in 399,990 may fault. The page-fault rate has to be kept very low.

#### Page-Replacement Policies

**Question:** how does the page-fault handler decide which page to replace when there is a page fault?

- In the worst case, the policy could always replace the page that is going to be accessed next. Each of these would require copying the virtual page from the hard disk to memory again.
- So the OS page-fault manager code must be written based on a **realistic model of how programs behave** with respect to memory.

##### Principle of Locality of Reference

<div class="definition">

If memory address $A$ is referenced at time $t$, then **it** and its **neighbouring** memory locations are likely to be referenced in the near future. The first is *temporal locality*, the second *spatial locality*.

</div>

<figure class="fig">
<svg viewBox="0 0 560 150" width="560" role="img" aria-label="Temporal and spatial locality">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="100" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="130" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="160" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="190" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="190" y="56" width="30" height="30" fill="#3b82f6" opacity=".25"/>
  <rect x="220" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="220" y="56" width="30" height="30" fill="#3b82f6" opacity=".25"/>
  <rect x="250" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="56" width="30" height="30" fill="#ef4444" opacity=".3"/>
  <rect x="280" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="56" width="30" height="30" fill="#3b82f6" opacity=".25"/>
  <rect x="310" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="310" y="56" width="30" height="30" fill="#3b82f6" opacity=".25"/>
  <rect x="340" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="370" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="430" y="56" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="265.0" y="76" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">A</text>
  <text x="90" y="76" text-anchor="end" font-size="11" fill="currentColor" class="dim">memory</text>
  <path d="M190,52 q0,-6 6,-6 H259.0 q6,0 6,-6 q0,6 6,6 H334 q6,0 6,6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1.2"/>
  <text x="265.0" y="34" text-anchor="middle" font-size="11" fill="currentColor" class="dim">spatial: A's neighbours are used soon</text>
  <path d="M259.0,88 C225.0,126 305.0,126 271.0,92" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="265.0" y="140" text-anchor="middle" font-size="11" fill="currentColor" class="dim">temporal: A itself is used again soon</text>
</svg>
<figcaption>Temporal locality: the same address is used again soon. Spatial locality: nearby addresses are used soon.</figcaption>
</figure>

Based on your experience, why do you expect that programs will display locality of reference?

<figure class="table">
<figcaption>Where locality comes from.</figcaption>

| | Same address (temporal) | Neighbours (spatial) |
|:--|:-:|:-:|
| Instructions | small loop | sequential code |
| Data | local variable, loop index | stepping through arrays |

</figure>

For a program that displays good locality of reference, what would be a good page-replacement policy? Suppose a page fault occurs at time $t$ on a reference to page $P_x$: which page should be replaced from memory to make space for $P_x$? By locality, a page used recently is likely to be used again soon, so **pick the page that was referenced least recently**.

To compare policies we count page faults on a **reference string** (the sequence of pages referenced). The examples below use Galvin's string with **3 frames**:

$$7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1$$

##### Least Recently Used (LRU)

- Keep track of when each page was last referenced, with a **timestamp**.
  - The LRU page is the one with the smallest timestamp.
  - This requires a large number of comparisons.
- Or keep a **stack** of recently used pages.
  - The LRU page is at the bottom of the stack.
  - The stack must be updated on **every memory access**.
- So exact LRU might be **too expensive** without hardware support.

<figure class="fig">
<svg viewBox="0 0 600 156" width="600" role="img" aria-label="LRU page replacement with 3 frames">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="10" y="20" text-anchor="start" font-size="10" fill="currentColor" class="dim">ref</text>
  <text x="44.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">7</text>
  <rect x="32" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="44.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="32" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="60" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="60" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="72.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="60" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="88" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="88" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="88" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="88" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="100.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="128.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="116" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="116" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="128.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="116" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="116" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="156.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="184.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="172" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="172" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="172" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="172" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="184.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="212.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="240.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">4</text>
  <rect x="228" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="228" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="240.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="228" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="228" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="268.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="256" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="256" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="256" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="256" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="268.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="296.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="284" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="284" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="284" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="296.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="284" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="324.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="312" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="312" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="324.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="312" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="312" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="352.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <text x="380.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="408.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="396" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="396" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="408.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="396" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="408.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="396" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="408.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="436.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="464.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="452" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="464.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="452" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="452" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="464.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="452" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="464.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="492.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <text x="520.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">7</text>
  <rect x="508" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="508" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="508" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="508" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="520.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <text x="548.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="576.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <text x="300.0" y="136" text-anchor="middle" font-size="11" fill="currentColor" class="dim">12 page faults (only faults are drawn; the new page is shaded)</text>
</svg>
<figcaption>LRU with 3 frames: 12 page faults (after Galvin, Fig. 9.15).</figcaption>
</figure>

##### Alternate Page-Replacement Policies

**1. First In, First Out (FIFO).**

- Keep track of the order in which the pages came into memory, and replace the oldest.
- **Advantage:** it does not have to be updated when a page is re-accessed.
- **Problem:** unlike LRU, FIFO does not guarantee that the number of page faults will decrease if you increase the size of main memory. This is **Belady's anomaly** (a stack-based algorithm never suffers from it).

<figure class="fig">
<svg viewBox="0 0 600 156" width="600" role="img" aria-label="FIFO page replacement with 3 frames">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="10" y="20" text-anchor="start" font-size="10" fill="currentColor" class="dim">ref</text>
  <text x="44.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">7</text>
  <rect x="32" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="44.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="32" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="60" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="60" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="72.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="60" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="88" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="88" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="88" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="88" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="100.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="128.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="116" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="116" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="128.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="116" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="116" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="156.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="184.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="172" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="172" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="172" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="184.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="172" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="212.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="200" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="200" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="200" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="212.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <text x="240.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">4</text>
  <rect x="228" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="228" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="240.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="228" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="228" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <text x="268.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="256" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="256" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="256" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="268.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="256" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <text x="296.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="284" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="284" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="284" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="284" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="296.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="324.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="312" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="312" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="324.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="312" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="312" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="352.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <text x="380.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="408.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="396" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="408.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="396" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="396" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="408.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="396" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="408.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="436.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="424" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="436.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="424" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="436.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="424" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="424" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="436.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="464.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="492.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <text x="520.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">7</text>
  <rect x="508" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="508" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="520.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="508" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="508" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="548.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="536" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="548.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="536" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="536" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="548.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="536" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="548.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="576.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="564" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="576.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="564" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="576.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="564" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="564" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="576.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="300.0" y="136" text-anchor="middle" font-size="11" fill="currentColor" class="dim">15 page faults (only faults are drawn; the new page is shaded)</text>
</svg>
<figcaption>FIFO with 3 frames: 15 page faults (after Galvin, Fig. 9.12).</figcaption>
</figure>

<div class="example">

Belady's anomaly. Run FIFO on the reference string $1,2,3,4,1,2,5,1,2,3,4,5$ with 3 and then 4 frames.

</div>

<figure class="fig">
<svg viewBox="0 0 376 156" width="376" role="img" aria-label="FIFO with 3 frames on 1,2,3,4,1,2,5,1,2,3,4,5">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="10" y="20" text-anchor="start" font-size="10" fill="currentColor" class="dim">ref</text>
  <text x="44.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="32" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="44.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="32" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="60" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="60" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="72.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="60" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="88" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="88" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="88" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="88" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="100.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="128.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">4</text>
  <rect x="116" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="116" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="128.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="116" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="116" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="156.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="144" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="156.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="144" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="144" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="156.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="144" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="156.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="184.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="172" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="172" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="172" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="172" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="184.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="212.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">5</text>
  <rect x="200" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="212.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="200" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="200" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="240.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <text x="268.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="296.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="284" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="284" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="284" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="296.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="284" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="324.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">4</text>
  <rect x="312" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="312" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="312" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="312" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="324.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <text x="352.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">5</text>
  <text x="188.0" y="136" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9 page faults (only faults are drawn; the new page is shaded)</text>
</svg>
<svg viewBox="0 0 376 180" width="376" role="img" aria-label="FIFO with 4 frames on 1,2,3,4,1,2,5,1,2,3,4,5">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="10" y="20" text-anchor="start" font-size="10" fill="currentColor" class="dim">ref</text>
  <text x="44.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="32" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="44.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="32" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="60" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="60" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="72.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="60" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="88" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="88" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="88" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="88" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="100.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="88" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">4</text>
  <rect x="116" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="116" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="116" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="116" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="116" y="102" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="128.0" y="119" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <text x="156.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <text x="184.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="212.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">5</text>
  <rect x="200" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="212.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="200" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="200" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="200" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="212.0" y="119" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <text x="240.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="228" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="228" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="228" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="240.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="228" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="228" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="119" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <text x="268.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="256" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="256" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="256" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="256" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="268.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="256" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268.0" y="119" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <text x="296.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="284" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="284" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="284" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="284" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="284" y="102" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="296.0" y="119" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="324.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">4</text>
  <rect x="312" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="312" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="324.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="312" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="312" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="312" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="119" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="352.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">5</text>
  <rect x="340" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="352.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="340" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="352.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="340" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="352.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="340" y="102" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="352.0" y="119" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="188.0" y="160" text-anchor="middle" font-size="11" fill="currentColor" class="dim">10 page faults (only faults are drawn; the new page is shaded)</text>
</svg>
<figcaption>With 3 frames FIFO has 9 faults, but with 4 frames it has 10: more memory gave <em>more</em> faults. LRU on the same string gives 10 faults with 3 frames and 8 with 4.</figcaption>
</figure>

**2. Approximate LRU.** For example:

- Maintain 1 bit of status information (a **reference bit**) with each physical page.
- Initially all bits are 0.
- Set a page's bit to 1 when that page is referenced.
- Replace a page that has its bit equal to 0.
- Reset all bits to 0 every once in a while.

> **Note.** The **second-chance** (clock) algorithm is a refinement: pages are kept in FIFO order, but if the oldest page has its reference bit set, the bit is cleared and the page gets a second chance (it is moved to the back) instead of being replaced.

**3. Random.**

- Randomly pick an $i$ between 1 and $n$, and replace the $i$th page.
- It suffers from Belady's anomaly, since it can simulate FIFO (the random choices may happen to be the FIFO ones).

**4. Optimal page replacement (OPT).**

- An optimal page-replacement algorithm has the **lowest page-fault rate** of all algorithms, and will **never suffer from Belady's anomaly**.
- Replace the page that **will not be used for the longest period of time**.
- Unfortunately, it is difficult to implement, because it requires **future knowledge** of the reference string. It is mainly used as a yardstick to compare other algorithms.

<figure class="fig">
<svg viewBox="0 0 600 156" width="600" role="img" aria-label="OPT page replacement with 3 frames">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="10" y="20" text-anchor="start" font-size="10" fill="currentColor" class="dim">ref</text>
  <text x="44.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">7</text>
  <rect x="32" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="44.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="32" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="32" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="60" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="60" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="72.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="60" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="88" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="88" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="88" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="88" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="100.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="128.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <rect x="116" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="116" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="128.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="116" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="116" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="128.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="156.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="184.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <rect x="172" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="172" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="184.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="172" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="172" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="184.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="212.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="240.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">4</text>
  <rect x="228" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="228" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="228" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="240.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="228" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="268.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="296.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <text x="324.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <rect x="312" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="312" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="312" y="54" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="324.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="312" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="324.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <text x="352.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">3</text>
  <text x="380.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="408.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <rect x="396" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="408.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="396" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="408.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="396" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="396" y="78" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="408.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="436.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">2</text>
  <text x="464.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="492.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <text x="520.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">7</text>
  <rect x="508" y="30" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="508" y="30" width="24" height="24" fill="#ef4444" opacity=".22"/>
  <text x="520.0" y="47" text-anchor="middle" font-size="12" fill="currentColor">7</text>
  <rect x="508" y="54" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="71" text-anchor="middle" font-size="12" fill="currentColor">0</text>
  <rect x="508" y="78" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="520.0" y="95" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <text x="548.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">0</text>
  <text x="576.0" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-weight="700">1</text>
  <text x="300.0" y="136" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9 page faults (only faults are drawn; the new page is shaded)</text>
</svg>
<figcaption>OPT with 3 frames: 9 page faults (after Galvin, Fig. 9.14).</figcaption>
</figure>

##### Stack Algorithms

LRU and OPT are both called **stack algorithms**.

<div class="definition">

A *stack algorithm* is one for which it can be shown that the set of pages in memory with $n$ frames is always a **subset** of the set of pages that would be in memory with $n + 1$ frames.

</div>

For LRU, the set of pages in memory is the $n$ most recently referenced pages; with one more frame it is the $n + 1$ most recently referenced pages, which includes them. So adding frames can never add faults: stack algorithms cannot suffer from Belady's anomaly.

> **Note.**
> - For a reference string $S$ and its reverse $S^R$, LRU has the **same page-fault rate**. Similarly, OPT has the same page-fault rate for $S$ and $S^R$. (On the string above, LRU gives 12 faults both ways and OPT gives 9; FIFO gives 15 forwards but 14 reversed.)
> - The second-chance algorithm and random page replacement **suffer** from Belady's anomaly.

#### Dirty Bit

Back to the page-fault handler: it identifies a slot in main memory to be used and gets the page content from disk.

- **Problem:** the victim page identified by the page-replacement algorithm might have been **modified** while it was in main memory.
- Then it cannot simply be overwritten by the incoming page, but must first be **copied back to disk**.
- **Optimization:** keep track of whether the page has been modified while in main memory, with a **dirty (modified) bit**. If the bit is 0, the copy on disk is still up to date and the page can be overwritten directly, saving one disk write.

If a fraction $d$ of the victim pages are dirty, a page fault costs one disk read for a clean victim and a write plus a read for a dirty one:

$$\text{page-fault service time} = (1 - d)\,T_{\text{read}} + d\,(T_{\text{write}} + T_{\text{read}})$$

which goes into the EAT formula of demand paging above.

#### The Page-Table Entry

After all this information, a page-table entry holds:

<figure class="fig">
<svg viewBox="0 0 560 110" width="560" role="img" aria-label="Fields of a page-table entry">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="50" y="20" width="150" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="125.0" y="42" text-anchor="middle" font-size="13" fill="currentColor">PPN</text>
  <rect x="200" y="20" width="120" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="42" text-anchor="middle" font-size="13" fill="currentColor">disk address</text>
  <rect x="320" y="20" width="50" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="345.0" y="42" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">V</text>
  <rect x="370" y="20" width="80" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="410.0" y="42" text-anchor="middle" font-size="13" fill="currentColor">LRU bits</text>
  <rect x="450" y="20" width="50" height="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="475.0" y="42" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D</text>
  <polyline points="345,84 345,58" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="345" y="100" text-anchor="middle" font-size="11" fill="currentColor" class="dim">valid bit</text>
  <polyline points="475,84 475,58" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="475" y="100" text-anchor="middle" font-size="11" fill="currentColor" class="dim">dirty (modified) bit</text>
</svg>
<figcaption>A page-table entry: physical page number, disk address, valid bit, bits used by the replacement policy, and the dirty bit.</figcaption>
</figure>

#### Flow of TLB and Cache

Putting the pieces together, one memory reference goes through the TLB, then (on a miss) the page table, then (on a page fault) the disk, and finally the cache:

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
<figcaption>What happens on one memory reference. A TLB hit gives the frame at once; a TLB miss reads the page table and updates the TLB; a page fault brings the page in from disk (evicting a victim if memory is full) and restarts the instruction. With the physical address known, the cache is checked.</figcaption>
</figure>

#### Allocation of Frames

How do we split the fixed number of free frames among the processes?

- **Minimum:** each process needs at least enough frames to hold all the pages that a **single instruction** can reference, since an instruction that faults part-way must be restarted. This is defined by the architecture. For example, if an instruction can reference one memory operand with one level of indirection, it needs at least 3 frames: the instruction, the indirect address and the operand.
- **Maximum:** the amount of available physical memory.

##### Allocation Algorithms

With $m$ frames and $n$ processes:

- **Equal allocation:** each process gets $m / n$ frames. With 93 frames and 5 processes, each gets 18, and the 3 left over form a free-frame pool.
- **Proportional allocation:** processes get frames according to their size. If process $p_i$ has virtual memory size $s_i$ and $S = \sum s_i$, then

$$a_i = \frac{s_i}{S} \times m$$

(rounded to integers above the minimum, with $\sum a_i \le m$).

<div class="example">

There are 62 free frames, a 10-page student process and a 127-page database. With equal allocation each gets 31 frames, but the student process needs only 10. Proportionally: $10/137 \times 62 \approx 4$ and $127/137 \times 62 \approx 57$.

</div>

In both schemes a high-priority process is treated like a low-priority one. The ratio can instead be based on priority, or on size and priority together.

##### Global versus Local Replacement

- **Global replacement:** a process may select a replacement frame from **all** frames, even one allocated to another process. So a process's number of frames can change.
- **Local replacement:** a process selects only from its **own** frames, so its number of frames stays fixed.

With global replacement a process cannot control its own page-fault rate: the pages it has in memory depend on the paging behaviour of other processes too, so the same program may take 0.5 s on one run and 10.3 s on the next. Local replacement does not have this problem, but it can hinder a process by not letting it use other, less used pages. **Global replacement generally gives greater throughput**, and is more commonly used.

#### Thrashing

If a process does not have enough frames for the pages it is actively using, it quickly page-faults. It must then replace a page, but all its pages are in active use, so it replaces one that is needed again right away, faults again, and so on.

<div class="definition">

**Thrashing** is this high paging activity: a process is thrashing if it is spending more time paging than executing.

</div>

##### Cause of Thrashing

Consider an OS that raises the degree of multiprogramming whenever CPU utilization is low, with global replacement:

1. A process enters a new phase and needs more frames. It faults and takes frames from other processes.
2. Those processes need their pages, so they fault too and take frames from others.
3. The faulting processes queue up for the paging device, the ready queue empties, and **CPU utilization drops**.
4. The scheduler sees low utilization and **adds more processes**, which take even more frames, causing even more faults.

Throughput plunges, the page-fault rate soars, and the effective access time increases. No work gets done, because the processes spend all their time paging.

<figure class="fig">
<svg viewBox="0 0 450 232" width="450" role="img" aria-label="CPU utilization against degree of multiprogramming, dropping sharply when thrashing starts">
  <defs><marker id="arr-thr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="304" y="20" width="106" height="180" fill="#ef4444" opacity=".08"/>
  <polyline points="60,20 60,200 420,200" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="60" y1="200" x2="60" y2="14" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-thr)"/>
  <line x1="60" y1="200" x2="428" y2="200" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr-thr)"/>
  <path d="M60,196 C 130,110 230,52 300,50 C 340,49 355,90 395,198" stroke="#3b82f6" stroke-width="2" fill="none"/>
  <line x1="304" y1="50" x2="304" y2="200" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity=".6"/>
  <text x="298.0" y="42.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">maximum</text>
  <text x="357.0" y="36.0" text-anchor="middle" font-size="12" fill="#ef4444">thrashing</text>
  <text transform="rotate(-90 46 110)" x="46.0" y="110.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">CPU utilization</text>
  <text x="240.0" y="222.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">degree of multiprogramming</text>
</svg>
<figcaption>Thrashing (after Galvin, Fig. 9.18). CPU utilization grows with the degree of multiprogramming up to a maximum, then drops sharply. To stop thrashing, the degree of multiprogramming must be <em>decreased</em>.</figcaption>
</figure>

**Local replacement** limits the effect: a thrashing process cannot steal frames from others and make them thrash too. But it does not solve the problem, since the thrashing processes still crowd the paging-device queue, and the page-fault service time rises for everyone.

To prevent thrashing, a process must be given as many frames as it needs. To estimate how many, we use the **locality model**: a process moves from locality to locality, where a *locality* is a set of pages actively used together (e.g. a function's code, its local variables and some globals). If a process has enough frames for its current locality, it faults only until those pages are in, and then not again until it changes locality. If not, it thrashes.

##### Working-Set Model

The **working set** is the set of pages in the most recent $\Delta$ page references, the *working-set window*. A page in active use is in the working set; a page no longer used drops out $\Delta$ references after its last use. So the working set approximates the current locality.

<figure class="fig">
<svg viewBox="0 0 600 114" width="600" role="img" aria-label="Working-set model with a window of 10 references">
  <defs><marker id="arr-ws" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20.0" y="14.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">page reference table</text>
  <text x="27.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">2</text>
  <text x="42.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">6</text>
  <text x="57.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">1</text>
  <text x="72.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">5</text>
  <text x="87.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">7</text>
  <text x="102.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">7</text>
  <text x="117.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">7</text>
  <text x="132.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">7</text>
  <text x="147.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">5</text>
  <text x="162.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">1</text>
  <text x="177.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">6</text>
  <text x="192.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">2</text>
  <text x="207.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="222.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="237.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">1</text>
  <text x="252.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">2</text>
  <text x="267.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="282.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="297.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="312.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="327.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="342.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="357.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="372.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="387.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="402.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="417.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">1</text>
  <text x="432.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="447.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">2</text>
  <text x="462.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="477.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="492.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="507.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="522.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">3</text>
  <text x="537.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="552.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <text x="567.5" y="52.0" text-anchor="middle" font-size="13" fill="currentColor">4</text>
  <line x1="20" y1="58" x2="575" y2="58" stroke="currentColor" stroke-width="1" opacity=".5"/>
  <path d="M20,66 v6 h150 v-6" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="86.0" text-anchor="middle" font-size="12" fill="#3b82f6">Δ</text>
  <line x1="170" y1="34" x2="170" y2="66" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="170.0" y="30.0" text-anchor="middle" font-size="12" fill="#3b82f6">t₁</text>
  <text x="170.0" y="106.0" text-anchor="middle" font-size="12" fill="#3b82f6">WS(t₁) = {1, 2, 5, 6, 7}</text>
  <path d="M260,66 v6 h150 v-6" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <text x="335.0" y="86.0" text-anchor="middle" font-size="12" fill="#ef4444">Δ</text>
  <line x1="410" y1="34" x2="410" y2="66" stroke="#ef4444" stroke-width="1.5"/>
  <text x="410.0" y="30.0" text-anchor="middle" font-size="12" fill="#ef4444">t₂</text>
  <text x="410.0" y="106.0" text-anchor="middle" font-size="12" fill="#ef4444">WS(t₂) = {3, 4}</text>
</svg>
<figcaption>Working-set model (after Galvin, Fig. 9.20) with $\Delta = 10$ references.</figcaption>
</figure>

The choice of $\Delta$ matters: too small and it does not cover the whole locality; too large and it overlaps several localities (if $\Delta = \infty$, it is every page the process has touched).

If $WSS_i$ is the working-set size of process $i$, the total demand for frames is

$$D = \sum_i WSS_i$$

If $D > m$, the number of available frames, thrashing will occur. The OS gives each process frames for its working set; if there are frames left, it can start another process, and if $D$ exceeds $m$ it **suspends** a process and gives its frames to the others. This prevents thrashing while keeping the degree of multiprogramming as high as possible.

Tracking the exact moving window is expensive, so it is approximated with a timer interrupt and the reference bit. For example, with $\Delta = 10{,}000$ and an interrupt every 5000 references, the reference bits are copied and cleared at each interrupt, and a page with any of these bits set counts as in the working set.

##### Page-Fault Frequency

A more direct way to control thrashing is to control the **page-fault rate** itself. Set an upper and a lower bound on the desired rate for each process:

- if the rate is **above the upper bound**, the process needs more frames: give it another frame;
- if it is **below the lower bound**, it may have too many: take a frame away.

If the rate rises and no frames are free, a process is swapped out and its frames go to the processes with high fault rates.

<figure class="fig">
<svg viewBox="0 0 700 232" width="700" role="img" aria-label="Page-fault frequency with upper and lower bounds">
  <defs><marker id="arr-pff" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <polyline points="60,15 60,200 440,200" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M75,22 C 110,150 200,180 430,188" stroke="#3b82f6" stroke-width="2" fill="none"/>
  <line x1="60" y1="95" x2="440" y2="95" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="446.0" y="99.0" text-anchor="start" font-size="11" fill="currentColor">upper bound: above it, give the process a frame</text>
  <line x1="60" y1="165" x2="440" y2="165" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="446.0" y="169.0" text-anchor="start" font-size="11" fill="currentColor">lower bound: below it, take a frame away</text>
  <text x="68.0" y="18.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">page-fault rate</text>
  <text x="250.0" y="222.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">number of frames</text>
</svg>
<figcaption>Page-fault frequency (after Galvin, Fig. 9.21).</figcaption>
</figure>

#### Memory-Mapped Files

Reading a file with `open()`, `read()` and `write()` needs a system call and a disk access for every access. Instead, virtual memory can treat file I/O as ordinary memory accesses: **memory mapping** a file logically associates part of the virtual address space with the file.

- A disk block is mapped to a page in memory. The first access goes through ordinary demand paging: it page-faults, and a page-sized part of the file is read into a physical page.
- After that, reads and writes to the file are **routine memory accesses**, with no `read()`/`write()` system-call overhead.
- Writes to the mapped memory are not necessarily written to the disk at once. The OS may update the file when it checks whether the page has been modified (the dirty bit), and when the file is closed all mapped data are written back and removed from the process's virtual memory.

In UNIX/Linux this is done with the `mmap()` system call. Solaris goes further and memory-maps every file, even one accessed with `read()`/`write()` (into the kernel address space in that case).

**Sharing.** Several processes can map the same file at once. Each process's page table points to the **same physical page**, the one holding the copy of the disk block, so a write by one process is seen by all the others. Mapping can also be copy-on-write: processes share the file read-only, and get their own copy of any page they modify. Shared memory between processes is in fact often implemented by memory-mapping the same file into both address spaces.

<figure class="fig">
<svg viewBox="0 0 620 342" width="620" role="img" aria-label="Two processes mapping the same file onto the same physical pages">
  <defs><marker id="arr-mmap" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="30" y="30" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="47.0" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="30" y="56" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="73.0" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="30" y="82" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="99.0" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="30" y="108" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="125.0" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="30" y="134" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="151.0" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="30" y="160" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60.0" y="177.0" text-anchor="middle" font-size="12" fill="currentColor">6</text>
  <text x="60.0" y="204.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">process A</text>
  <text x="60.0" y="218.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">virtual memory</text>
  <rect x="530" y="30" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="47.0" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="530" y="56" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="73.0" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="530" y="82" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="99.0" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="530" y="108" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="125.0" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="530" y="134" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="151.0" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="530" y="160" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="560.0" y="177.0" text-anchor="middle" font-size="12" fill="currentColor">6</text>
  <text x="560.0" y="204.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">process B</text>
  <text x="560.0" y="218.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">virtual memory</text>
  <rect x="280" y="14" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="14" width="60" height="26" fill="#22c55e" opacity=".2"/>
  <text x="310.0" y="31.0" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="280" y="40" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="66" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="66" width="60" height="26" fill="#22c55e" opacity=".2"/>
  <text x="310.0" y="83.0" text-anchor="middle" font-size="12" fill="currentColor">6</text>
  <rect x="280" y="92" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="92" width="60" height="26" fill="#22c55e" opacity=".2"/>
  <text x="310.0" y="109.0" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="280" y="118" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="118" width="60" height="26" fill="#22c55e" opacity=".2"/>
  <text x="310.0" y="135.0" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="280" y="144" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="170" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="170" width="60" height="26" fill="#22c55e" opacity=".2"/>
  <text x="310.0" y="187.0" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="280" y="196" width="60" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="280" y="196" width="60" height="26" fill="#22c55e" opacity=".2"/>
  <text x="310.0" y="213.0" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <text x="310.0" y="238.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">physical memory</text>
  <line x1="90" y1="43.0" x2="280" y2="105.0" stroke="#3b82f6" stroke-width="1.2"/>
  <line x1="530" y1="43.0" x2="340" y2="105.0" stroke="#ef4444" stroke-width="1.2"/>
  <line x1="90" y1="69.0" x2="280" y2="209.0" stroke="#3b82f6" stroke-width="1.2"/>
  <line x1="530" y1="69.0" x2="340" y2="209.0" stroke="#ef4444" stroke-width="1.2"/>
  <line x1="90" y1="95.0" x2="280" y2="27.0" stroke="#3b82f6" stroke-width="1.2"/>
  <line x1="530" y1="95.0" x2="340" y2="27.0" stroke="#ef4444" stroke-width="1.2"/>
  <line x1="90" y1="121.0" x2="280" y2="183.0" stroke="#3b82f6" stroke-width="1.2"/>
  <line x1="530" y1="121.0" x2="340" y2="183.0" stroke="#ef4444" stroke-width="1.2"/>
  <line x1="90" y1="147.0" x2="280" y2="131.0" stroke="#3b82f6" stroke-width="1.2"/>
  <line x1="530" y1="147.0" x2="340" y2="131.0" stroke="#ef4444" stroke-width="1.2"/>
  <line x1="90" y1="173.0" x2="280" y2="79.0" stroke="#3b82f6" stroke-width="1.2"/>
  <line x1="530" y1="173.0" x2="340" y2="79.0" stroke="#ef4444" stroke-width="1.2"/>
  <rect x="220" y="290" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235.0" y="306.0" text-anchor="middle" font-size="12" fill="currentColor">1</text>
  <rect x="250" y="290" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="265.0" y="306.0" text-anchor="middle" font-size="12" fill="currentColor">2</text>
  <rect x="280" y="290" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="295.0" y="306.0" text-anchor="middle" font-size="12" fill="currentColor">3</text>
  <rect x="310" y="290" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="325.0" y="306.0" text-anchor="middle" font-size="12" fill="currentColor">4</text>
  <rect x="340" y="290" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="355.0" y="306.0" text-anchor="middle" font-size="12" fill="currentColor">5</text>
  <rect x="370" y="290" width="30" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="306.0" text-anchor="middle" font-size="12" fill="currentColor">6</text>
  <text x="310.0" y="330.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">disk file</text>
  <line x1="310" y1="288" x2="310" y2="246" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-mmap)"/>
  <text x="318.0" y="274.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">pages read in on demand</text>
</svg>
<figcaption>Memory-mapped files (after Galvin, Fig. 9.22). Pages 1–6 of the file appear in the virtual memory of both processes, and both page tables point to the same physical pages.</figcaption>
</figure>

##### Memory-Mapped I/O

The same idea is used for devices. Each I/O controller has registers for commands and data. With **memory-mapped I/O**, a range of memory addresses is set aside and mapped to the device registers, so reading or writing those addresses transfers data to and from the device. This suits fast devices such as video controllers: on the IBM PC each screen location is mapped to a memory location.

To send a string of bytes through a memory-mapped serial port, the CPU writes a byte to the data register and sets a bit in the control register; the device takes the byte and clears the bit when it is ready for the next one.

- If the CPU **polls** the control bit, looping until the device is ready, this is **programmed I/O (PIO)**.
- If the CPU instead receives an **interrupt** when the device is ready, the transfer is **interrupt driven**.

#### Allocating Kernel Memory

A user process gets memory from the kernel's list of free page frames, which are scattered through physical memory; a request for one byte still gets a whole frame. Kernel memory is usually allocated from a **separate free-memory pool**, for two reasons:

1. The kernel requests memory for data structures of **varying sizes**, many smaller than a page. It must use memory conservatively and minimize fragmentation, especially since kernel code and data are often not paged.
2. Some hardware devices access physical memory directly, without virtual memory, so they may need **physically contiguous** pages.

Two strategies for managing this memory are the buddy system and slab allocation.

##### Buddy System

The buddy system allocates from a fixed-size segment of physically contiguous pages, using a **power-of-2 allocator**: requests are satisfied in units of 4 KB, 8 KB, 16 KB, …, and a request of any other size is **rounded up** to the next power of 2 (11 KB gets 16 KB).

<div class="example">

The segment is 256 KB and the kernel requests 21 KB.

</div>

The segment is split into two **buddies** $A_L$ and $A_R$ of 128 KB. $A_L$ is split into $B_L$ and $B_R$ of 64 KB. The next power of 2 above 21 KB is 32 KB, so $B_L$ is split once more into $C_L$ and $C_R$ of 32 KB, and $C_L$ satisfies the request.

<figure class="fig">
<svg viewBox="0 0 520 214" width="520" role="img" aria-label="Buddy system splitting 256 KB to satisfy a 21 KB request">
  <defs><marker id="arr-bud" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20.0" y="14" width="480.0" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor">256 KB</text>
  <rect x="20.0" y="66" width="240.0" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140.0" y="85.0" text-anchor="middle" font-size="11" fill="currentColor">A<tspan baseline-shift="sub" font-size="9">L</tspan> 128 KB</text>
  <line x1="260.0" y1="44" x2="140.0" y2="66" stroke="currentColor" stroke-width="1" opacity=".6"/>
  <rect x="260.0" y="66" width="240.0" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="85.0" text-anchor="middle" font-size="11" fill="currentColor">A<tspan baseline-shift="sub" font-size="9">R</tspan> 128 KB</text>
  <line x1="260.0" y1="44" x2="380.0" y2="66" stroke="currentColor" stroke-width="1" opacity=".6"/>
  <rect x="20.0" y="118" width="120.0" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="80.0" y="137.0" text-anchor="middle" font-size="11" fill="currentColor">B<tspan baseline-shift="sub" font-size="9">L</tspan> 64 KB</text>
  <line x1="140.0" y1="96" x2="80.0" y2="118" stroke="currentColor" stroke-width="1" opacity=".6"/>
  <rect x="140.0" y="118" width="120.0" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="200.0" y="137.0" text-anchor="middle" font-size="11" fill="currentColor">B<tspan baseline-shift="sub" font-size="9">R</tspan> 64 KB</text>
  <line x1="140.0" y1="96" x2="200.0" y2="118" stroke="currentColor" stroke-width="1" opacity=".6"/>
  <rect x="20.0" y="170" width="60.0" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20.0" y="170" width="39.375" height="30" fill="#ef4444" opacity=".3"/>
  <text x="50.0" y="189.0" text-anchor="middle" font-size="11" fill="currentColor">C<tspan baseline-shift="sub" font-size="9">L</tspan> 32 KB</text>
  <line x1="80.0" y1="148" x2="50.0" y2="170" stroke="currentColor" stroke-width="1" opacity=".6"/>
  <rect x="80.0" y="170" width="60.0" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="110.0" y="189.0" text-anchor="middle" font-size="11" fill="currentColor">C<tspan baseline-shift="sub" font-size="9">R</tspan> 32 KB</text>
  <line x1="80.0" y1="148" x2="110.0" y2="170" stroke="currentColor" stroke-width="1" opacity=".6"/>
  <text x="158.8" y="189.0" text-anchor="start" font-size="11" fill="#ef4444">21 KB used, 11 KB wasted</text>
</svg>
<figcaption>Buddy system allocation (after Galvin, Fig. 9.26). $C_L$ is allocated to the 21 KB request.</figcaption>
</figure>

- **Advantage: coalescing.** Adjacent buddies can be combined quickly. When $C_L$ is released, $C_L$ and $C_R$ coalesce into the 64 KB $B_L$, which coalesces with $B_R$ into 128 KB, and so on back to 256 KB.
- **Drawback: internal fragmentation.** Rounding up wastes space inside the allocated unit: a 33 KB request gets 64 KB. Up to about 50% of an allocated unit can be wasted.

##### Slab Allocation

- A **slab** is one or more physically contiguous pages.
- A **cache** consists of one or more slabs. There is one cache for each kind of kernel data structure (process descriptors, file objects, semaphores, …).
- Each cache is filled with **objects**, instances of its data structure.

<figure class="fig">
<svg viewBox="0 0 540 316" width="540" role="img" aria-label="Slab allocation: kernel objects, caches and slabs">
  <defs><marker id="arr-slab" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="60.0" y="16.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">kernel objects</text>
  <text x="250.0" y="16.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">caches</text>
  <text x="450.0" y="16.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">slabs</text>
  <rect x="45" y="40" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="45" y="40" width="30" height="30" fill="#3b82f6" opacity=".25"/>
  <rect x="45" y="80" width="30" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="45" y="80" width="30" height="30" fill="#3b82f6" opacity=".25"/>
  <text x="60.0" y="128.0" text-anchor="middle" font-size="11" fill="currentColor">3 KB objects</text>
  <rect x="35" y="150" width="50" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="35" y="150" width="50" height="40" fill="#f59e0b" opacity=".25"/>
  <rect x="35" y="200" width="50" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="35" y="200" width="50" height="40" fill="#f59e0b" opacity=".25"/>
  <rect x="35" y="250" width="50" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="35" y="250" width="50" height="40" fill="#f59e0b" opacity=".25"/>
  <text x="60.0" y="306.0" text-anchor="middle" font-size="11" fill="currentColor">7 KB objects</text>
  <rect x="190" y="45" width="120" height="60" rx="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="80.0" text-anchor="middle" font-size="12" fill="currentColor">3 KB cache</text>
  <rect x="190" y="185" width="120" height="80" rx="8" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250.0" y="230.0" text-anchor="middle" font-size="12" fill="currentColor">7 KB cache</text>
  <line x1="78" y1="55" x2="187" y2="75" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="78" y1="95" x2="187" y2="75" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="88" y1="170" x2="187" y2="225" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="88" y1="220" x2="187" y2="225" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="88" y1="270" x2="187" y2="225" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <rect x="400" y="40" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="40" width="28" height="26" fill="#3b82f6" opacity=".25"/>
  <rect x="428" y="40" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="428" y="40" width="28" height="26" fill="#3b82f6" opacity=".25"/>
  <rect x="456" y="40" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="456" y="40" width="28" height="26" fill="#3b82f6" opacity=".25"/>
  <rect x="400" y="80" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="80" width="28" height="26" fill="#3b82f6" opacity=".25"/>
  <rect x="428" y="80" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="428" y="80" width="28" height="26" fill="#3b82f6" opacity=".25"/>
  <rect x="456" y="80" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="456" y="80" width="28" height="26" fill="#3b82f6" opacity=".25"/>
  <rect x="400" y="180" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="180" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="428" y="180" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="428" y="180" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="456" y="180" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="456" y="180" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="484" y="180" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="484" y="180" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="400" y="220" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="220" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="428" y="220" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="428" y="220" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="456" y="220" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="456" y="220" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="484" y="220" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="484" y="220" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="400" y="260" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="400" y="260" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="428" y="260" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="428" y="260" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="456" y="260" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="456" y="260" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <rect x="484" y="260" width="28" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="484" y="260" width="28" height="26" fill="#f59e0b" opacity=".25"/>
  <line x1="310" y1="75" x2="397" y2="53" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="310" y1="75" x2="397" y2="93" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="310" y1="225" x2="397" y2="193" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="310" y1="225" x2="397" y2="233" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <line x1="310" y1="225" x2="397" y2="273" stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-slab)"/>
  <text x="456.0" y="306.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">physically contiguous pages</text>
</svg>
<figcaption>Slab allocation (after Galvin, Fig. 9.27): two 3 KB objects and three 7 KB objects, each kind in its own cache.</figcaption>
</figure>

When a cache is created, a number of objects, all marked **free**, are allocated to it; how many depends on the slab size (a 12 KB slab of three 4 KB pages holds six 2 KB objects). When the kernel needs an object, the allocator hands out any free object from the cache and marks it **used**. For example, a new Linux task needs a `struct task_struct` (about 1.7 KB), which comes ready-made from the `task_struct` cache.

In Linux a slab is **full** (all objects used), **empty** (all free) or **partial**. A request is served first from a partial slab, then from an empty one, and only if neither exists is a new slab allocated from contiguous physical pages.

The two main benefits:

1. **No memory is wasted to fragmentation:** each cache is divided into chunks of exactly the object's size, so the kernel gets exactly the memory the object needs.
2. **Requests are satisfied quickly:** objects are created in advance, and a released object is just marked free and returned to its cache, ready for the next request. This suits the kernel, which allocates and frees objects very often.

The slab allocator first appeared in Solaris 2.4; Linux used the buddy system until version 2.2 and then adopted slab allocation. Linux now also has **SLOB** (for systems with little memory) and **SLUB**, the default since 2.6.24, which reduces the overhead of SLAB.

## Storage Management

### Mass-Storage Structure

#### Disk Structure

##### Magnetic Disks

A disk has one or more **platters**, each with two magnetic surfaces, on a common **spindle**. A **read–write head** flies just above each surface. All heads are attached to one **disk arm** and move together.

- Each surface is divided into concentric **tracks**, and each track into **sectors**.
- The set of tracks at one arm position (the same track on every surface) is a **cylinder**.

<figure class="fig">
<svg viewBox="0 0 720 300" width="720" role="img" aria-label="Moving-head disk: top view of a surface and side view of platters and arm">
  <defs><marker id="arr-disk" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <circle cx="130" cy="135" r="105" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="130" cy="135" r="90" stroke="currentColor" stroke-width="1" fill="none" opacity=".45"/>
  <circle cx="130" cy="135" r="75" stroke="currentColor" stroke-width="1" fill="none" opacity=".45"/>
  <circle cx="130" cy="135" r="45" stroke="currentColor" stroke-width="1" fill="none" opacity=".45"/>
  <circle cx="130" cy="135" r="30" stroke="currentColor" stroke-width="1" fill="none" opacity=".45"/>
  <circle cx="130" cy="135" r="60" stroke="#3b82f6" stroke-width="3" fill="none"/>
  <path d="M66.1,111.7 A68,68 0 0 1 91.0,79.3 L100.2,92.4 A52,52 0 0 0 81.1,117.2 Z" fill="#ef4444" opacity=".55"/>
  <circle cx="130" cy="135" r="8" fill="currentColor"/>
  <text x="22.0" y="40.0" text-anchor="start" font-size="12" fill="#ef4444">sector s</text>
  <line x1="60" y1="46" x2="83.1" y2="102.1" stroke="#ef4444" stroke-width="1"/>
  <text x="238.0" y="40.0" text-anchor="end" font-size="12" fill="#3b82f6">track t</text>
  <line x1="214" y1="46" x2="164.4" y2="85.9" stroke="#3b82f6" stroke-width="1"/>
  <path d="M188.0,235.5 A116,116 0 0 1 72.0,235.5" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-disk)"/>
  <text x="130.0" y="270.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">rotation</text>
  <text x="130.0" y="290.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">one surface (top view)</text>
  <line x1="420" y1="40" x2="420" y2="232" stroke="currentColor" stroke-width="5"/>
  <text x="420.0" y="30.0" text-anchor="middle" font-size="11" fill="currentColor">spindle</text>
  <rect x="310" y="76" width="220" height="8" rx="2" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.2"/>
  <rect x="310" y="136" width="220" height="8" rx="2" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.2"/>
  <rect x="310" y="196" width="220" height="8" rx="2" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.2"/>
  <text x="302.0" y="84.0" text-anchor="end" font-size="11" fill="currentColor">platter</text>
  <line x1="600" y1="56" x2="600" y2="224" stroke="currentColor" stroke-width="4"/>
  <text x="600.0" y="46.0" text-anchor="middle" font-size="11" fill="currentColor">arm assembly</text>
  <line x1="500" y1="68" x2="600" y2="68" stroke="currentColor" stroke-width="2"/>
  <rect x="494" y="65" width="10" height="6" fill="currentColor"/>
  <line x1="500" y1="92" x2="600" y2="92" stroke="currentColor" stroke-width="2"/>
  <rect x="494" y="89" width="10" height="6" fill="currentColor"/>
  <line x1="500" y1="128" x2="600" y2="128" stroke="currentColor" stroke-width="2"/>
  <rect x="494" y="125" width="10" height="6" fill="currentColor"/>
  <line x1="500" y1="152" x2="600" y2="152" stroke="currentColor" stroke-width="2"/>
  <rect x="494" y="149" width="10" height="6" fill="currentColor"/>
  <line x1="500" y1="188" x2="600" y2="188" stroke="currentColor" stroke-width="2"/>
  <rect x="494" y="185" width="10" height="6" fill="currentColor"/>
  <line x1="500" y1="212" x2="600" y2="212" stroke="currentColor" stroke-width="2"/>
  <rect x="494" y="209" width="10" height="6" fill="currentColor"/>
  <text x="608.0" y="131.0" text-anchor="start" font-size="11" fill="currentColor">arm</text>
  <text x="608.0" y="234.0" text-anchor="start" font-size="11" fill="currentColor">read–write heads</text>
  <line x1="606" y1="224" x2="506" y2="214" stroke="currentColor" stroke-width="1"/>
  <rect x="490" y="70" width="14" height="140" stroke="#3b82f6" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <rect x="336" y="70" width="14" height="140" stroke="#3b82f6" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <text x="420.0" y="262.0" text-anchor="middle" font-size="11" fill="#3b82f6">cylinder c: the tracks under all heads</text>
  <text x="480.0" y="290.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">platters and arm (side view)</text>
</svg>
<figcaption>Moving-head disk (after Galvin, Fig. 10.1). Left: one surface, with a track and a sector on it. Right: the platters on the spindle and the heads on the arm assembly; the tracks under the heads at one arm position form a cylinder.</figcaption>
</figure>

If a head touches the surface it damages it. This is a **head crash**, and the disk usually has to be replaced.

The disk is addressed as a one-dimensional array of **logical blocks** (usually 512 B), the smallest unit of transfer. The array is mapped onto the sectors in order: sector 0 is the first sector of the first track of the outermost cylinder, then the rest of that track, then the other tracks of that cylinder, then the next cylinder inward. With $H$ surfaces and $S$ sectors per track, block $b$ is at

$$\text{cylinder} = \left\lfloor \frac{b}{HS} \right\rfloor, \qquad \text{surface} = \left\lfloor \frac{b}{S} \right\rfloor \bmod H, \qquad \text{sector} = b \bmod S.$$

In practice this is only approximate: bad sectors are replaced by spares elsewhere on the disk, and outer tracks hold more sectors than inner ones. (Hard disks keep the rotation speed constant, *constant angular velocity*; CDs and DVDs vary it to keep the bit density constant, *constant linear velocity*.)

$$\text{Capacity} = \text{surfaces} \times \frac{\text{tracks}}{\text{surface}} \times \frac{\text{sectors}}{\text{track}} \times \frac{\text{bytes}}{\text{sector}}$$

##### Disk Access Time

To read a sector, the arm first moves to the right cylinder, then waits for the sector to come under the head, then reads it:

- **Seek time:** time to move the heads to the cylinder.
- **Rotational latency:** once the head is on the track, the time for the sector to rotate under it. In the best case it is 0 (the sector is just arriving), in the worst case a full rotation (it has just passed), and on average **half a rotation**. For example, at 3600 RPM one rotation takes $60/3600$ s $= 16.7$ ms, so the average latency is $8.3$ ms.
- **Transfer time:** time for the sector to pass under the head.

$$T_{\text{access}} = T_{\text{seek}} + \frac{1}{2}\cdot\frac{60}{\text{RPM}} + \frac{\text{bytes to transfer}}{\text{transfer rate}}, \qquad \text{transfer rate} = \frac{\text{bytes}}{\text{track}} \times \frac{\text{RPM}}{60}$$

Seek time plus rotational latency is the **positioning time** (or random-access time). The **disk bandwidth** is the total number of bytes transferred, divided by the time from the first request to the completion of the last transfer.

<div class="example">

A disk has 512 B sectors, 64 sectors per track, 2000 tracks per surface, three double-sided platters and an average seek time of 10 ms. It spins at 7200 RPM, and one track of data can be transferred per revolution.

1. What is the capacity of the disk?
2. What is the transfer rate?
3. What is the average time to read one sector?

</div>

**Capacity.**

- Bytes per track $= 512 \times 64 = 32$ KB.
- Bytes per surface $= 32 \text{ KB} \times 2000 = 64{,}000$ KB.
- Surfaces $= 3 \times 2 = 6$, so the capacity is $6 \times 64{,}000 \text{ KB} = 384{,}000$ KB.

**Transfer rate.** One rotation takes $60/7200$ s $= 8.33$ ms, and one track (32 KB) passes under the head in that time:

$$\text{transfer rate} = \frac{32 \text{ KB}}{8.33 \text{ ms}} \approx 3840 \text{ KB/s}$$

Divide by the time of a **full** rotation, not by the average rotational latency (4.17 ms): a track is read in one whole revolution.

**Access time.** The average rotational latency is $8.33/2 = 4.17$ ms, and one sector takes $1/64$ of a rotation, $8.33/64 = 0.13$ ms:

$$T_{\text{access}} = 10 + 4.17 + 0.13 \approx 14.3 \text{ ms}$$

Almost all of it is positioning, which is why the order in which requests are served matters.

> **Note.** A **solid-state disk (SSD)** is nonvolatile memory used like a hard disk. It has no moving parts, so there is no seek time or rotational latency. It uses less power, but costs more per MB and may wear out sooner.

#### Disk Scheduling

A disk I/O request is a system call that gives: input or output, the disk address, the memory address, and the number of sectors. If the disk is busy, the request goes into the disk's queue of pending requests, and when one request finishes the OS chooses which one to serve next. The algorithms below choose so as to reduce the **total head movement** (seek distance).

All examples use Galvin's request queue on a disk with cylinders 0–199, with the head at cylinder 53:

$$98,\ 183,\ 37,\ 122,\ 14,\ 124,\ 65,\ 67$$

##### FCFS

Serve requests in the order they arrive. It is fair, but does not give the fastest service.

<figure class="fig">
<svg viewBox="0 0 600 226" width="600" role="img" aria-label="FCFS head movement">
  <defs><marker id="arr-fcfs" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="30.0" y1="30" x2="577.25" y2="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="30.0" y1="26" x2="30.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <line x1="68.5" y1="26" x2="68.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="68.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <line x1="131.8" y1="26" x2="131.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="131.8" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">37</text>
  <line x1="175.8" y1="26" x2="175.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.8" y="18.0" text-anchor="middle" font-size="11" fill="#ef4444">53</text>
  <line x1="208.8" y1="26" x2="208.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="207.8" y="18.0" text-anchor="end" font-size="11" fill="currentColor">65</text>
  <line x1="214.2" y1="26" x2="214.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.2" y="18.0" text-anchor="start" font-size="11" fill="currentColor">67</text>
  <line x1="299.5" y1="26" x2="299.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="299.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">98</text>
  <line x1="365.5" y1="26" x2="365.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="364.5" y="18.0" text-anchor="end" font-size="11" fill="currentColor">122</text>
  <line x1="371.0" y1="26" x2="371.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="372.0" y="18.0" text-anchor="start" font-size="11" fill="currentColor">124</text>
  <line x1="533.2" y1="26" x2="533.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="533.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">183</text>
  <line x1="577.2" y1="26" x2="577.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="577.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">199</text>
  <line x1="175.8" y1="50" x2="299.5" y2="70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <line x1="299.5" y1="70" x2="533.2" y2="90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <line x1="533.2" y1="90" x2="131.8" y2="110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <line x1="131.8" y1="110" x2="365.5" y2="130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <line x1="365.5" y1="130" x2="68.5" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <line x1="68.5" y1="150" x2="371.0" y2="170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <line x1="371.0" y1="170" x2="208.8" y2="190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <line x1="208.8" y1="190" x2="214.2" y2="210" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fcfs)"/>
  <circle cx="175.8" cy="50" r="4" fill="#ef4444"/>
  <circle cx="299.5" cy="70" r="3" fill="currentColor"/>
  <circle cx="533.2" cy="90" r="3" fill="currentColor"/>
  <circle cx="131.8" cy="110" r="3" fill="currentColor"/>
  <circle cx="365.5" cy="130" r="3" fill="currentColor"/>
  <circle cx="68.5" cy="150" r="3" fill="currentColor"/>
  <circle cx="371.0" cy="170" r="3" fill="currentColor"/>
  <circle cx="208.8" cy="190" r="3" fill="currentColor"/>
  <circle cx="214.2" cy="210" r="3" fill="currentColor"/>
</svg>
<figcaption>FCFS disk scheduling (after Galvin, Fig. 10.4). Total head movement: 640 cylinders.</figcaption>
</figure>

The swing from 122 to 14 and back to 124 shows the problem: serving 37 and 14 together, before or after 122 and 124, would save a lot of movement.

##### Shortest Seek Time First (SSTF)

Serve the pending request **closest to the current head position**. From 53 the closest is 65, then 67, then 37 (closer than 98), then 14, 98, 122, 124 and 183.

<figure class="fig">
<svg viewBox="0 0 600 226" width="600" role="img" aria-label="SSTF head movement">
  <defs><marker id="arr-sstf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="30.0" y1="30" x2="577.25" y2="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="30.0" y1="26" x2="30.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <line x1="68.5" y1="26" x2="68.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="68.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <line x1="131.8" y1="26" x2="131.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="131.8" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">37</text>
  <line x1="175.8" y1="26" x2="175.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.8" y="18.0" text-anchor="middle" font-size="11" fill="#ef4444">53</text>
  <line x1="208.8" y1="26" x2="208.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="207.8" y="18.0" text-anchor="end" font-size="11" fill="currentColor">65</text>
  <line x1="214.2" y1="26" x2="214.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.2" y="18.0" text-anchor="start" font-size="11" fill="currentColor">67</text>
  <line x1="299.5" y1="26" x2="299.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="299.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">98</text>
  <line x1="365.5" y1="26" x2="365.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="364.5" y="18.0" text-anchor="end" font-size="11" fill="currentColor">122</text>
  <line x1="371.0" y1="26" x2="371.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="372.0" y="18.0" text-anchor="start" font-size="11" fill="currentColor">124</text>
  <line x1="533.2" y1="26" x2="533.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="533.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">183</text>
  <line x1="577.2" y1="26" x2="577.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="577.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">199</text>
  <line x1="175.8" y1="50" x2="208.8" y2="70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <line x1="208.8" y1="70" x2="214.2" y2="90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <line x1="214.2" y1="90" x2="131.8" y2="110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <line x1="131.8" y1="110" x2="68.5" y2="130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <line x1="68.5" y1="130" x2="299.5" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <line x1="299.5" y1="150" x2="365.5" y2="170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <line x1="365.5" y1="170" x2="371.0" y2="190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <line x1="371.0" y1="190" x2="533.2" y2="210" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-sstf)"/>
  <circle cx="175.8" cy="50" r="4" fill="#ef4444"/>
  <circle cx="208.8" cy="70" r="3" fill="currentColor"/>
  <circle cx="214.2" cy="90" r="3" fill="currentColor"/>
  <circle cx="131.8" cy="110" r="3" fill="currentColor"/>
  <circle cx="68.5" cy="130" r="3" fill="currentColor"/>
  <circle cx="299.5" cy="150" r="3" fill="currentColor"/>
  <circle cx="365.5" cy="170" r="3" fill="currentColor"/>
  <circle cx="371.0" cy="190" r="3" fill="currentColor"/>
  <circle cx="533.2" cy="210" r="3" fill="currentColor"/>
</svg>
<figcaption>SSTF disk scheduling (after Galvin, Fig. 10.5). Total head movement: 12 + 2 + 30 + 23 + 84 + 24 + 2 + 59 = 236 cylinders.</figcaption>
</figure>

SSTF is essentially SJF for the disk, and like SJF:

- It can cause **starvation**: a steady stream of requests near the head can keep a far request (say at 186) waiting forever.
- It is not optimal: going 53 → 37 → 14 first and then 65, …, 183 gives only 208 cylinders.

##### SCAN (Elevator)

The arm starts at one end and moves to the other end, serving requests as it reaches each cylinder, then reverses. Like an elevator, it serves everything going up, then everything going down. The direction of movement must be given; here the arm moves toward 0.

<figure class="fig">
<svg viewBox="0 0 600 246" width="600" role="img" aria-label="SCAN head movement">
  <defs><marker id="arr-scan" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="30.0" y1="30" x2="577.25" y2="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="30.0" y1="26" x2="30.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <line x1="68.5" y1="26" x2="68.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="68.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <line x1="131.8" y1="26" x2="131.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="131.8" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">37</text>
  <line x1="175.8" y1="26" x2="175.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.8" y="18.0" text-anchor="middle" font-size="11" fill="#ef4444">53</text>
  <line x1="208.8" y1="26" x2="208.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="207.8" y="18.0" text-anchor="end" font-size="11" fill="currentColor">65</text>
  <line x1="214.2" y1="26" x2="214.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.2" y="18.0" text-anchor="start" font-size="11" fill="currentColor">67</text>
  <line x1="299.5" y1="26" x2="299.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="299.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">98</text>
  <line x1="365.5" y1="26" x2="365.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="364.5" y="18.0" text-anchor="end" font-size="11" fill="currentColor">122</text>
  <line x1="371.0" y1="26" x2="371.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="372.0" y="18.0" text-anchor="start" font-size="11" fill="currentColor">124</text>
  <line x1="533.2" y1="26" x2="533.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="533.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">183</text>
  <line x1="577.2" y1="26" x2="577.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="577.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">199</text>
  <line x1="175.8" y1="50" x2="131.8" y2="70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="131.8" y1="70" x2="68.5" y2="90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="68.5" y1="90" x2="30.0" y2="110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="30.0" y1="110" x2="208.8" y2="130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="208.8" y1="130" x2="214.2" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="214.2" y1="150" x2="299.5" y2="170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="299.5" y1="170" x2="365.5" y2="190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="365.5" y1="190" x2="371.0" y2="210" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="371.0" y1="210" x2="533.2" y2="230" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <circle cx="175.8" cy="50" r="4" fill="#ef4444"/>
  <circle cx="131.8" cy="70" r="3" fill="currentColor"/>
  <circle cx="68.5" cy="90" r="3" fill="currentColor"/>
  <circle cx="30.0" cy="110" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <circle cx="208.8" cy="130" r="3" fill="currentColor"/>
  <circle cx="214.2" cy="150" r="3" fill="currentColor"/>
  <circle cx="299.5" cy="170" r="3" fill="currentColor"/>
  <circle cx="365.5" cy="190" r="3" fill="currentColor"/>
  <circle cx="371.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="533.2" cy="230" r="3" fill="currentColor"/>
</svg>
<figcaption>SCAN disk scheduling (after Galvin, Fig. 10.6). The head serves 37 and 14, goes on to 0, then reverses. Total: (53 − 0) + (183 − 0) = 236 cylinders.</figcaption>
</figure>

A request just in front of the head is served almost at once; one just behind it waits for the arm to reach the end and come back.

##### C-SCAN

When SCAN reverses, the cylinders just in front of the head were served only a moment ago, and the requests that have waited longest are at the **other** end. *Circular SCAN* goes there directly: it serves requests in one direction only, and at the end it returns to the beginning **without serving anything** on the way back. The cylinders are treated as a circular list, which gives a more uniform wait time.

<figure class="fig">
C<svg viewBox="0 0 600 246" width="600" role="img" aria-label="SCAN head movement">
  <defs><marker id="arr-scan" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="30.0" y1="30" x2="577.25" y2="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="30.0" y1="26" x2="30.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <line x1="68.5" y1="26" x2="68.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="68.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <line x1="131.8" y1="26" x2="131.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="131.8" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">37</text>
  <line x1="175.8" y1="26" x2="175.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.8" y="18.0" text-anchor="middle" font-size="11" fill="#ef4444">53</text>
  <line x1="208.8" y1="26" x2="208.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="207.8" y="18.0" text-anchor="end" font-size="11" fill="currentColor">65</text>
  <line x1="214.2" y1="26" x2="214.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.2" y="18.0" text-anchor="start" font-size="11" fill="currentColor">67</text>
  <line x1="299.5" y1="26" x2="299.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="299.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">98</text>
  <line x1="365.5" y1="26" x2="365.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="364.5" y="18.0" text-anchor="end" font-size="11" fill="currentColor">122</text>
  <line x1="371.0" y1="26" x2="371.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="372.0" y="18.0" text-anchor="start" font-size="11" fill="currentColor">124</text>
  <line x1="533.2" y1="26" x2="533.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="533.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">183</text>
  <line x1="577.2" y1="26" x2="577.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="577.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">199</text>
  <line x1="175.8" y1="50" x2="131.8" y2="70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="131.8" y1="70" x2="68.5" y2="90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="68.5" y1="90" x2="30.0" y2="110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="30.0" y1="110" x2="208.8" y2="130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="208.8" y1="130" x2="214.2" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="214.2" y1="150" x2="299.5" y2="170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="299.5" y1="170" x2="365.5" y2="190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="365.5" y1="190" x2="371.0" y2="210" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <line x1="371.0" y1="210" x2="533.2" y2="230" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-scan)"/>
  <circle cx="175.8" cy="50" r="4" fill="#ef4444"/>
  <circle cx="131.8" cy="70" r="3" fill="currentColor"/>
  <circle cx="68.5" cy="90" r="3" fill="currentColor"/>
  <circle cx="30.0" cy="110" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <circle cx="208.8" cy="130" r="3" fill="currentColor"/>
  <circle cx="214.2" cy="150" r="3" fill="currentColor"/>
  <circle cx="299.5" cy="170" r="3" fill="currentColor"/>
  <circle cx="365.5" cy="190" r="3" fill="currentColor"/>
  <circle cx="371.0" cy="210" r="3" fill="currentColor"/>
  <circle cx="533.2" cy="230" r="3" fill="currentColor"/>
</svg>
<figcaption>C-SCAN disk scheduling (after Galvin, Fig. 10.7), moving toward 199. The dashed line is the return sweep. Total: (199 − 53) + 199 + 37 = 382 cylinders, or 183 if the return sweep is not counted.</figcaption>
</figure>

##### LOOK and C-LOOK

SCAN and C-SCAN go all the way to the end of the disk. In practice the arm goes only as far as the **last request** in each direction and then turns around. These versions are called **LOOK** and **C-LOOK**, because they look for a request before moving on in a direction.

<figure class="fig">
<svg viewBox="0 0 600 226" width="600" role="img" aria-label="LOOK head movement">
  <defs><marker id="arr-look" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="30.0" y1="30" x2="577.25" y2="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="30.0" y1="26" x2="30.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <line x1="68.5" y1="26" x2="68.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="68.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <line x1="131.8" y1="26" x2="131.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="131.8" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">37</text>
  <line x1="175.8" y1="26" x2="175.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.8" y="18.0" text-anchor="middle" font-size="11" fill="#ef4444">53</text>
  <line x1="208.8" y1="26" x2="208.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="207.8" y="18.0" text-anchor="end" font-size="11" fill="currentColor">65</text>
  <line x1="214.2" y1="26" x2="214.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.2" y="18.0" text-anchor="start" font-size="11" fill="currentColor">67</text>
  <line x1="299.5" y1="26" x2="299.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="299.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">98</text>
  <line x1="365.5" y1="26" x2="365.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="364.5" y="18.0" text-anchor="end" font-size="11" fill="currentColor">122</text>
  <line x1="371.0" y1="26" x2="371.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="372.0" y="18.0" text-anchor="start" font-size="11" fill="currentColor">124</text>
  <line x1="533.2" y1="26" x2="533.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="533.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">183</text>
  <line x1="577.2" y1="26" x2="577.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="577.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">199</text>
  <line x1="175.8" y1="50" x2="131.8" y2="70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="131.8" y1="70" x2="68.5" y2="90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="68.5" y1="90" x2="208.8" y2="110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="208.8" y1="110" x2="214.2" y2="130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="214.2" y1="130" x2="299.5" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="299.5" y1="150" x2="365.5" y2="170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="365.5" y1="170" x2="371.0" y2="190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="371.0" y1="190" x2="533.2" y2="210" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <circle cx="175.8" cy="50" r="4" fill="#ef4444"/>
  <circle cx="131.8" cy="70" r="3" fill="currentColor"/>
  <circle cx="68.5" cy="90" r="3" fill="currentColor"/>
  <circle cx="208.8" cy="110" r="3" fill="currentColor"/>
  <circle cx="214.2" cy="130" r="3" fill="currentColor"/>
  <circle cx="299.5" cy="150" r="3" fill="currentColor"/>
  <circle cx="365.5" cy="170" r="3" fill="currentColor"/>
  <circle cx="371.0" cy="190" r="3" fill="currentColor"/>
  <circle cx="533.2" cy="210" r="3" fill="currentColor"/>
</svg>
<figcaption>LOOK, moving toward 0: the arm turns at 14 instead of 0. Total: (53 − 14) + (183 − 14) = 208 cylinders.</figcaption>
</figure>

<figure class="fig">
C<svg viewBox="0 0 600 226" width="600" role="img" aria-label="LOOK head movement">
  <defs><marker id="arr-look" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="30.0" y1="30" x2="577.25" y2="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="30.0" y1="26" x2="30.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30.0" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <line x1="68.5" y1="26" x2="68.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="68.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <line x1="131.8" y1="26" x2="131.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="131.8" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">37</text>
  <line x1="175.8" y1="26" x2="175.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.8" y="18.0" text-anchor="middle" font-size="11" fill="#ef4444">53</text>
  <line x1="208.8" y1="26" x2="208.8" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="207.8" y="18.0" text-anchor="end" font-size="11" fill="currentColor">65</text>
  <line x1="214.2" y1="26" x2="214.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.2" y="18.0" text-anchor="start" font-size="11" fill="currentColor">67</text>
  <line x1="299.5" y1="26" x2="299.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="299.5" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">98</text>
  <line x1="365.5" y1="26" x2="365.5" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="364.5" y="18.0" text-anchor="end" font-size="11" fill="currentColor">122</text>
  <line x1="371.0" y1="26" x2="371.0" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="372.0" y="18.0" text-anchor="start" font-size="11" fill="currentColor">124</text>
  <line x1="533.2" y1="26" x2="533.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="533.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">183</text>
  <line x1="577.2" y1="26" x2="577.2" y2="34" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="577.2" y="18.0" text-anchor="middle" font-size="11" fill="currentColor">199</text>
  <line x1="175.8" y1="50" x2="131.8" y2="70" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="131.8" y1="70" x2="68.5" y2="90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="68.5" y1="90" x2="208.8" y2="110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="208.8" y1="110" x2="214.2" y2="130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="214.2" y1="130" x2="299.5" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="299.5" y1="150" x2="365.5" y2="170" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="365.5" y1="170" x2="371.0" y2="190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <line x1="371.0" y1="190" x2="533.2" y2="210" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-look)"/>
  <circle cx="175.8" cy="50" r="4" fill="#ef4444"/>
  <circle cx="131.8" cy="70" r="3" fill="currentColor"/>
  <circle cx="68.5" cy="90" r="3" fill="currentColor"/>
  <circle cx="208.8" cy="110" r="3" fill="currentColor"/>
  <circle cx="214.2" cy="130" r="3" fill="currentColor"/>
  <circle cx="299.5" cy="150" r="3" fill="currentColor"/>
  <circle cx="365.5" cy="170" r="3" fill="currentColor"/>
  <circle cx="371.0" cy="190" r="3" fill="currentColor"/>
  <circle cx="533.2" cy="210" r="3" fill="currentColor"/>
</svg>
<figcaption>C-LOOK disk scheduling (after Galvin, Fig. 10.8), moving toward 199: after 183 the arm jumps to 14, the lowest request. Total: (183 − 53) + (183 − 14) + (37 − 14) = 322 cylinders, or 153 without the jump.</figcaption>
</figure>

<figure class="table">
<figcaption>The six algorithms on the same queue (head at 53). Cylinders in italics are passed without serving a request.</figcaption>

| Algorithm | Order of service | Head movement |
|:--|:--|:-:|
| FCFS | 98, 183, 37, 122, 14, 124, 65, 67 | 640 |
| SSTF | 65, 67, 37, 14, 98, 122, 124, 183 | 236 |
| SCAN (↓) | 37, 14, *0*, 65, 67, 98, 122, 124, 183 | 236 |
| C-SCAN (↑) | 65, 67, 98, 122, 124, 183, *199, 0*, 14, 37 | 382 |
| LOOK (↓) | 37, 14, 65, 67, 98, 122, 124, 183 | 208 |
| C-LOOK (↑) | 65, 67, 98, 122, 124, 183, 14, 37 | 322 |
</figure>

##### Choosing an Algorithm

- SSTF is common and clearly better than FCFS. SCAN and C-SCAN do better under heavy load, since they are less likely to starve a request. Either SSTF or LOOK is a reasonable default.
- With only one request in the queue, every algorithm behaves like FCFS.
- The file-allocation method matters: a contiguous file gives requests close together, while a linked or indexed file may be scattered over the disk. Directories and index blocks are accessed often, so placing them in the middle cylinders (or caching them in memory) reduces arm movement.
- These algorithms consider only seek distance. Rotational latency can be nearly as large, but the OS does not know where the sectors physically are, so modern disks also schedule inside the controller.
- SSDs have no head, so they usually use FCFS (Linux's *noop* scheduler is FCFS that merges adjacent requests).

#### Disk Management

##### Disk Formatting

A new disk is just magnetic material. **Low-level (physical) formatting** divides it into sectors the controller can read and write. Each sector gets a **header**, a **data area** (usually 512 B) and a **trailer**; the header and trailer hold information for the controller, such as the sector number and an **error-correcting code (ECC)**.

<figure class="fig">
<svg viewBox="0 0 560 72" width="560" role="img" aria-label="Sector layout: header, data area, trailer">
  <defs><marker id="arr-sec" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="14" width="110" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="75.0" y="34.0" text-anchor="middle" font-size="12" fill="currentColor">header</text>
  <rect x="130" y="14" width="300" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="130" y="14" width="300" height="30" fill="#3b82f6" opacity=".18"/>
  <text x="280.0" y="34.0" text-anchor="middle" font-size="12" fill="currentColor">data (512 B)</text>
  <rect x="430" y="14" width="110" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="485.0" y="34.0" text-anchor="middle" font-size="12" fill="currentColor">trailer</text>
  <text x="75.0" y="62.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">sector number, …</text>
  <text x="485.0" y="62.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">ECC, …</text>
</svg>
<figcaption>Layout of a sector after low-level formatting.</figcaption>
</figure>

- When a sector is written, the controller computes the ECC from the data and stores it. When it is read, the ECC is recomputed and compared: a mismatch means the data are corrupted and the sector may be bad.
- If only a few bits are wrong, the ECC has enough information to correct them, and the controller reports a recoverable **soft error**.
- A larger sector size fits fewer sectors on a track, but also fewer headers and trailers, so more space is left for data.

Most disks are low-level formatted at the factory. To hold files, the OS then records its own data structures in two steps:

1. **Partition** the disk into one or more groups of cylinders; each partition is treated as a separate disk.
2. **Logical formatting:** create a file system, i.e. store the initial file-system data structures (free-space maps and an empty root directory).

File systems usually group blocks into larger **clusters**: disk I/O is done in blocks, file-system I/O in clusters, so access is more sequential. A partition can also be used as a **raw disk**, a plain array of blocks with no file system. Raw I/O bypasses the buffer cache, file names, directories, locking and space allocation; some databases use it to control exactly where each record is stored.

##### Boot Block

At power-up the computer needs an initial **bootstrap** program, which initializes the system, finds the kernel on disk, loads it into memory and jumps to it.

- The bootstrap could be kept entirely in **ROM**: it needs no initialization, is at a fixed address and cannot be infected by a virus. But changing it would mean changing the ROM chip.
- So the ROM holds only a tiny **bootstrap loader**, whose job is to read the full bootstrap program from the **boot blocks**, a fixed location on disk. That program can be updated by simply writing a new version to disk. A disk with a boot partition is a **boot disk** (system disk).

The loader in ROM tells the disk controller to read the boot blocks into memory (no device drivers are loaded yet) and runs them. The full bootstrap can then load the OS from anywhere on the disk.

**Example: Windows.** The first sector of the disk is the **master boot record (MBR)**. It holds the boot code and a **partition table** with a flag marking the **boot partition**. The ROM code runs the boot code in the MBR; this finds the boot partition, reads its first sector (the **boot sector**), and the boot continues from there.

<figure class="fig">
<svg viewBox="0 0 420 296" width="420" role="img" aria-label="Booting from disk in Windows: the MBR holds boot code and the partition table">
  <defs><marker id="arr-mbr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="60" y="14" width="150" height="70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="60" y1="49" x2="210" y2="49" stroke="currentColor" stroke-width="1" opacity=".6"/>
  <text x="135.0" y="36.0" text-anchor="middle" font-size="12" fill="currentColor">boot code</text>
  <text x="135.0" y="71.0" text-anchor="middle" font-size="12" fill="currentColor">partition table</text>
  <text x="52.0" y="54.0" text-anchor="end" font-size="12" fill="currentColor">MBR</text>
  <rect x="60" y="84" width="150" height="50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="115.0" text-anchor="middle" font-size="12" fill="currentColor">partition 1</text>
  <rect x="60" y="134" width="150" height="50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="60" y="134" width="150" height="50" fill="#3b82f6" opacity=".18"/>
  <rect x="60" y="134" width="150" height="14" fill="#3b82f6" opacity=".3"/>
  <text x="135.0" y="165.0" text-anchor="middle" font-size="12" fill="currentColor">partition 2</text>
  <rect x="60" y="184" width="150" height="50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="215.0" text-anchor="middle" font-size="12" fill="currentColor">partition 3</text>
  <rect x="60" y="234" width="150" height="50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="265.0" text-anchor="middle" font-size="12" fill="currentColor">partition 4</text>
  <polyline points="210,66 250,66 250,145 213,145" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-mbr)"/>
  <text x="258.0" y="112.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">boot flag</text>
  <text x="258.0" y="160.0" text-anchor="start" font-size="12" fill="#3b82f6">boot partition</text>
  <text x="258.0" y="176.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">(first sector: boot sector)</text>
</svg>
<figcaption>Booting from disk in Windows (after Galvin, Fig. 10.9). The partition table in the MBR marks which partition to boot from.</figcaption>
</figure>

##### Bad Blocks

Sometimes a disk fails completely and must be replaced. More often, single sectors become defective; most disks even come from the factory with some bad blocks.

**Simple disks (e.g. IDE).** Bad blocks are handled manually. The disk is scanned for bad blocks while it is formatted, and those found are flagged so the file system never allocates them. Blocks that go bad later are found by running a program such as Linux's `badblocks`; their data are usually lost.

**Smarter disks.** The controller keeps a list of bad blocks, created during low-level formatting and updated over the life of the disk. Formatting also sets aside **spare sectors** that the OS cannot see. A bad sector is then replaced logically in one of two ways.

**Sector sparing (forwarding).** The bad sector is replaced by a spare:

1. The OS tries to read logical block 87.
2. The controller computes the ECC, finds the sector is bad, and reports it to the OS.
3. At the next reboot, a special command tells the controller to replace the bad sector with a spare.
4. From then on, a request for block 87 is translated by the controller to the spare's address.

This redirection can undo the work of the disk-scheduling algorithm, so disks keep a few spare sectors in **every cylinder** (and a spare cylinder), and a bad block is remapped to a spare in the same cylinder when possible.

**Sector slipping.** Suppose logical block 17 goes bad and the first spare follows sector 202. Every sector from 17 to 202 is moved down one place: 202 is copied into the spare, 201 into 202, …, 18 into 19. This frees the place of sector 18, and block 17 is mapped to it. Consecutive blocks stay consecutive on the disk.

<figure class="fig">
<svg viewBox="0 0 460 212" width="460" role="img" aria-label="Bad-block replacement by sector sparing and sector slipping">
  <defs><marker id="arr-bad" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="108.0" y="34.0" text-anchor="end" font-size="12" fill="currentColor">sparing</text>
  <rect x="120" y="16" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="143.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <rect x="166" y="16" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="166" y="16" width="46" height="26" fill="#ef4444" opacity=".25"/>
  <text x="189.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor">17 ✗</text>
  <rect x="212" y="16" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <rect x="258" y="16" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="281.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <rect x="304" y="16" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="327.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">…</text>
  <rect x="350" y="16" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="373.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor">202</text>
  <rect x="396" y="16" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="396" y="16" width="46" height="26" fill="#3b82f6" opacity=".18"/>
  <text x="419.0" y="33.0" text-anchor="middle" font-size="11" fill="currentColor">spare</text>
  <polyline points="189.0,42 189.0,58 419.0,58 419.0,45" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-bad)"/>
  <text x="304.0" y="74.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">block 17 is read from the spare</text>
  <text x="108.0" y="118.0" text-anchor="end" font-size="12" fill="currentColor">slipping</text>
  <text x="108.0" y="132.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">before</text>
  <rect x="120" y="100" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="143.0" y="117.0" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <rect x="166" y="100" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="166" y="100" width="46" height="26" fill="#ef4444" opacity=".25"/>
  <text x="189.0" y="117.0" text-anchor="middle" font-size="11" fill="currentColor">17 ✗</text>
  <rect x="212" y="100" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235.0" y="117.0" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <rect x="258" y="100" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="281.0" y="117.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <rect x="304" y="100" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="327.0" y="117.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">…</text>
  <rect x="350" y="100" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="373.0" y="117.0" text-anchor="middle" font-size="11" fill="currentColor">202</text>
  <rect x="396" y="100" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="396" y="100" width="46" height="26" fill="#3b82f6" opacity=".18"/>
  <text x="419.0" y="117.0" text-anchor="middle" font-size="11" fill="currentColor">spare</text>
  <path d="M235.0,126 q23.0,16 46,2" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-bad)"/>
  <path d="M281.0,126 q23.0,16 46,2" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-bad)"/>
  <path d="M373.0,126 q23.0,16 46,2" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-bad)"/>
  <text x="108.0" y="172.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">after</text>
  <rect x="120" y="154" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="143.0" y="171.0" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <rect x="166" y="154" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="166" y="154" width="46" height="26" fill="#ef4444" opacity=".25"/>
  <text x="189.0" y="171.0" text-anchor="middle" font-size="11" fill="currentColor">✗</text>
  <rect x="212" y="154" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235.0" y="171.0" text-anchor="middle" font-size="11" fill="currentColor">17</text>
  <rect x="258" y="154" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="281.0" y="171.0" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <rect x="304" y="154" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="327.0" y="171.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">…</text>
  <rect x="350" y="154" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="373.0" y="171.0" text-anchor="middle" font-size="11" fill="currentColor">201</text>
  <rect x="396" y="154" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="396" y="154" width="46" height="26" fill="#3b82f6" opacity=".18"/>
  <text x="419.0" y="171.0" text-anchor="middle" font-size="11" fill="currentColor">202</text>
  <text x="281.0" y="202.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">physical sector k now holds logical block k − 1</text>
</svg>
<figcaption>Replacing bad block 17. Sparing maps it to a spare elsewhere; slipping shifts blocks 17–202 down by one so that block 17 lands in the old place of 18.</figcaption>
</figure>

Replacement is not fully automatic, because the data in a bad block are usually lost. A soft error can trigger copying the block and sparing or slipping it; an unrecoverable **hard error** loses data, and the file that used the block has to be repaired by hand (e.g. from a backup).

### File-System Interface

#### Directory Structure

A directory is a table that maps file names to their directory entries. The question is how to organize it.

##### Single-Level Directory

The simplest structure: **all files are in the same directory**. It is easy to support and understand, but since all files are in one directory they must have **unique names**, which is a problem once there are many files or more than one user.

<figure class="fig">
<svg viewBox="0 0 540 80" width="540" role="img" aria-label="Single-level directory">
  <defs><marker id="arr-d1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="100.0" y="29.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">directory</text>
  <rect x="110" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="133.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">cat</text>
  <rect x="156" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="179.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">bo</text>
  <rect x="202" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="225.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">a</text>
  <rect x="248" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="271.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">test</text>
  <rect x="294" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="317.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">data</text>
  <rect x="340" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="363.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">mail</text>
  <rect x="386" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="409.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">cont</text>
  <rect x="432" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="455.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">hex</text>
  <rect x="478" y="14" width="46" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="501.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">records</text>
  <line x1="133.0" y1="36.0" x2="133.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="133.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="179.0" y1="36.0" x2="179.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="179.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="225.0" y1="36.0" x2="225.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="225.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="271.0" y1="36.0" x2="271.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="271.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="317.0" y1="36.0" x2="317.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="317.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="363.0" y1="36.0" x2="363.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="363.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="409.0" y1="36.0" x2="409.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="409.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="455.0" y1="36.0" x2="455.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="455.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="501.0" y1="36.0" x2="501.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d1)"/>
  <circle cx="501.0" cy="58.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="66.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">files</text>
</svg>
<figcaption>Single-level directory (after Galvin, Fig. 11.9).</figcaption>
</figure>

##### Two-Level Directory

The standard solution is a separate directory for each user. Each user has a **user file directory (UFD)** listing only their files. When a user logs in, the **master file directory (MFD)**, indexed by user name, is searched to find their UFD.

<figure class="fig">
<svg viewBox="0 0 560 168" width="560" role="img" aria-label="Two-level directory structure">
  <defs><marker id="arr-d2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="170" y="14" width="224" height="22" fill="#3b82f6" opacity=".15"/>
  <rect x="170" y="14" width="56" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="198.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">user 1</text>
  <rect x="226" y="14" width="56" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="254.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">user 2</text>
  <rect x="282" y="14" width="56" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="310.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">user 3</text>
  <rect x="338" y="14" width="56" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="366.0" y="29.0" text-anchor="middle" font-size="11" fill="currentColor">user 4</text>
  <text x="160.0" y="22.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">master file</text>
  <text x="160.0" y="35.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">directory</text>
  <rect x="20" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="37.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">cat</text>
  <rect x="54" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="71.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">bo</text>
  <rect x="88" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="105.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">a</text>
  <rect x="122" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="139.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">test</text>
  <line x1="198.0" y1="36.0" x2="88.0" y2="87.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <line x1="37.0" y1="112.0" x2="37.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="37.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="71.0" y1="112.0" x2="71.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="71.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="105.0" y1="112.0" x2="105.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="105.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="139.0" y1="112.0" x2="139.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="139.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="210" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="227.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">a</text>
  <rect x="244" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="261.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">data</text>
  <line x1="254.0" y1="36.0" x2="244.0" y2="87.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <line x1="227.0" y1="112.0" x2="227.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="227.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="261.0" y1="112.0" x2="261.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="261.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="322" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="339.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">a</text>
  <rect x="356" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="373.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">test</text>
  <line x1="310.0" y1="36.0" x2="356.0" y2="87.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <line x1="339.0" y1="112.0" x2="339.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="339.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="373.0" y1="112.0" x2="373.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="373.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="434" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="451.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">x</text>
  <rect x="468" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="485.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">data</text>
  <rect x="502" y="90" width="34" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="519.0" y="105.0" text-anchor="middle" font-size="11" fill="currentColor">a</text>
  <line x1="366.0" y1="36.0" x2="485.0" y2="87.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <line x1="451.0" y1="112.0" x2="451.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="451.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="485.0" y1="112.0" x2="485.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="485.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="519.0" y1="112.0" x2="519.0" y2="128.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d2)"/>
  <circle cx="519.0" cy="134.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="20.0" y="160.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">user file directories</text>
</svg>
<figcaption>Two-level directory structure (after Galvin, Fig. 11.10).</figcaption>
</figure>

- Different users can have files with the same name; names need to be unique only within a UFD.
- A reference to a file searches only the user's own UFD, so one user cannot accidentally delete another's file.

It still has a disadvantage: the structure **isolates** one user from another. Isolation is an advantage when users are independent, but a disadvantage when they want to cooperate and access each other's files; some systems simply do not allow it. To name another user's file we must give the user name and the file name, i.e. a **path name** in a tree of height 2.

System programs (compilers, loaders, …) are kept in a special user directory. When a name is not found in the user's UFD, that directory is searched next. The sequence of directories searched is the **search path**.

##### Tree-Structured Directories

Generalizing to a tree of arbitrary height lets users create their own **subdirectories**. This is the most common structure.

- The tree has a **root** directory, and every file has a **unique path name**.
- A directory is just a file treated in a special way: **one bit** in each entry marks it as a file (0) or a subdirectory (1). Special system calls create and delete directories.
- Each process has a **current directory**, searched when a file is referenced.

An **absolute path** begins at the root and gives the directory names down to the file. A **relative path** starts from the current directory. If the current directory is `root/spell/mail`, the relative path `prt/first` names the same file as `root/spell/mail/prt/first`.

<figure class="fig">
<svg viewBox="0 0 640 272" width="640" role="img" aria-label="Tree-structured directory">
  <defs><marker id="arr-d3" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="230" y="10" width="180" height="22" fill="#3b82f6" opacity=".15"/>
  <rect x="230" y="10" width="60" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="25.0" text-anchor="middle" font-size="11" fill="currentColor">spell</text>
  <rect x="290" y="10" width="60" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="320.0" y="25.0" text-anchor="middle" font-size="11" fill="currentColor">bin</text>
  <rect x="350" y="10" width="60" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="25.0" text-anchor="middle" font-size="11" fill="currentColor">programs</text>
  <text x="222.0" y="25.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">root</text>
  <rect x="20" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">stat</text>
  <rect x="64" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="86.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">mail</text>
  <rect x="108" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">dist</text>
  <line x1="260.0" y1="32.0" x2="86.0" y2="77.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <rect x="250" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="272.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">find</text>
  <rect x="294" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="316.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">count</text>
  <rect x="338" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="360.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">hex</text>
  <line x1="320.0" y1="32.0" x2="316.0" y2="77.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <rect x="480" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="502.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">p</text>
  <rect x="524" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="546.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">e</text>
  <rect x="568" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="590.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">mail</text>
  <line x1="380.0" y1="32.0" x2="546.0" y2="77.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <line x1="42.0" y1="102.0" x2="42.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="42.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="130.0" y1="102.0" x2="130.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="130.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="272.0" y1="102.0" x2="272.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="272.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="316.0" y1="102.0" x2="316.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="316.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="360.0" y1="102.0" x2="360.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="360.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="502.0" y1="102.0" x2="502.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="502.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="546.0" y1="102.0" x2="546.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="546.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="590.0" y1="102.0" x2="590.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="590.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="150" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42.0" y="165.0" text-anchor="middle" font-size="11" fill="currentColor">prog</text>
  <rect x="64" y="150" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="86.0" y="165.0" text-anchor="middle" font-size="11" fill="currentColor">copy</text>
  <rect x="108" y="150" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130.0" y="165.0" text-anchor="middle" font-size="11" fill="currentColor">prt</text>
  <rect x="152" y="150" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="174.0" y="165.0" text-anchor="middle" font-size="11" fill="currentColor">exp</text>
  <line x1="86.0" y1="102.0" x2="108.0" y2="147.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <line x1="42.0" y1="172.0" x2="42.0" y2="188.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="42.0" cy="194.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="86.0" y1="172.0" x2="86.0" y2="188.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="86.0" cy="194.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="174.0" y1="172.0" x2="174.0" y2="188.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="174.0" cy="194.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="86" y="222" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="108.0" y="237.0" text-anchor="middle" font-size="11" fill="currentColor">first</text>
  <rect x="130" y="222" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="152.0" y="237.0" text-anchor="middle" font-size="11" fill="currentColor">last</text>
  <line x1="130.0" y1="172.0" x2="130.0" y2="219.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <line x1="108.0" y1="244.0" x2="108.0" y2="260.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="108.0" cy="266.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="152.0" y1="244.0" x2="152.0" y2="260.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d3)"/>
  <circle cx="152.0" cy="266.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="190.0" y="238.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">root/spell/mail/prt/first</text>
</svg>
<figcaption>Tree-structured directory (simplified, after Galvin, Fig. 11.11). Boxes are directories, circles are files.</figcaption>
</figure>

Deleting a non-empty directory is a policy choice: some systems refuse until it is empty; others (like UNIX `rm -r`) delete everything below it.

A tree **prohibits sharing** of files or directories: each file has exactly one parent.

##### Acyclic-Graph Directories

An *acyclic graph* (a graph with no cycles) allows directories to **share subdirectories and files**: the same file or directory can appear in two directories at once. A shared file is not the same as two copies: there is only **one** actual file, so a change made by one person is immediately visible to the other, and a new file created in a shared subdirectory appears in all the places it is shared.

<figure class="fig">
<svg viewBox="0 0 560 238" width="560" role="img" aria-label="Acyclic-graph directory structure">
  <defs><marker id="arr-d4" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="250" y="10" width="100" height="22" fill="#3b82f6" opacity=".15"/>
  <rect x="250" y="10" width="50" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="275.0" y="25.0" text-anchor="middle" font-size="11" fill="currentColor">dict</text>
  <rect x="300" y="10" width="50" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="325.0" y="25.0" text-anchor="middle" font-size="11" fill="currentColor">spell</text>
  <text x="242.0" y="25.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">root</text>
  <rect x="60" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="82.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">list</text>
  <rect x="104" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="126.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">all</text>
  <rect x="148" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">w</text>
  <rect x="192" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="214.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">count</text>
  <rect x="380" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="402.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">count</text>
  <rect x="424" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="446.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">words</text>
  <rect x="468" y="80" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="490.0" y="95.0" text-anchor="middle" font-size="11" fill="currentColor">list</text>
  <line x1="275.0" y1="32.0" x2="148.0" y2="77.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <line x1="325.0" y1="32.0" x2="446.0" y2="77.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <line x1="126.0" y1="102.0" x2="126.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <circle cx="126.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="170.0" y1="102.0" x2="170.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <circle cx="170.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="446.0" y1="102.0" x2="446.0" y2="118.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <circle cx="446.0" cy="124.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="300" cy="140" r="4.5" stroke="#ef4444" stroke-width="1.5" fill="none"/>
  <line x1="214.0" y1="102.0" x2="294.0" y2="136.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <line x1="402.0" y1="102.0" x2="306.0" y2="136.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <text x="300.0" y="160.0" text-anchor="middle" font-size="10" fill="#ef4444">one shared file</text>
  <rect x="236" y="180" width="132" height="22" fill="#ef4444" opacity=".15"/>
  <rect x="236" y="180" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="258.0" y="195.0" text-anchor="middle" font-size="11" fill="currentColor">list</text>
  <rect x="280" y="180" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="302.0" y="195.0" text-anchor="middle" font-size="11" fill="currentColor">rade</text>
  <rect x="324" y="180" width="44" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="346.0" y="195.0" text-anchor="middle" font-size="11" fill="currentColor">w7</text>
  <polyline points="82.0,102.0 82.0,191.0 233.0,191.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <polyline points="490.0,102.0 490.0,191.0 371.0,191.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <line x1="258.0" y1="202.0" x2="258.0" y2="218.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <circle cx="258.0" cy="224.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="302.0" y1="202.0" x2="302.0" y2="218.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <circle cx="302.0" cy="224.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="346.0" y1="202.0" x2="346.0" y2="218.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-d4)"/>
  <circle cx="346.0" cy="224.0" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>Acyclic-graph directory structure (after Galvin, Fig. 11.12). The file <code>count</code> and the directory <code>list</code> are shared by <code>dict</code> and <code>spell</code>.</figcaption>
</figure>

Sharing is usually implemented with a **link**, a directory entry that is a pointer (a path name) to another file or directory. It is more flexible than a tree, but also more complex:

- A file can now have several path names, so a traversal (search, backup) must avoid visiting shared parts twice.
- **Deletion:** if the file is removed whenever anyone deletes it, the other entries become **dangling pointers** to a file that no longer exists (or, worse, to blocks reused by another file). With *symbolic links*, deleting the link leaves the file, and deleting the file leaves the links dangling (UNIX and Windows do this). The alternative is to keep the file until all references are gone, using a **reference count**: UNIX does this for *hard links*, keeping the count in the inode.

If links may create cycles we get a **general graph directory**. Then a search can loop forever, and a reference count may be nonzero even when the file can no longer be reached, so **garbage collection** is needed to reclaim space. Cycles are avoided by not allowing links to directories, or by ignoring links when traversing.

### File-System Implementation

#### Allocation Methods

How are a file's blocks placed on the disk, so that space is used well and files can be accessed quickly? There are three main methods: contiguous, linked and indexed.

##### Contiguous Allocation

Each file occupies a set of **contiguous blocks**. A file is described by the address of its first block and its length: a file of $n$ blocks starting at $b$ occupies $b, b+1, \dots, b+n-1$. The directory entry stores the start and the length.

<figure class="fig">
<svg viewBox="0 0 500 330" width="500" role="img" aria-label="Contiguous allocation of disk space">
  <defs><marker id="arr-cont" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="18" y="18" width="232" height="288" rx="10" stroke="currentColor" stroke-width="1" fill="none" opacity=".5"/>
  <rect x="30" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="30" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="53.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <rect x="84" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="84" y="30" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="107.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <rect x="138" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">2</text>
  <rect x="192" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <rect x="30" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">4</text>
  <rect x="84" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">5</text>
  <rect x="138" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="138" y="64" width="46" height="26" fill="#ef4444" opacity=".3"/>
  <text x="161.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <rect x="192" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="192" y="64" width="46" height="26" fill="#ef4444" opacity=".3"/>
  <text x="215.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">7</text>
  <rect x="30" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">8</text>
  <rect x="84" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">9</text>
  <rect x="138" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">10</text>
  <rect x="192" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">11</text>
  <rect x="30" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">12</text>
  <rect x="84" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">13</text>
  <rect x="138" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="138" y="132" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="161.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <rect x="192" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="192" y="132" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="215.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">15</text>
  <rect x="30" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="166" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="53.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <rect x="84" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">17</text>
  <rect x="138" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <rect x="192" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="192" y="166" width="46" height="26" fill="#f59e0b" opacity=".3"/>
  <text x="215.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <rect x="30" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="200" width="46" height="26" fill="#f59e0b" opacity=".3"/>
  <text x="53.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">20</text>
  <rect x="84" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="84" y="200" width="46" height="26" fill="#f59e0b" opacity=".3"/>
  <text x="107.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">21</text>
  <rect x="138" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="138" y="200" width="46" height="26" fill="#f59e0b" opacity=".3"/>
  <text x="161.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">22</text>
  <rect x="192" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="192" y="200" width="46" height="26" fill="#f59e0b" opacity=".3"/>
  <text x="215.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">23</text>
  <rect x="30" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="234" width="46" height="26" fill="#f59e0b" opacity=".3"/>
  <text x="53.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">24</text>
  <rect x="84" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">25</text>
  <rect x="138" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">26</text>
  <rect x="192" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">27</text>
  <rect x="30" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="268" width="46" height="26" fill="#a855f7" opacity=".3"/>
  <text x="53.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">28</text>
  <rect x="84" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="84" y="268" width="46" height="26" fill="#a855f7" opacity=".3"/>
  <text x="107.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">29</text>
  <rect x="138" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="138" y="268" width="46" height="26" fill="#a855f7" opacity=".3"/>
  <text x="161.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">30</text>
  <rect x="192" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="192" y="268" width="46" height="26" fill="#a855f7" opacity=".3"/>
  <text x="215.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">31</text>
  <text x="134.0" y="322.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">disk</text>
  <text x="385.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">directory</text>
  <rect x="300" y="60" width="170" height="132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300.0" y1="82.0" x2="470.0" y2="82.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330.0" y="75.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">file</text>
  <text x="330.0" y="97.0" text-anchor="middle" font-size="11" fill="#3b82f6">count</text>
  <text x="330.0" y="119.0" text-anchor="middle" font-size="11" fill="#22c55e">tr</text>
  <text x="330.0" y="141.0" text-anchor="middle" font-size="11" fill="#f59e0b">mail</text>
  <text x="330.0" y="163.0" text-anchor="middle" font-size="11" fill="#a855f7">list</text>
  <text x="330.0" y="185.0" text-anchor="middle" font-size="11" fill="#ef4444">f</text>
  <line x1="360.0" y1="60.0" x2="360.0" y2="192.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="385.0" y="75.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">start</text>
  <text x="385.0" y="97.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <text x="385.0" y="119.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <text x="385.0" y="141.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <text x="385.0" y="163.0" text-anchor="middle" font-size="11" fill="currentColor">28</text>
  <text x="385.0" y="185.0" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <line x1="410.0" y1="60.0" x2="410.0" y2="192.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="440.0" y="75.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">length</text>
  <text x="440.0" y="97.0" text-anchor="middle" font-size="11" fill="currentColor">2</text>
  <text x="440.0" y="119.0" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <text x="440.0" y="141.0" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <text x="440.0" y="163.0" text-anchor="middle" font-size="11" fill="currentColor">4</text>
  <text x="440.0" y="185.0" text-anchor="middle" font-size="11" fill="currentColor">2</text>
</svg>
<figcaption>Contiguous allocation of disk space (after Galvin, Fig. 12.5).</figcaption>
</figure>

Accessing block $b+1$ after block $b$ normally needs no head movement, and when it does (from the last sector of one cylinder to the first of the next) the head moves only one track. So the number of seeks is minimal.

- **Sequential access ✓:** remember the last block read and read the next one.
- **Direct access ✓:** block $i$ of the file is at $b + i$.
- **Growing a file ✗:** the space on both sides may be in use.

Problems:

- **Finding space** for a new file is the dynamic storage-allocation problem of memory (first fit, best fit, …), and it suffers from **external fragmentation**. **Compaction** copies all files so that the free space becomes one contiguous region, but it takes time (hours on large disks).
- **The size must be known** when the file is created. If too little is allocated, the file cannot be extended; if we overestimate, the space is wasted (internal fragmentation). A modified scheme allocates more contiguous chunks, called **extents**, when needed.

##### Linked Allocation

Each file is a **linked list of disk blocks**, which may be scattered anywhere on the disk. The directory holds pointers to the first and last blocks, and each block holds a pointer to the next. The pointers are not visible to the user: with 512 B blocks and 4 B pointers, the user sees blocks of 508 B.

<figure class="fig">
<svg viewBox="0 0 510 420" width="510" role="img" aria-label="Linked allocation of disk space">
  <defs><marker id="arr-link" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-linkr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="18" y="18" width="268" height="372" rx="10" stroke="currentColor" stroke-width="1" fill="none" opacity=".5"/>
  <rect x="30" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <rect x="96" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="96" y="30" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="100.0" y="41.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">1</text>
  <text x="123.0" y="49.0" text-anchor="middle" font-size="11" fill="#ef4444">10</text>
  <rect x="162" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">2</text>
  <rect x="228" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <rect x="30" y="76" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="93.0" text-anchor="middle" font-size="11" fill="currentColor">4</text>
  <rect x="96" y="76" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="119.0" y="93.0" text-anchor="middle" font-size="11" fill="currentColor">5</text>
  <rect x="162" y="76" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="93.0" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <rect x="228" y="76" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="93.0" text-anchor="middle" font-size="11" fill="currentColor">7</text>
  <rect x="30" y="122" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="139.0" text-anchor="middle" font-size="11" fill="currentColor">8</text>
  <rect x="96" y="122" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="96" y="122" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="100.0" y="133.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">9</text>
  <text x="123.0" y="141.0" text-anchor="middle" font-size="11" fill="#ef4444">16</text>
  <rect x="162" y="122" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="162" y="122" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="166.0" y="133.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">10</text>
  <text x="189.0" y="141.0" text-anchor="middle" font-size="11" fill="#ef4444">25</text>
  <rect x="228" y="122" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="139.0" text-anchor="middle" font-size="11" fill="currentColor">11</text>
  <rect x="30" y="168" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="185.0" text-anchor="middle" font-size="11" fill="currentColor">12</text>
  <rect x="96" y="168" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="119.0" y="185.0" text-anchor="middle" font-size="11" fill="currentColor">13</text>
  <rect x="162" y="168" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="185.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <rect x="228" y="168" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="185.0" text-anchor="middle" font-size="11" fill="currentColor">15</text>
  <rect x="30" y="214" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="214" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="34.0" y="225.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">16</text>
  <text x="57.0" y="233.0" text-anchor="middle" font-size="11" fill="#ef4444">1</text>
  <rect x="96" y="214" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="119.0" y="231.0" text-anchor="middle" font-size="11" fill="currentColor">17</text>
  <rect x="162" y="214" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="231.0" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <rect x="228" y="214" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="231.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <rect x="30" y="260" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="277.0" text-anchor="middle" font-size="11" fill="currentColor">20</text>
  <rect x="96" y="260" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="119.0" y="277.0" text-anchor="middle" font-size="11" fill="currentColor">21</text>
  <rect x="162" y="260" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="277.0" text-anchor="middle" font-size="11" fill="currentColor">22</text>
  <rect x="228" y="260" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="277.0" text-anchor="middle" font-size="11" fill="currentColor">23</text>
  <rect x="30" y="306" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="323.0" text-anchor="middle" font-size="11" fill="currentColor">24</text>
  <rect x="96" y="306" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="96" y="306" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="100.0" y="317.0" text-anchor="start" font-size="9" fill="currentColor" class="dim">25</text>
  <text x="123.0" y="325.0" text-anchor="middle" font-size="11" fill="#ef4444">−1</text>
  <rect x="162" y="306" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="323.0" text-anchor="middle" font-size="11" fill="currentColor">26</text>
  <rect x="228" y="306" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="323.0" text-anchor="middle" font-size="11" fill="currentColor">27</text>
  <rect x="30" y="352" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="369.0" text-anchor="middle" font-size="11" fill="currentColor">28</text>
  <rect x="96" y="352" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="119.0" y="369.0" text-anchor="middle" font-size="11" fill="currentColor">29</text>
  <rect x="162" y="352" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="185.0" y="369.0" text-anchor="middle" font-size="11" fill="currentColor">30</text>
  <rect x="228" y="352" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="251.0" y="369.0" text-anchor="middle" font-size="11" fill="currentColor">31</text>
  <text x="152.0" y="406.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">disk</text>
  <polyline points="119.0,148.0 119.0,155.0 83.0,155.0 83.0,227.0 76.0,227.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-linkr)"/>
  <polyline points="53.0,214.0 53.0,207.0 89.0,207.0 89.0,43.0 96.0,43.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-linkr)"/>
  <polyline points="119.0,56.0 119.0,63.0 149.0,63.0 149.0,135.0 162.0,135.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-linkr)"/>
  <polyline points="185.0,148.0 185.0,161.0 155.0,161.0 155.0,319.0 142.0,319.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-linkr)"/>
  <text x="390.0" y="24.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">directory</text>
  <rect x="310" y="30" width="160" height="44" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="310.0" y1="52.0" x2="470.0" y2="52.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="340.0" y="45.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">file</text>
  <text x="340.0" y="67.0" text-anchor="middle" font-size="11" fill="currentColor">jeep</text>
  <line x1="370.0" y1="30.0" x2="370.0" y2="74.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="395.0" y="45.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">start</text>
  <text x="395.0" y="67.0" text-anchor="middle" font-size="11" fill="currentColor">9</text>
  <line x1="420.0" y1="30.0" x2="420.0" y2="74.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="445.0" y="45.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">end</text>
  <text x="445.0" y="67.0" text-anchor="middle" font-size="11" fill="currentColor">25</text>
  <polyline points="395.0,74.0 395.0,112.0 119.0,112.0 119.0,122.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-link)"/>
  <text x="310.0" y="160.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">each block holds the number</text>
  <text x="310.0" y="175.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">of the next block (red)</text>
</svg>
<figcaption>Linked allocation of disk space (after Galvin, Fig. 12.6). The file <code>jeep</code> occupies blocks 9, 16, 1, 10 and 25; −1 marks the end.</figcaption>
</figure>

- **Sequential access ✓**, **growing a file ✓**: any free block can be added, so there is no external fragmentation, the size need not be declared, and compaction is never needed.
- **Direct access ✗:** to find block $i$ we must follow $i$ pointers from the start, each a disk read.

Other problems are **pointer overhead** (4 B of every 512 B block is 0.78% of the disk) and **reliability** (one damaged pointer loses the rest of the file). The usual fix for overhead is to allocate **clusters** of several blocks instead of single blocks: fewer pointers and fewer seeks, at the cost of more internal fragmentation.

##### File-Allocation Table (FAT)

An important variation on linked allocation, used by MS-DOS. A section at the beginning of each volume holds a **table with one entry per disk block**, indexed by block number.

- The directory entry holds the number of the file's **first block**.
- The table entry for that block holds the number of the **next block**, and so on, until the last block, whose entry is a special **end-of-file** value.
- A free block has table value 0. To add a block, find a 0 entry and link it at the end.

<figure class="fig">
<svg viewBox="0 0 480 326" width="480" role="img" aria-label="File-allocation table for a file in blocks 217, 618, 339">
  <defs><marker id="arr-fat" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20.0" y="20.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">directory entry</text>
  <rect x="20" y="28" width="60" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50.0" y="44.0" text-anchor="middle" font-size="12" fill="currentColor">test</text>
  <rect x="80" y="28" width="40" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100.0" y="44.0" text-anchor="middle" font-size="12" fill="currentColor">…</text>
  <rect x="120" y="28" width="50" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="145.0" y="44.0" text-anchor="middle" font-size="12" fill="currentColor">217</text>
  <text x="50.0" y="68.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">name</text>
  <text x="145.0" y="68.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">start block</text>
  <rect x="300" y="20" width="80" height="280" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300.0" y1="20.0" x2="380.0" y2="20.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="300.0" y1="40.0" x2="380.0" y2="40.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="292.0" y="34.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">0</text>
  <line x1="300.0" y1="80.0" x2="380.0" y2="80.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="300.0" y1="100.0" x2="380.0" y2="100.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="292.0" y="94.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">217</text>
  <line x1="300.0" y1="140.0" x2="380.0" y2="140.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="300.0" y1="160.0" x2="380.0" y2="160.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="292.0" y="154.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">339</text>
  <line x1="300.0" y1="200.0" x2="380.0" y2="200.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="300.0" y1="220.0" x2="380.0" y2="220.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="292.0" y="214.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">618</text>
  <line x1="300.0" y1="260.0" x2="380.0" y2="260.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <line x1="300.0" y1="280.0" x2="380.0" y2="280.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="292.0" y="274.0" text-anchor="end" font-size="11" fill="currentColor" class="dim">N − 1</text>
  <rect x="300" y="80" width="80" height="20" fill="#3b82f6" opacity=".2"/>
  <text x="340.0" y="94.0" text-anchor="middle" font-size="12" fill="#ef4444">618</text>
  <rect x="300" y="200" width="80" height="20" fill="#3b82f6" opacity=".2"/>
  <text x="340.0" y="214.0" text-anchor="middle" font-size="12" fill="#ef4444">339</text>
  <rect x="300" y="140" width="80" height="20" fill="#3b82f6" opacity=".2"/>
  <text x="340.0" y="154.0" text-anchor="middle" font-size="12" fill="#ef4444">EOF</text>
  <polyline points="170.0,40.0 230.0,40.0 230.0,90.0 270.0,90.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fat)"/>
  <polyline points="380.0,90.0 410.0,90.0 410.0,210.0 383.0,210.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-fat)"/>
  <polyline points="380.0,214.0 430.0,214.0 430.0,150.0 383.0,150.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-fat)"/>
  <text x="340.0" y="318.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">FAT (one entry per disk block)</text>
  <text x="260.0" y="292.0" text-anchor="end" font-size="10" fill="currentColor" class="dim">N = number of disk blocks</text>
</svg>
<figcaption>File-allocation table (after Galvin, Fig. 12.7) for a file in blocks 217, 618 and 339.</figcaption>
</figure>

The FAT can cause many seeks, since the head must go to the start of the volume to read the table and then to the block, unless the FAT is **cached**. The benefit is that **random access improves**: the location of any block can be found by reading only the FAT, without reading the blocks in between.

##### Indexed Allocation

Indexed allocation brings all the pointers together into one place, the **index block**. Each file has its own index block, an array of disk-block addresses: entry $i$ points to block $i$ of the file. The directory holds the address of the index block. When the file is created, all entries are nil.

<figure class="fig">
<svg viewBox="0 0 500 340" width="500" role="img" aria-label="Indexed allocation of disk space">
  <defs><marker id="arr-idx" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="18" y="18" width="232" height="288" rx="10" stroke="currentColor" stroke-width="1" fill="none" opacity=".5"/>
  <rect x="30" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <rect x="84" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="84" y="30" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="107.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <rect x="138" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">2</text>
  <rect x="192" y="30" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="47.0" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <rect x="30" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">4</text>
  <rect x="84" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">5</text>
  <rect x="138" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <rect x="192" y="64" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="81.0" text-anchor="middle" font-size="11" fill="currentColor">7</text>
  <rect x="30" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">8</text>
  <rect x="84" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="84" y="98" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="107.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">9</text>
  <rect x="138" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="138" y="98" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="161.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">10</text>
  <rect x="192" y="98" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="115.0" text-anchor="middle" font-size="11" fill="currentColor">11</text>
  <rect x="30" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">12</text>
  <rect x="84" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">13</text>
  <rect x="138" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <rect x="192" y="132" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="149.0" text-anchor="middle" font-size="11" fill="currentColor">15</text>
  <rect x="30" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="30" y="166" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="53.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <rect x="84" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">17</text>
  <rect x="138" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <rect x="192" y="166" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="192" y="166" width="46" height="26" fill="#ef4444" opacity=".3"/>
  <text x="215.0" y="183.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <rect x="30" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">20</text>
  <rect x="84" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">21</text>
  <rect x="138" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">22</text>
  <rect x="192" y="200" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="217.0" text-anchor="middle" font-size="11" fill="currentColor">23</text>
  <rect x="30" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">24</text>
  <rect x="84" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="84" y="234" width="46" height="26" fill="#3b82f6" opacity=".3"/>
  <text x="107.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">25</text>
  <rect x="138" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">26</text>
  <rect x="192" y="234" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="251.0" text-anchor="middle" font-size="11" fill="currentColor">27</text>
  <rect x="30" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="53.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">28</text>
  <rect x="84" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="107.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">29</text>
  <rect x="138" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="161.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">30</text>
  <rect x="192" y="268" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="215.0" y="285.0" text-anchor="middle" font-size="11" fill="currentColor">31</text>
  <text x="134.0" y="322.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">disk</text>
  <line x1="203.2" y1="171.5" x2="118.8" y2="118.5" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-idx)"/>
  <line x1="201.0" y1="179.0" x2="67.0" y2="179.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-idx)"/>
  <line x1="206.3" y1="168.0" x2="115.7" y2="54.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-idx)"/>
  <line x1="206.3" y1="168.0" x2="169.7" y2="122.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-idx)"/>
  <line x1="203.2" y1="186.5" x2="118.8" y2="239.5" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-idx)"/>
  <text x="375.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">directory</text>
  <rect x="300" y="60" width="150" height="44" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <line x1="300.0" y1="82.0" x2="450.0" y2="82.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330.0" y="75.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">file</text>
  <text x="330.0" y="97.0" text-anchor="middle" font-size="11" fill="currentColor">jeep</text>
  <line x1="360.0" y1="60.0" x2="360.0" y2="104.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="405.0" y="75.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">index block</text>
  <text x="405.0" y="97.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <rect x="330" y="140" width="60" height="160" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="330" y="140" width="60" height="160" fill="#ef4444" opacity=".12"/>
  <text x="360.0" y="154.0" text-anchor="middle" font-size="11" fill="currentColor">9</text>
  <line x1="330.0" y1="160.0" x2="390.0" y2="160.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="360.0" y="174.0" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <line x1="330.0" y1="180.0" x2="390.0" y2="180.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="360.0" y="194.0" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <line x1="330.0" y1="200.0" x2="390.0" y2="200.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="360.0" y="214.0" text-anchor="middle" font-size="11" fill="currentColor">10</text>
  <line x1="330.0" y1="220.0" x2="390.0" y2="220.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="360.0" y="234.0" text-anchor="middle" font-size="11" fill="currentColor">25</text>
  <line x1="330.0" y1="240.0" x2="390.0" y2="240.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="360.0" y="254.0" text-anchor="middle" font-size="11" fill="currentColor">−1</text>
  <line x1="330.0" y1="260.0" x2="390.0" y2="260.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="360.0" y="274.0" text-anchor="middle" font-size="11" fill="currentColor">−1</text>
  <line x1="330.0" y1="280.0" x2="390.0" y2="280.0" stroke="currentColor" stroke-width="1" fill="none"/>
  <text x="360.0" y="294.0" text-anchor="middle" font-size="11" fill="currentColor">−1</text>
  <text x="400.0" y="154.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">block 0 of the file</text>
  <text x="400.0" y="234.0" text-anchor="start" font-size="10" fill="currentColor" class="dim">unused (nil)</text>
  <text x="360.0" y="316.0" text-anchor="middle" font-size="11" fill="#ef4444">index block 19</text>
</svg>
<figcaption>Indexed allocation of disk space (after Galvin, Fig. 12.8). Index block 19 lists the blocks of <code>jeep</code> in order.</figcaption>
</figure>

- **Direct access ✓** without **external fragmentation**, because any free block can satisfy a request.
- **Wasted space:** the pointer overhead is larger than for linked allocation. A file of one or two blocks loses only one or two pointers with linked allocation, but needs a whole index block here.

The index block should be small, but then it cannot hold enough pointers for a large file. Ways to handle this:

- **Linked scheme:** link several index blocks together; the last word of an index block points to the next one (or is nil).
- **Multilevel index:** a first-level index block points to second-level index blocks, which point to the data, like multi-level paging. With 4 KB blocks and 4 B pointers an index block holds 1024 pointers, so two levels give $2^{20}$ blocks, a 4 GB file.
- **Combined scheme** (UNIX): see the inode below.

##### UNIX Inode

The UNIX inode keeps the file's attributes and 15 pointers:

- the first **12** point to **direct blocks**, which hold data, so small files need no index block (with 4 KB blocks, up to 48 KB);
- the 13th points to a **single indirect** block: an index block holding addresses of data blocks;
- the 14th points to a **double indirect** block: a block of addresses of single indirect blocks;
- the 15th points to a **triple indirect** block.

<figure class="fig">
<svg viewBox="0 0 560 444" width="560" role="img" aria-label="The UNIX inode with direct, single, double and triple indirect pointers">
  <defs><marker id="arr-ino" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="20" y="20" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="35.0" text-anchor="middle" font-size="11" fill="currentColor">mode</text>
  <rect x="20" y="42" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="57.0" text-anchor="middle" font-size="11" fill="currentColor">owners (2)</text>
  <rect x="20" y="64" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="79.0" text-anchor="middle" font-size="11" fill="currentColor">timestamps (3)</text>
  <rect x="20" y="86" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="101.0" text-anchor="middle" font-size="11" fill="currentColor">size, block count</text>
  <rect x="20" y="108" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="130" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="152" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="167.0" text-anchor="middle" font-size="11" fill="currentColor">⋮  direct blocks</text>
  <rect x="20" y="174" width="150" height="22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="20" y="196" width="150" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="212.0" text-anchor="middle" font-size="11" fill="currentColor">single indirect</text>
  <rect x="20" y="220" width="150" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="236.0" text-anchor="middle" font-size="11" fill="currentColor">double indirect</text>
  <rect x="20" y="244" width="150" height="24" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="260.0" text-anchor="middle" font-size="11" fill="currentColor">triple indirect</text>
  <rect x="20" y="108.0" width="150" height="88" fill="#3b82f6" opacity=".12"/>
  <rect x="20" y="196.0" width="150" height="72" fill="#ef4444" opacity=".12"/>
  <polyline points="170.0,119.0 190.0,119.0 190.0,40.0 238.0,40.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="240" y="30" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="262.0" y="44.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <polyline points="170.0,141.0 200.0,141.0 200.0,66.0 238.0,66.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="240" y="56" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="262.0" y="70.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <polyline points="170.0,185.0 220.0,185.0 220.0,92.0 238.0,92.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="240" y="82" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="262.0" y="96.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <polyline points="170.0,208.0 215.0,208.0 215.0,205.0 247.0,205.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="250" y="177.0" width="16" height="56" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="177.0" width="16" height="56" fill="#ef4444" opacity=".15"/>
  <line x1="266.0" y1="185.0" x2="318.0" y2="185.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="320" y="175" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="342.0" y="189.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <line x1="266.0" y1="225.0" x2="318.0" y2="225.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="320" y="215" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="342.0" y="229.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <polyline points="170.0,232.0 200.0,232.0 200.0,300.0 247.0,300.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="250" y="272.0" width="16" height="56" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="272.0" width="16" height="56" fill="#ef4444" opacity=".15"/>
  <line x1="266.0" y1="282.0" x2="338.0" y2="282.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="340" y="267.0" width="16" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="267.0" width="16" height="30" fill="#ef4444" opacity=".15"/>
  <line x1="356.0" y1="282.0" x2="398.0" y2="282.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="400" y="272" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="422.0" y="286.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <line x1="266.0" y1="318.0" x2="338.0" y2="318.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="340" y="303.0" width="16" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="303.0" width="16" height="30" fill="#ef4444" opacity=".15"/>
  <line x1="356.0" y1="318.0" x2="398.0" y2="318.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="400" y="308" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="422.0" y="322.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <polyline points="170.0,256.0 185.0,256.0 185.0,390.0 247.0,390.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="250" y="362.0" width="16" height="56" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="362.0" width="16" height="56" fill="#ef4444" opacity=".15"/>
  <line x1="266.0" y1="390.0" x2="338.0" y2="390.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="340" y="370.0" width="16" height="40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="340" y="370.0" width="16" height="40" fill="#ef4444" opacity=".15"/>
  <line x1="356.0" y1="390.0" x2="418.0" y2="390.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="420" y="375.0" width="16" height="30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="420" y="375.0" width="16" height="30" fill="#ef4444" opacity=".15"/>
  <line x1="436.0" y1="390.0" x2="478.0" y2="390.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-ino)"/>
  <rect x="480" y="380" width="44" height="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="502.0" y="394.0" text-anchor="middle" font-size="10" fill="currentColor">data</text>
  <text x="258.0" y="432.0" text-anchor="start" font-size="11" fill="currentColor" class="dim">index blocks (red) hold only pointers</text>
</svg>
<figcaption>The UNIX inode (after Galvin, Fig. 12.9).</figcaption>
</figure>

<div class="example">

The inode of a UNIX-like file system has 12 direct, one single-indirect and one double-indirect pointer. The disk block size is 4 KB and a disk block address is 32 bits long. What is the maximum possible file size?

</div>

A block address is 32 b = 4 B, so one block holds $4\text{ KB} / 4\text{ B} = 2^{10}$ addresses.

$$
\begin{aligned}
\text{Max file size} &= \underbrace{12 \times 4\text{ KB}}_{\text{direct}} + \underbrace{2^{10} \times 4\text{ KB}}_{\text{single indirect}} + \underbrace{2^{10} \times 2^{10} \times 4\text{ KB}}_{\text{double indirect}} \\
&= 48\text{ KB} + 4\text{ MB} + 4\text{ GB} \approx 4\text{ GB}
\end{aligned}
$$

In general, with block size $B$ and $k = B/\text{address size}$ addresses per block, each level of indirection multiplies the reach by $k$: a pointer with $j$ levels of indirection covers $k^j$ blocks.

##### Performance

- **Contiguous:** one access for any block, since the address of block $i$ can be computed.
- **Linked:** fine for sequential access; direct access to block $i$ may need $i$ disk reads.
- **Indexed:** if the index block is in memory, one access; otherwise the index block(s) must be read first, so the cost depends on the index structure, the file size and the position of the block.

Some systems use contiguous allocation for small files and switch to indexed allocation when the file grows.

#### Free-Space Management

To reuse the space of deleted files, the system keeps a **free-space list** of all blocks not allocated to any file or directory. Creating a file takes space from it, and deleting a file returns its blocks to it. Despite the name, it need not be a list.

##### Bit Vector

The free-space list is often a **bit map** (bit vector): one bit per block, **1 if the block is free**, 0 if allocated. If blocks 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 17, 18, 25, 26 and 27 are free:

$$\texttt{00111100111111000110000001110000}\ldots$$

Its main advantage is **simplicity** and **efficiency in finding the first free block** or $n$ consecutive free blocks; many CPUs have bit-manipulation instructions for this. Scan word by word for the first nonzero word, then for its first 1 bit:

$$\text{block number} = (\text{bits per word}) \times (\text{number of 0-valued words}) + \text{offset of first 1 bit}$$

It is efficient only if the whole vector is kept in memory, and it grows with the disk: one bit per block, so a 1 TB disk with 4 KB blocks has $2^{40}/2^{12} = 2^{28}$ blocks and needs $2^{28}$ bits $= 32$ MB.

##### Linked List

Link all free blocks together: keep a pointer to the first free block (cached in memory), and let each free block point to the next.

<figure class="fig">
<svg viewBox="0 0 430 460" width="430" role="img" aria-label="Linked free-space list on disk">
  <defs><marker id="arr-free" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker><marker id="arr-freer" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ef4444"/></marker></defs>
  <rect x="138" y="48" width="268" height="372" rx="10" stroke="currentColor" stroke-width="1" fill="none" opacity=".5"/>
  <rect x="150" y="60" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="173.0" y="77.0" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <rect x="216" y="60" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="239.0" y="77.0" text-anchor="middle" font-size="11" fill="currentColor">1</text>
  <rect x="282" y="60" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="282" y="60" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="305.0" y="77.0" text-anchor="middle" font-size="11" fill="currentColor">2</text>
  <rect x="348" y="60" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="348" y="60" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="371.0" y="77.0" text-anchor="middle" font-size="11" fill="currentColor">3</text>
  <rect x="150" y="106" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="106" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="173.0" y="123.0" text-anchor="middle" font-size="11" fill="currentColor">4</text>
  <rect x="216" y="106" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="216" y="106" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="239.0" y="123.0" text-anchor="middle" font-size="11" fill="currentColor">5</text>
  <rect x="282" y="106" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="305.0" y="123.0" text-anchor="middle" font-size="11" fill="currentColor">6</text>
  <rect x="348" y="106" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="371.0" y="123.0" text-anchor="middle" font-size="11" fill="currentColor">7</text>
  <rect x="150" y="152" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="152" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="173.0" y="169.0" text-anchor="middle" font-size="11" fill="currentColor">8</text>
  <rect x="216" y="152" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="216" y="152" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="239.0" y="169.0" text-anchor="middle" font-size="11" fill="currentColor">9</text>
  <rect x="282" y="152" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="282" y="152" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="305.0" y="169.0" text-anchor="middle" font-size="11" fill="currentColor">10</text>
  <rect x="348" y="152" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="348" y="152" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="371.0" y="169.0" text-anchor="middle" font-size="11" fill="currentColor">11</text>
  <rect x="150" y="198" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="150" y="198" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="173.0" y="215.0" text-anchor="middle" font-size="11" fill="currentColor">12</text>
  <rect x="216" y="198" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="216" y="198" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="239.0" y="215.0" text-anchor="middle" font-size="11" fill="currentColor">13</text>
  <rect x="282" y="198" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="305.0" y="215.0" text-anchor="middle" font-size="11" fill="currentColor">14</text>
  <rect x="348" y="198" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="371.0" y="215.0" text-anchor="middle" font-size="11" fill="currentColor">15</text>
  <rect x="150" y="244" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="173.0" y="261.0" text-anchor="middle" font-size="11" fill="currentColor">16</text>
  <rect x="216" y="244" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="216" y="244" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="239.0" y="261.0" text-anchor="middle" font-size="11" fill="currentColor">17</text>
  <rect x="282" y="244" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="282" y="244" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="305.0" y="261.0" text-anchor="middle" font-size="11" fill="currentColor">18</text>
  <rect x="348" y="244" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="371.0" y="261.0" text-anchor="middle" font-size="11" fill="currentColor">19</text>
  <rect x="150" y="290" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="173.0" y="307.0" text-anchor="middle" font-size="11" fill="currentColor">20</text>
  <rect x="216" y="290" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="239.0" y="307.0" text-anchor="middle" font-size="11" fill="currentColor">21</text>
  <rect x="282" y="290" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="305.0" y="307.0" text-anchor="middle" font-size="11" fill="currentColor">22</text>
  <rect x="348" y="290" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="371.0" y="307.0" text-anchor="middle" font-size="11" fill="currentColor">23</text>
  <rect x="150" y="336" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="173.0" y="353.0" text-anchor="middle" font-size="11" fill="currentColor">24</text>
  <rect x="216" y="336" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="216" y="336" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="239.0" y="353.0" text-anchor="middle" font-size="11" fill="currentColor">25</text>
  <rect x="282" y="336" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="282" y="336" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="305.0" y="353.0" text-anchor="middle" font-size="11" fill="currentColor">26</text>
  <rect x="348" y="336" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="348" y="336" width="46" height="26" fill="#22c55e" opacity=".3"/>
  <text x="371.0" y="353.0" text-anchor="middle" font-size="11" fill="currentColor">27</text>
  <rect x="150" y="382" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="173.0" y="399.0" text-anchor="middle" font-size="11" fill="currentColor">28</text>
  <rect x="216" y="382" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="239.0" y="399.0" text-anchor="middle" font-size="11" fill="currentColor">29</text>
  <rect x="282" y="382" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="305.0" y="399.0" text-anchor="middle" font-size="11" fill="currentColor">30</text>
  <rect x="348" y="382" width="46" height="26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="371.0" y="399.0" text-anchor="middle" font-size="11" fill="currentColor">31</text>
  <text x="272.0" y="436.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">disk</text>
  <line x1="328.0" y1="73.0" x2="348.0" y2="73.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <polyline points="371.0,86.0 371.0,96.0 140.0,96.0 140.0,119.0 150.0,119.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="196.0" y1="119.0" x2="216.0" y2="119.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <polyline points="239.0,132.0 239.0,142.0 140.0,142.0 140.0,165.0 150.0,165.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="196.0" y1="165.0" x2="216.0" y2="165.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="262.0" y1="165.0" x2="282.0" y2="165.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="328.0" y1="165.0" x2="348.0" y2="165.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <polyline points="371.0,178.0 371.0,188.0 140.0,188.0 140.0,211.0 150.0,211.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="196.0" y1="211.0" x2="216.0" y2="211.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="239.0" y1="224.0" x2="239.0" y2="244.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="262.0" y1="257.0" x2="282.0" y2="257.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <polyline points="305.0,270.0 305.0,280.0 206.0,280.0 206.0,349.0 216.0,349.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="262.0" y1="349.0" x2="282.0" y2="349.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <line x1="328.0" y1="349.0" x2="348.0" y2="349.0" stroke="#ef4444" stroke-width="1.5" fill="none" marker-end="url(#arr-freer)"/>
  <text x="20.0" y="22.0" text-anchor="start" font-size="11" fill="currentColor">free-space list head</text>
  <polyline points="70.0,28.0 70.0,50.0 305.0,50.0 305.0,60.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-free)"/>
</svg>
<figcaption>Linked free-space list on disk (after Galvin, Fig. 12.10).</figcaption>
</figure>

Traversing the list means reading every free block, which is slow, but this is rarely needed: usually the OS just needs one free block and takes the first. (The FAT already records free blocks, so it needs no separate method.)

##### Grouping and Counting

- **Grouping:** the first free block stores the addresses of $n$ free blocks. The first $n - 1$ of them are free, and the last holds the addresses of another $n$ free blocks, and so on. Many free blocks can be found quickly.
- **Counting:** blocks are often allocated and freed in contiguous runs, so store the address of the first free block and the **count** of free contiguous blocks after it. Each entry is larger, but the list is much shorter when counts are generally greater than 1.

## References

1. <span id="ref-1"></span>Silberschatz, Abraham, Peter B. Galvin, and Greg Gagne. *Operating System Concepts*, 9th ed. Wiley, 2012.

2. <span id="ref-2"></span>Toomey, Warren. *“User- and Kernel Mode, System Calls, I/O, Exceptions.”* Computer Architecture lecture notes. [https://minnie.tuhs.org/CompArch/Lectures/week05.html](https://minnie.tuhs.org/CompArch/Lectures/week05.html).

3. <span id="ref-3"></span>Scott, Michael L. *“Exceptions and Processes.”* CSC 252 lecture notes, University of Rochester, 2014. [https://www.cs.rochester.edu/courses/252/spring2014/notes/08_exceptions](https://www.cs.rochester.edu/courses/252/spring2014/notes/08_exceptions).

4. <span id="ref-4"></span>Plank, James, and Jian Huang. *“Fork.”* CS360 lecture notes, University of Tennessee. [https://web.eecs.utk.edu/~huangj/cs360/360/notes/Fork/lecture.html](https://web.eecs.utk.edu/~huangj/cs360/360/notes/Fork/lecture.html).

5. <span id="ref-5"></span>Shene, Ching-Kuang. *“Synchronization: Critical Section and Mutual Exclusion.”* CS3331 lecture slides, Michigan Technological University. [https://web.archive.org/web/20210506091615/http://www.csl.mtu.edu/cs3331.ck/common/05-Sync-Basics.pdf](https://web.archive.org/web/20210506091615/http://www.csl.mtu.edu/cs3331.ck/common/05-Sync-Basics.pdf).
