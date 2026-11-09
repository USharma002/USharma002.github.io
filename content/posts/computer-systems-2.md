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
  .post-content figure.table.plain { counter-increment: none; }
  .post-content figure.fig { counter-increment: fig; }
  .post-content figure.table figcaption::before { content: "Table " counter(tab) ". "; font-weight: 600; color: var(--primary); }
  .post-content figure.fig figcaption::before { content: "Figure " counter(fig) ". "; font-weight: 600; color: var(--primary); }
  .post-content figure table { display: table; width: auto; margin: 0 auto; }
  .post-content figure svg { max-width: 100%; height: auto; color: var(--primary); }
  .post-content figure svg .dim { opacity: .65; }
  .post-content .figrow { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; align-items: flex-start; }
  .post-content .code-pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 1rem 0; }
  .post-content .code-pair .highlight, .post-content .code-pair pre { margin: 0 !important; }
  @media (max-width: 640px) { .post-content .code-pair { grid-template-columns: minmax(0, 1fr); } }
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

{{< figure src="/images/computer-systems/operating-systems/overview/transition_user_mode_kernel_mode_system.svg" alt="Transition from user mode to kernel mode on a system call" width="600px" class="fig" caption="Transition from user to kernel mode on a system call (after Galvin, Fig. 1.10)." >}}

- At system boot time, the hardware starts in kernel mode. The OS is then loaded and starts user applications in user mode.
- Whenever a trap or interrupt occurs, the hardware switches from user mode to kernel mode. Hence, whenever the OS gains control of the computer, it is in kernel mode.
- The system always switches to user mode (sets the mode bit to 1) before passing control to a user program.

<div class="definition">

*Privileged instructions* are machine instructions that may cause harm; the hardware allows them to be executed only in kernel mode. If a user-mode program attempts one, the hardware does not execute it but treats it as illegal and traps it to the OS.

</div>

The instruction to switch to kernel mode is itself a privileged instruction. (This means an instruction that sets the mode bit directly. The trap or system-call instruction that a user program uses to *enter* the kernel is not privileged; it switches mode only by jumping to a fixed kernel entry point.) Other examples include I/O control, timer management and interrupt management.

> **Note.** Without hardware dual mode, a buggy user program can wipe out the OS. Early PC operating systems ran on processors with no mode bit, so any program could overwrite the operating system. CPUs can also support more than two modes, e.g. a separate mode for a virtual machine manager, or the four *privilege levels* (rings) of x86.

#### Timer

The OS must keep control over the CPU even if a user program gets stuck in an infinite loop, or never calls system services and so never returns control to the OS. A **timer** can be set to interrupt the computer after a specific period. The period can be fixed or variable; a variable timer is usually implemented with a fixed-rate clock and a counter:

- the OS sets the counter (a privileged instruction);
- every clock tick decrements it;
- when it reaches 0, an interrupt occurs and the OS regains control. It can then treat the program as having exceeded its time limit.

#### Ways into the Kernel

There are only three ways for the CPU to switch from user mode to kernel mode: an **interrupt**, a **trap** (system call), or an **exception** caused by the running instruction (a fault or an abort). In each case it jumps to a handler at a fixed address taken from the **interrupt vector table**, so a user program can choose *which* service it wants but never *what code* runs in kernel mode [[2]](#ref-2).

<figure class="table">
<figcaption>Classes of exceptional control flow <a href="#ref-3">[3]</a> <a href="#ref-6">[6]</a>.</figcaption>

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

> **Note.** `malloc()` does **not** always result in a system call. It hands out memory from the heap the process already has, and only calls `sbrk()`/`brk()` when the heap has to grow.

## Process Management

### Processes

<div class="definition">

A *process* is a program in execution. Its current activity is represented by the value of the **program counter** and the contents of the processor's registers.

</div>

A program is a *passive* entity (an executable file on disk); a process is *active*. In memory, a process has the following sections:

{{< figure src="/images/computer-systems/operating-systems/process_management/layout_process_memory.svg" alt="Layout of a process in memory" width="420px" class="fig" caption="A process in memory (after Galvin, Fig. 3.1). The stack and heap grow towards each other." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/diagram_process_states.svg" alt="Diagram of process states" width="600px" class="fig" caption="Process states (after Galvin, Fig. 3.2). On a single CPU only one process can be running at a time; many can be ready or waiting." >}}

**Suspended state.** Not all processes can be kept in main memory, so some are swapped (wholly or partly) out to disk (see medium-term scheduling below). Such a process needs a further state, **suspended**: it is on disk, and therefore not available to the CPU [[7]](#ref-7).

#### Process Control Block

Each process is represented in the OS by a **process control block (PCB)**, also called a *task control block*. It contains the pieces of information associated with the process:

<div class="figrow" style="align-items:center">

{{< figure src="/images/computer-systems/operating-systems/process_management/process_control_block.svg" alt="Process control block" width="260px" class="fig" style="margin:0" caption="The PCB (after Galvin, Fig. 3.3)." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/ready_queue_i_o_device_queues.svg" alt="The ready queue and I/O device queues as linked lists of PCBs" width="680px" class="fig" caption="The ready queue and I/O device queues are linked lists of PCBs (after Galvin, Fig. 3.5)." >}}

A common representation of process scheduling is a **queueing diagram**: rectangles are queues, circles are the resources that serve them, and arrows show the flow of processes.

{{< figure src="/images/computer-systems/operating-systems/process_management/queueing_diagram_process_scheduling.svg" alt="Queueing diagram of process scheduling" width="620px" class="fig" caption="Queueing-diagram representation of process scheduling (after Galvin, Fig. 3.6)." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/medium_term_scheduling_added_queueing_diagram.svg" alt="Medium-term scheduling added to the queueing diagram" width="600px" class="fig" caption="Adding medium-term scheduling to the queueing diagram (after Galvin, Fig. 3.7)." >}}

Swapping may be needed to improve the process mix, or because a change in memory requirements has overcommitted the available memory.

##### Context Switch

Interrupts cause the OS to change a CPU from its current task to a kernel routine. When an interrupt occurs, the system needs to save the current **context** of the process running on the CPU so that it can restore that context when its processing is done, essentially suspending the process and then resuming it. The context is represented in the PCB of the process.

<div class="definition">

Switching the CPU to another process requires a **state save** of the current process and a **state restore** of a different process. This task is known as a *context switch*.

</div>

{{< figure src="/images/computer-systems/operating-systems/process_management/context_switch_process_p0_process_p1.svg" alt="Context switch from process P0 to process P1 and back" width="620px" class="fig" caption="CPU switch from process to process (after Galvin, Fig. 3.4). Thick arrows show execution; the time spent in the OS boxes is the context-switch overhead. PCBs are kept in specially reserved memory, the <em>kernel space</em>." >}}

- Context-switch time is pure **overhead**, since the system does no useful work while switching. Galvin gives "a few milliseconds" in §3.2.3 but "typically less than 10 microseconds" in §6.3.4.
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

{{< figure src="/images/computer-systems/operating-systems/process_management/process_creation_fork_exec_wait.svg" alt="Process creation using fork, exec and wait" width="600px" class="fig" caption="Process creation using the <code>fork()</code> system call (after Galvin, Fig. 3.10)." >}}

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
- **Copy-on-write.** Copying the whole address space would make `fork()` expensive, especially since the child usually calls `exec()` straight away. Modern Unix marks the pages read-only and shared, and copies a page only when one of the processes writes to it (see [Copy-on-Write](#copy-on-write) under Virtual Memory).
- `exec()` does not return on success (the old program is gone); it returns −1 only on error.

**Counting processes** (Galvin, Exercise 3.2 asks this for three `fork()` calls). Every process that executes a `fork()` becomes two, so after $n$ successive `fork()` calls (e.g. `for (i = 0; i < n; i++) fork();`) there are $2^n$ processes: the original and $2^n - 1$ children. A `printf` placed after them runs $2^n$ times. A `fork()` inside a branch, as in `if (x) fork();`, doubles only the processes that take that branch. In `if (fork() == 0)`, by contrast, every process that reaches the `if` executes the `fork()` and doubles; the condition only decides which code each copy runs next.

The process tree for $n = 3$ is a full binary tree with one level per `fork()`. At each node the left branch is the calling process carrying on and the right branch is the new child, so every right branch is created by the node it hangs from. The leaves are the 8 processes that run the code after the loop.

{{< figure src="/images/computer-systems/operating-systems/process_management/full_binary_tree_processes_created_three.svg" alt="Full binary tree of processes created by three fork calls in a loop, with the parent of each process" width="680px" class="fig" caption="Processes created by <code>for (i = 0; i &lt; 3; i++) fork();</code>, numbered in order of creation. P0 has 3 children (P1, P2, P4), P1 has 2 (P3, P5), P2 and P3 have one each, and the 4 processes created by the last <code>fork()</code> have none." >}}

In general the original process has $n$ children, and a process created in iteration $i$ ($i = 0, \ldots, n-1$) goes on to create $n - 1 - i$ children of its own.

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

For example, if a parent exits while its child is sleeping, the child's `getppid()` returns the pid of the process that adopted it (traditionally 1, the pid of `init`) once it wakes up [[4]](#ref-4).

#### Interprocess Communication

A process is *independent* if it cannot affect or be affected by other processes, and *cooperating* otherwise. Cooperating processes need an **interprocess communication (IPC)** mechanism, and there are two fundamental models:

<figure class="table">
<figcaption>The two models of IPC.</figcaption>

| | Shared memory | Message passing |
|:--|:--|:--|
| How | the processes map a common region and read and write it | `send(message)` and `receive(message)` through the kernel |
| Kernel involvement | only to set up the region | a system call for every message |
| Speed | faster | slower |
| Synchronization | the processes' own job (e.g. producer–consumer below) | provided by blocking `send`/`receive` |
| Suited to | large amounts of data on one machine | small messages, distributed systems |

</figure>

A message-passing link can be designed in several ways:

- **Naming.** In *direct* communication each process names the other, `send(P, message)`, `receive(Q, message)`, and a link joins exactly one pair. In *indirect* communication messages go through a *mailbox* (port), `send(A, message)`, which several processes may share.
- **Synchronization.** `send` and `receive` can each be *blocking* (synchronous) or *nonblocking* (asynchronous). When both block, the exchange is a *rendezvous*.
- **Buffering.** The queue of messages has *zero capacity* (the sender blocks until the receiver takes the message), *bounded capacity* $n$ (the sender blocks only when the queue is full) or *unbounded capacity* (the sender never blocks).

**Pipes.** An *ordinary pipe* (`pipe(fd)` in UNIX) is a unidirectional producer–consumer channel: one process writes to `fd[1]` and the other reads from `fd[0]`. It exists only while the processes use it, and it needs a parent–child relationship, since the child inherits the descriptors through `fork()`. A *named pipe* (FIFO in UNIX) appears in the file system, so unrelated processes can use it, and it lasts until it is deleted.

### Threads

<div class="definition">

A *thread* is a basic unit of CPU utilization. It comprises a thread ID, a program counter, a register set and a stack. Threads of the same process share its code, data and heap sections and its other OS resources such as open files, and hence also its memory-management information (e.g. the page-table base register).

</div>

{{< figure src="/images/computer-systems/operating-systems/process_management/single_threaded_multithreaded_processes.svg" alt="Single-threaded and multithreaded processes" width="680px" class="fig" caption="Single-threaded and multithreaded processes (after Galvin, Fig. 4.1). Each thread (one column) has its own registers and stack; the shaded code, data, files and heap are shared by all threads." >}}

> **Note.** Context switch cost is an important difference between processes and threads. Switching between two processes changes the address space, so, unless the TLB (the cache of page-table entries) tags its entries with address-space identifiers (ASIDs), it must be flushed, and it then fills up again slowly. Switching between two threads of the same process keeps the same address space, so the TLB and caches stay valid. Hence
>
> $$\text{cost of switching between threads} \ll \text{cost of switching between processes}$$

#### Thread Libraries

A *thread library* provides the programmer with an API for creating and managing threads (e.g. POSIX Pthreads, Windows threads, Java threads). There are two primary ways of implementing a thread library:

1. Provide a library entirely in **user space** with no kernel support.
2. Implement a **kernel-level** library supported directly by the OS.

#### Kernel Threads vs User-Level Threads

In systems that use **kernel-level threads**, the OS itself is aware of each individual thread.

- A context switch between kernel threads of the same process requires only the registers, PC and stack to be changed; the overall memory-management information does not need to be switched, since they share the same address space. So it is slightly faster than switching between two processes.
- However, kernel threads can still be expensive, because switching between them requires entering the kernel.

A **user-level thread** is a thread within a process which the OS does not know about.

- The cost of a context switch between user-level threads can be made even lower, since the OS itself is not involved: no extra system calls are required.
- A user-level thread is represented by a PC, registers, a stack and a small *thread control block (TCB)*.
- The downside: since the kernel sees only one thread, if one user thread makes a blocking system call, the whole process blocks, and the threads cannot run in parallel on a multicore machine.

#### Multithreading Models

User threads must ultimately be mapped to kernel threads:

{{< figure src="/images/computer-systems/operating-systems/process_management/many_many_many_threading_models.svg" alt="Many-to-one, one-to-one and many-to-many threading models" width="620px" class="fig" caption="Multithreading models (after Galvin, Figs. 4.5–4.7)." >}}

- **Many-to-one**: many user threads on one kernel thread. Thread management is done in user space and is efficient, but one blocking call blocks the whole process and there is no parallelism.
- **One-to-one**: each user thread is a kernel thread (Linux, Windows). More concurrency, but creating a user thread means creating a kernel thread.
- **Many-to-many**: many user threads multiplexed onto a smaller or equal number of kernel threads, combining the advantages of both.

### CPU Scheduling

CPU scheduling is the basis of multiprogrammed operating systems: by switching the CPU among processes, the OS can make the computer more productive.

#### CPU–I/O Burst Cycle

Process execution consists of a **cycle** of CPU execution and I/O wait, and processes alternate between these two states. Execution begins with a **CPU burst**, followed by an **I/O burst**, then another CPU burst, and so on. Eventually the final CPU burst ends with a system request to terminate execution.

{{< figure src="/images/computer-systems/operating-systems/process_management/alternating_sequence_cpu_i_o_bursts.svg" alt="Alternating sequence of CPU and I/O bursts" width="460px" class="fig" caption="Alternating sequence of CPU and I/O bursts (after Galvin, Fig. 6.1)." >}}

Measured CPU-burst durations have a large number of short bursts and a small number of long ones. An I/O-bound program typically has many short CPU bursts; a CPU-bound program might have a few long ones.

#### CPU Scheduler

Whenever the CPU becomes idle, the OS must select one of the processes in the ready queue to be executed. The selection is carried out by the **short-term scheduler** (CPU scheduler).

> **Note.** The ready queue is not necessarily a FIFO (first-in, first-out) queue. It can be a priority queue, a tree, or simply an unordered linked list.

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

> **Note.** It is desirable to **maximize** CPU utilization and throughput, and to **minimize** turnaround, waiting and response time. Turnaround time is generally limited by the speed of the output device. For interactive systems it has been suggested that minimizing the **variance** of the response time matters more than minimizing its average: a system with reasonable and predictable response time may be preferred to one that is faster on average but highly variable [[1]](#ref-1).

#### Scheduling Algorithms

The examples below use Galvin's process sets; all times are in milliseconds, and each Gantt chart was produced by simulating the algorithm.

##### First-Come, First-Served (FCFS)

**Idea:** maintain the ready queue as a FIFO queue. New processes are inserted at the back, and the next process is scheduled from the front. FCFS is nonpreemptive.

<div class="example">

Processes $P_1, P_2, P_3$ arrive at time 0 in that order, with the CPU burst lengths below (in milliseconds).

<figure class="table plain">

| Process | Burst Time |
|:-:|:-:|
| $P_1$ | 24 |
| $P_2$ | 3 |
| $P_3$ | 3 |

</figure>

</div>

{{< figure src="/images/computer-systems/operating-systems/process_management/gantt_chart_fcfs1.svg" alt="Gantt chart: fcfs1" width="600px" class="fig" caption="Average waiting time $= (0 + 24 + 27)/3 = 17$." >}}

If they arrive in the order $P_2, P_3, P_1$ instead:

{{< figure src="/images/computer-systems/operating-systems/process_management/gantt_chart_fcfs2.svg" alt="Gantt chart: fcfs2" width="600px" class="fig" caption="Average waiting time $= (6 + 0 + 3)/3 = 3$." >}}

**Problems.**

- FCFS suffers from the **convoy effect**: all the other processes wait for one big process to get off the CPU, which results in lower CPU and device utilization.
- The average waiting time is often quite long, and varies a lot with the arrival order.

##### Shortest-Job-First (SJF)

This algorithm associates with each process the length of its **next CPU burst**. When the CPU is available, it is assigned to the process that has the smallest next CPU burst. If two processes have the same next burst, FCFS is used to break the tie.

<div class="example">

Four processes arrive at time 0, with the CPU burst lengths below (in milliseconds).

<figure class="table plain">

| Process | Burst Time |
|:-:|:-:|
| $P_1$ | 6 |
| $P_2$ | 8 |
| $P_3$ | 7 |
| $P_4$ | 3 |

</figure>

</div>

{{< figure src="/images/computer-systems/operating-systems/process_management/gantt_chart_sjf.svg" alt="Gantt chart: sjf" width="600px" class="fig" caption="Average waiting time $= (3 + 16 + 9 + 0)/4 = 7$, versus 10.25 with FCFS." >}}

> **Note.** SJF is **provably optimal**: it gives the minimum average waiting time for a given set of processes. Moving a short process before a long one decreases the short process's waiting time more than it increases the long one's.

SJF is frequently used in long-term scheduling (where the user can give a time limit for a job). **The real difficulty with SJF is knowing the length of the next CPU request**, so although it is optimal, it cannot be implemented exactly at the level of short-term scheduling. We may, however, be able to **predict** it, as an exponential average of the previous bursts:

$$\tau_{n+1} = \alpha\, t_n + (1 - \alpha)\, \tau_n, \qquad 0 \le \alpha \le 1$$

where $t_n$ is the actual length of the $n$th CPU burst and $\tau_{n+1}$ is the predicted value of the next one. The initial $\tau_0$ can be defined as a constant or as an overall system average.

- $\alpha = 0$: $\tau_{n+1} = \tau_n$, recent history has no effect.
- $\alpha = 1$: $\tau_{n+1} = t_n$, only the most recent burst matters.
- Expanding, $\tau_{n+1} = \alpha t_n + (1-\alpha)\alpha t_{n-1} + \cdots + (1-\alpha)^{n+1}\tau_0$. Each older term has less weight, hence *exponential* average.

{{< figure src="/images/computer-systems/operating-systems/process_management/predicting_next_cpu_burst_exponential_averaging.svg" alt="Predicting the next CPU burst by exponential averaging" width="560px" class="fig" caption="Exponential averaging with $\alpha = \tfrac12$ and $\tau_0 = 10$ (after Galvin, Fig. 6.3): for bursts 6, 4, 6, 4, 13, 13, 13 the guesses are 10, 8, 6, 6, 5, 9, 11, 12." >}}

**Preemptive SJF.** SJF can be nonpreemptive or preemptive. The preemptive version, **shortest-remaining-time-first (SRTF)**, preempts the running process when a newly arrived process has a shorter burst than what is left of the current one.

<div class="example">

Four processes arrive at the times below, with the CPU burst lengths shown (in milliseconds).

<figure class="table plain">

| Process | Arrival Time | Burst Time |
|:-:|:-:|:-:|
| $P_1$ | 0 | 8 |
| $P_2$ | 1 | 4 |
| $P_3$ | 2 | 9 |
| $P_4$ | 3 | 5 |

</figure>

</div>

{{< figure src="/images/computer-systems/operating-systems/process_management/gantt_chart_srtf.svg" alt="Gantt chart: srtf" width="600px" class="fig" caption="SRTF: $P_1$ is preempted at time 1 by $P_2$ (4 &lt; 7 remaining). Average waiting time $= (9 + 0 + 15 + 2)/4 = 6.5$; nonpreemptive SJF would give 7.75." >}}

**SJF suffers from starvation**: if processes with shorter bursts keep coming, the longer processes will never get the CPU.

##### Priority Scheduling

A priority is associated with each process, and the CPU is allocated to the process with the highest priority (equal priorities are scheduled FCFS). It can be preemptive or nonpreemptive. If

$$\text{priority} \propto \frac{1}{\text{(predicted) burst time}}$$

it is equivalent to SJF or SRTF (depending on whether it is preemptive).

<div class="example">

Five processes arrive at time 0, with the CPU burst lengths (in milliseconds) and priorities below. A smaller number means a higher priority.

<figure class="table plain">

| Process | Burst Time | Priority |
|:-:|:-:|:-:|
| $P_1$ | 10 | 3 |
| $P_2$ | 1 | 1 |
| $P_3$ | 2 | 4 |
| $P_4$ | 1 | 5 |
| $P_5$ | 5 | 2 |

</figure>

</div>

{{< figure src="/images/computer-systems/operating-systems/process_management/gantt_chart_pri.svg" alt="Gantt chart: pri" width="600px" class="fig" caption="Nonpreemptive priority scheduling. Average waiting time $= (6 + 0 + 16 + 18 + 1)/5 = 8.2$." >}}

**Problem.** A major problem with priority scheduling algorithms is **starvation** (indefinite blocking): a steady stream of higher-priority processes can keep a low-priority process waiting forever.

**Solution: aging.** Aging gradually increases the priority of processes that wait in the system for a long time (e.g. raise it by 1 every 15 minutes), so every process eventually reaches a high enough priority to run.

##### Round Robin (RR)

RR is FCFS with preemption, designed for time sharing:

- Maintain the ready queue as a FIFO (**circular**) queue.
- After a small unit of time called a **time quantum** (typically 10–100 ms), the currently running process is preempted, and the process at the front of the ready queue is scheduled.
- The previously running process is inserted at the end of the ready queue.

If the burst is shorter than the quantum, the process releases the CPU voluntarily and the next process is scheduled immediately.

<div class="example">

Three processes arrive at time 0, with the CPU burst lengths below (in milliseconds) and a time quantum of 4 milliseconds.

<figure class="table plain">

| Process | Burst Time |
|:-:|:-:|
| $P_1$ | 24 |
| $P_2$ | 3 |
| $P_3$ | 3 |

</figure>

</div>

{{< figure src="/images/computer-systems/operating-systems/process_management/gantt_chart_rr.svg" alt="Gantt chart: rr" width="600px" class="fig" caption="RR with $q = 4$. Average waiting time $= (6 + 4 + 7)/3 \approx 5.67$." >}}

> **Note.** The average waiting time under RR is often long. In RR no process is allocated the CPU for more than one time quantum in a row, unless it is the only runnable process. With $n$ processes and quantum $q$, no process waits more than $(n - 1)\,q$ before its next quantum.

- If $q$ is very large, RR becomes FCFS. If $q$ is very small, the system spends most of its time context switching; $q$ should be large compared with the context-switch time.
- A context switch does not take place if only one process is running.
- The average turnaround time does not necessarily improve as the time quantum increases. It improves when most processes finish their next CPU burst within a single quantum (rule of thumb: 80% of CPU bursts should be shorter than $q$). If context-switch time is added in, the average turnaround time increases even more for a smaller quantum, since more context switches are required.

##### Multilevel Queue Scheduling

**Without feedback.**

- Multiple queues represent different priorities (e.g. foreground/interactive and background/batch).
- Processes are permanently assigned to one queue, based on a property such as memory size, priority or type.
- Each queue has its own scheduling algorithm (e.g. RR for foreground, FCFS for background).
- A lower-priority queue's processes can only run if all higher-priority queues are empty (alternatively, the queues get time slices, e.g. 80% / 20%).

{{< figure src="/images/computer-systems/operating-systems/process_management/multilevel_queue_scheduling.svg" alt="Multilevel queue scheduling" width="520px" class="fig" caption="Multilevel queue scheduling (after Galvin, Fig. 6.6)." >}}

**Problem:** too many high-priority tasks means starvation will occur in the lower queues.

**With feedback (multilevel feedback queue).**

- Allows a process to move between queues.
- If a process uses too much CPU time, it will be moved to a lower-priority queue. This leaves I/O-bound and interactive processes, which have short bursts, in the higher-priority queues.
- If a process waits too long in a lower-priority queue, it may be moved to a higher-priority queue. This form of aging prevents starvation.

{{< figure src="/images/computer-systems/operating-systems/process_management/multilevel_feedback_queues.svg" alt="Multilevel feedback queues" width="520px" class="fig" caption="Multilevel feedback queues (after Galvin, Fig. 6.7): a new process gets an 8 ms quantum; if it does not finish, it gets 16 ms in the next queue, and after that it runs FCFS." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/three_interleavings_counter_counter_starting_counter.svg" alt="Three interleavings of counter++ and counter-- starting from counter = 5" width="660px" class="fig" caption="Three possible interleavings, simulated from counter = 5. Only the first gives the correct result 5; the other two lose one of the updates. So the value of counter can be 4, 5 or 6." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/general_structure_process_critical_section.svg" alt="General structure of a process with a critical section" width="360px" class="fig" caption="General structure of a typical process (after Galvin, Fig. 5.1)." >}}

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

- **Deadlock freedom**: if two or more processes are trying to enter their critical sections, one of them will eventually enter. This is progress without the "outsiders have no influence" condition.
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

> **Note.** Because modern processors and compilers may reorder loads and stores, Peterson's solution is not guaranteed to work on modern architectures without memory barriers. Galvin still presents it because it gives a good algorithmic description of solving the critical-section problem, and shows the difficulty of meeting mutual exclusion, progress and bounded waiting in software [[1]](#ref-1).

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

**Mutex locks.** The OS packages this as a *mutex lock* (from *mutual exclusion*): a boolean `available` with two operations, which must be atomic and are usually built from `TestAndSet` or `compare_and_swap`:

```c
acquire() {
    while (!available)
        ;  /* busy wait */
    available = false;
}

release() {
    available = true;
}
```

A process calls `acquire()` before its critical section and `release()` after it. The busy waiting wastes CPU cycles, but a spinning process needs no context switch, so spinlocks are preferred on multiprocessors when locks are held only briefly.

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

{{< figure src="/images/computer-systems/operating-systems/process_management/blocking_semaphore_integer_value_list_waiting.svg" alt="A blocking semaphore: an integer value and a list of waiting processes" width="590px" class="fig" caption="With this implementation the value can become negative: its magnitude is the number of processes waiting on the semaphore." >}}

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

A related problem is **livelock**. It is similar to a deadlock, except that the states of the processes involved keep **changing** with regard to one another, yet none of them makes progress. (Think of two people in a corridor who keep stepping aside the same way to let each other pass.)

#### Priority Inversion

A scheduling challenge arises when a higher-priority process needs to read or modify kernel data that are currently being accessed by a lower-priority process, or a chain of lower-priority processes. Since kernel data are typically protected with a lock, the higher-priority process will have to wait for a lower-priority one to finish with the resource. The situation becomes more complicated if the lower-priority process is preempted in favour of another process with a higher priority.

<div class="example">

Three processes $L$, $M$ and $H$ have priorities $L < M < H$. Process $H$ requires resource $R$, which is currently being accessed by process $L$.

</div>

Ordinarily, process $H$ would wait for $L$ to finish using resource $R$. However, now suppose that process $M$ becomes runnable, thereby preempting process $L$. Indirectly, a process with a lower priority ($M$) has affected how long process $H$ must wait for $L$ to relinquish resource $R$.

{{< figure src="/images/computer-systems/operating-systems/process_management/priority_inversion_m_delays_h_while.svg" alt="Priority inversion: M delays H while L holds R" width="620px" class="fig" caption="Priority inversion: $H$ blocks on $R$ at $t = 3$, then $M$ (which doesn't even need $R$) preempts $L$ and runs for 4 units, so $H$ waits until $t = 9$." >}}

This problem is known as **priority inversion**. It occurs only in systems with more than two priorities.

Typically, these systems solve the problem by implementing a **priority-inheritance protocol**: all processes that are accessing resources needed by a higher-priority process inherit the higher priority until they are finished with the resources in question. When they are finished, their priorities revert to their original values.

{{< figure src="/images/computer-systems/operating-systems/process_management/priority_inheritance_l_runs_h_s.svg" alt="Priority inheritance: L runs at H's priority until it releases R" width="620px" class="fig" caption="With priority inheritance, $L$ temporarily runs at $H$'s priority (highlighted), so $M$ cannot preempt it; $L$ releases $R$ at $t = 5$ and $H$ runs immediately." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/circular_buffer_out_pointers.svg" alt="Circular buffer with in and out pointers" width="640px" class="fig" caption=`The bounded buffer as a circular array of 8 slots. Shaded slots hold items. When the buffer is "full" one slot is still empty, otherwise full and empty would both look like <code>in == out</code>.` >}}

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

##### The Dining-Philosophers Problem

{{< figure src="/images/computer-systems/operating-systems/process_management/five_philosophers_around_table_five_forks.svg" alt="Five philosophers around a table with five forks" width="340px" class="fig" caption="The dining philosophers (after Galvin, Fig. 5.13): philosopher $P_i$ needs fork $F_i$ on one side and $F_{(i+4)\%5}$ on the other." >}}

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

This **could deadlock** when all philosophers take the fork on their right at the same time: there will be a **circular wait**, each philosopher holding one fork and waiting for the next [[8]](#ref-8).

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

**Solution with semaphores** (Tanenbaum's solution, as presented in [[8]](#ref-8)). Use $N$ semaphores `s[0], …, s[N−1]`, all initialized to 0, and a `mutex`. Each philosopher has 3 states: `HUNGRY`, `EATING` and `THINKING`. A philosopher can only move to the `EATING` state if neither neighbour is eating (`LEFT = (i + N − 1) % N`, `RIGHT = (i + 1) % N`).

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


A philosopher eats only when neither neighbour is eating, and one who finishes eating checks whether a neighbour was waiting for the forks, and wakes them up.

> **Note.** Galvin's simple semaphore solution (one semaphore `chopstick[i]` per fork) deadlocks in the same way as the first try. Possible remedies are: allow at most four philosophers at the table; allow a philosopher to pick up forks only if both are available (picking them up in a critical section, as in the solution above); or use an asymmetric solution where odd philosophers pick up the left fork first and even ones the right. A deadlock-free solution does not necessarily eliminate starvation.

#### Monitors

Semaphores are effective, but using them incorrectly causes timing errors that are hard to detect, because they appear only for particular execution sequences. With a semaphore `mutex` guarding a critical section [[1]](#ref-1):

- swapping the order, `signal(mutex)` ... `wait(mutex)`, lets several processes into their critical sections at once (mutual exclusion is violated);
- writing `wait(mutex)` ... `wait(mutex)` causes a **deadlock**;
- omitting the `wait()`, the `signal()` or both either violates mutual exclusion or deadlocks.

These problems arise even if only a single process is not well behaved, whether from an honest programming error or an uncooperative programmer. To deal with such errors, high-level language constructs were developed; a fundamental one is the **monitor**.

<div class="definition">

A *monitor type* is an abstract data type that declares shared variables together with a set of programmer-defined operations on them, and the monitor guarantees that **only one process at a time is active within it**. The functions of a monitor can access only the variables declared in it and their own parameters [[1]](#ref-1).

</div>

```c
monitor monitor_name {
    /* shared variable declarations */

    function P1(...) { ... }
    function P2(...) { ... }
    ...
    function Pn(...) { ... }

    initialization_code(...) { ... }
}
```

The programmer does not need to code the mutual exclusion explicitly. Many programming languages, including Java and C#, have incorporated the monitor idea [[1]](#ref-1). For other synchronization schemes, a monitor can declare **condition variables**:

```c
condition x, y;
```

The only operations on a condition variable are `wait()` and `signal()`:

- `x.wait()` suspends the calling process until another process calls `x.signal()`.
- `x.signal()` resumes **exactly one** suspended process. If none is suspended, it has **no effect**: the state of `x` is as if it had never been called. This differs from a semaphore's `signal()`, which always changes the semaphore's value.

{{< figure src="/images/computer-systems/operating-systems/process_management/monitor_condition_variables.svg" alt="Monitor with condition variables" width="560px" class="fig" caption="A monitor with condition variables (after Galvin, Fig. 5.17). Processes wait to enter in the entry queue; inside, a process that calls <code>x.wait()</code> joins the queue of <code>x</code>." >}}

When a process $P$ calls `x.signal()` and a process $Q$ is suspended on `x`, both cannot be active in the monitor. There are two options [[1]](#ref-1):

1. **Signal and wait:** $P$ waits until $Q$ leaves the monitor or waits on another condition.
2. **Signal and continue:** $Q$ waits until $P$ leaves the monitor or waits on another condition.

Signal-and-continue seems reasonable since $P$ was already running, but by the time $Q$ resumes, the condition it was waiting for may no longer hold. Concurrent Pascal uses a compromise: the signalling process leaves the monitor immediately, so $Q$ resumes at once.

##### Dining Philosophers Using a Monitor

A philosopher may pick up the chopsticks only if **both** are available. Each philosopher is `THINKING`, `HUNGRY` or `EATING`, and philosopher $i$ can eat only if neither neighbour is eating. A condition `self[i]` lets a hungry philosopher wait [[1]](#ref-1):

```c
monitor DiningPhilosophers {
    enum {THINKING, HUNGRY, EATING} state[5];
    condition self[5];

    void pickup(int i) {
        state[i] = HUNGRY;
        test(i);
        if (state[i] != EATING)
            self[i].wait();
    }

    void putdown(int i) {
        state[i] = THINKING;
        test((i + 4) % 5);      /* left neighbour  */
        test((i + 1) % 5);      /* right neighbour */
    }

    void test(int i) {
        if (state[(i + 4) % 5] != EATING &&
            state[i] == HUNGRY &&
            state[(i + 1) % 5] != EATING) {
            state[i] = EATING;
            self[i].signal();
        }
    }

    initialization_code() {
        for (int i = 0; i < 5; i++)
            state[i] = THINKING;
    }
}
```

Philosopher $i$ calls `DiningPhilosophers.pickup(i)`, eats, then calls `DiningPhilosophers.putdown(i)`. No two neighbours eat at the same time and there is **no deadlock**, but a philosopher can still **starve**.

> **Note.** A monitor can be implemented with semaphores: a semaphore `mutex` (initially 1) is acquired on entering and released on leaving the monitor, and a semaphore `next` (initially 0) lets a signalling process suspend itself until the resumed process leaves or waits [[1]](#ref-1).

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

**How many instances rule out deadlock.** Let $n$ processes share $m$ instances of one resource type, each requesting or releasing one instance at a time. The system is deadlock free if the maximum need of each process is between 1 and $m$ instances and the sum of all maximum needs is less than $m + n$ (Galvin, Exercise 7.18). Rewriting the second condition,

$$m \ge \sum_{i=1}^{n} (\text{max}_i - 1) + 1$$

Even if every process holds $\text{max}_i - 1$ instances and waits for one more, one instance is still free, so some process can finish and release everything. For example, 3 processes that each need at most 2 instances are deadlock free with $m = 4$. With equal needs $k$, the bound is $n(k - 1) + 1$.

#### Resource-Allocation Graphs

Deadlocks can be described more precisely in terms of a directed graph called a **resource-allocation graph** $G = (V, E)$:

- **Vertices** $V$: the processes $P_i$ (circles) and the resource types $R_j$ (rectangles, with one dot per instance).
- **Edges** $E$: a **request edge** $P_i \to R_j$ (process $P_i$ has requested an instance of $R_j$ and is waiting), and an **assignment edge** $R_j \to P_i$ (an instance of $R_j$ has been allocated to $P_i$; it starts from the particular instance).

{{< figure src="/images/computer-systems/operating-systems/process_management/resource_allocation_graph_notation.svg" alt="Resource-allocation graph notation" width="640px" class="fig" caption="Resource-allocation graph notation." >}}

<figure class="fig">
<div class="figrow">
{{< figure src="/images/computer-systems/operating-systems/process_management/resource_allocation_graph_without_cycle.svg" alt="Resource-allocation graph without a cycle" width="500px" style="margin:0" >}}
{{< figure src="/images/computer-systems/operating-systems/process_management/resource_allocation_graph_deadlock.svg" alt="Resource-allocation graph with a deadlock" width="500px" style="margin:0" >}}
</div>
<figcaption>Top: no cycle, so no deadlock (after Galvin, Fig. 7.1). Bottom: once $P_3$ requests $R_2$ there are two cycles, $P_1 \to R_1 \to P_2 \to R_3 \to P_3 \to R_2 \to P_1$ and $P_2 \to R_3 \to P_3 \to R_2 \to P_2$, and $P_1, P_2, P_3$ are deadlocked (Fig. 7.2).</figcaption>
</figure>

If the graph contains no cycle, no process is deadlocked. If it contains a cycle, there **can** be a deadlock:

{{< figure src="/images/computer-systems/operating-systems/process_management/resource_allocation_graph_cycle_but_no.svg" alt="Resource-allocation graph with a cycle but no deadlock" width="330px" class="fig" caption="A cycle $P_1 \to R_1 \to P_3 \to R_2 \to P_1$ but no deadlock (after Galvin, Fig. 7.3): $P_4$ may release its instance of $R_2$, which can then be allocated to $P_3$, breaking the cycle." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/safe_unsafe_deadlocked_state_spaces.svg" alt="Safe, unsafe and deadlocked state spaces" width="460px" class="fig" caption="Safe, unsafe and deadlocked state spaces (after Galvin, Fig. 7.6)." >}}

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

{{< figure src="/images/computer-systems/operating-systems/process_management/resource_allocation_graph_wait_graph.svg" alt="A resource-allocation graph and its wait-for graph" width="640px" class="fig" caption="A resource-allocation graph and its wait-for graph. The cycle $P_1 \to P_2 \to P_4 \to P_1$ (red) is a deadlock; so is $P_1 \to P_2 \to P_3 \to P_4 \to P_1$." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/cpu_components_storage_can_access_directly.svg" alt="CPU components and the storage it can access directly" width="640px" class="fig" caption="The CPU can address its registers and main memory directly; the disk is reached only through I/O." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/base_limit_register_define_logical_address.svg" alt="A base and a limit register define a logical address space" width="560px" class="fig" caption="With base = 300040 and limit = 120900, the program can legally access all addresses from 300040 through 420939 (inclusive), i.e. from <em>base</em> to <em>base + limit − 1</em> (after Galvin, Fig. 8.1)." >}}

Protection of memory space is accomplished by having the CPU hardware compare **every** address generated in user mode with the registers:

{{< figure src="/images/computer-systems/operating-systems/memory_management/hardware_address_protection_base_limit_registers.svg" alt="Hardware address protection with base and limit registers" width="640px" class="fig" caption="Hardware address protection with base and limit registers (after Galvin, Fig. 8.2)." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/dynamic_relocation_relocation_register.svg" alt="Dynamic relocation using a relocation register" width="650px" class="fig" caption="Dynamic relocation: with the relocation register at 14000, logical address 346 is mapped to physical address 14346 (after Galvin, Fig. 8.4)." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/swapping_processes_disk_backing_store.svg" alt="Swapping two processes using a disk as a backing store" width="600px" class="fig" caption="Swapping: process P₁ is moved out to the backing store, and P₂ is brought in to the freed space (after Galvin, Fig. 8.5)." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/first_fit_best_fit_worst_fit.svg" alt="First fit, best fit and worst fit for a request of 212 K" width="640px" class="fig" caption="Free holes of 100, 500, 200, 300 and 600 K and a request of 212 K: first fit takes the 500 K hole, best fit the 300 K hole and worst fit the 600 K hole." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/compaction_moves_free_holes_together_large.svg" alt="Compaction moves the free holes together into one large block" width="620px" class="fig" caption="Compaction moves the processes together so the scattered holes become one large hole." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/segmentation_hardware.svg" alt="Segmentation hardware" width="620px" class="fig" caption="Segmentation hardware (after Galvin, Fig. 8.8): the segment number $s$ (grey) selects an entry of the segment table, the offset $d$ (blue) is checked against its limit, and the physical address is base + $d$." >}}

A logical address $(s, d)$ is translated as follows:

1. The segment number $s$ is used as an index into the segment table.
2. The offset $d$ must be between $0$ and the segment limit. If it is not, the hardware traps to the OS (*addressing error*: logical addressing attempt beyond the end of the segment).
3. If the offset is legal, it is added to the segment base to produce the physical address of the desired byte.

The segment table is thus essentially an array of base–limit register pairs.

{{< figure src="/images/computer-systems/operating-systems/memory_management/logical_view_segmentation_segment_table_physical.svg" alt="Logical view of segmentation, the segment table and physical memory" width="640px" class="fig" caption="Example of segmentation (after Galvin, Fig. 8.9): five segments of a program stored in physical memory, with segment 2 at 4300–4700, segment 3 at 3200–4300, and so on." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/paging_model_logical_physical_memory.svg" alt="Paging model of logical and physical memory" width="600px" class="fig" caption="Paging model (after Galvin, Fig. 8.11): any page can go in any free frame, so a process no longer needs one contiguous region." >}}

Every logical address is split into a **page number** $p$, which indexes the page table, and a **page offset** $d$, which is copied unchanged into the physical address. With a logical address space of $2^m$ and a page size of $2^n$, the high $m - n$ bits are the page number and the low $n$ bits are the offset.

> **Note.** Paging has **no external fragmentation**, since any free frame can be used. It can have **internal fragmentation**: the last page of a process is usually not completely full.

##### Protection

Memory protection in a paged environment is done by **protection bits** associated with each frame, normally kept in the page table. One bit can mark a page read–write or read-only; while the physical address is being computed, the bits are checked, and a write to a read-only page causes a hardware trap to the OS (a memory-protection violation). Separate bits can allow any combination of read, write and execute access (Galvin, §8.5.3).

One additional bit is generally attached to each page-table entry: the **valid–invalid bit**. *Valid* means the page is in the process's logical address space and is thus legal; *invalid* means it is not, and a reference to it traps to the OS (invalid page reference). The OS sets this bit for each page.

<div class="example">

A 14-bit address space (0 to 16383) holds a program that should use only addresses 0 to 10468, with 2 KB pages (Galvin, Fig. 8.15).

</div>

Pages 0 to 5 are valid and pages 6 and 7 are invalid. But the program ends inside page 5, so addresses up to $6 \times 2048 - 1 = 12287$ are accepted, and only 12288 to 16383 trap: a result of the 2 KB page size, i.e. of internal fragmentation.

Since a process rarely uses all of its address range, some systems provide a **page-table length register (PTLR)** that holds the size of the page table. Every logical address is checked against it, and an address outside the valid range causes an error trap to the OS (Galvin, §8.5.3).

##### Shared Pages

Paging makes it possible to share common code. If the code is **reentrant code** (*pure code*), i.e. non-self-modifying code that never changes during execution, two or more processes can execute the same code at the same time. Only one copy is kept in physical memory: each process's page table maps onto the same frames for the code, while each process's data pages are mapped onto different frames (Galvin, §8.5.4).

<div class="example">

40 users each run a text editor with 150 KB of code and 50 KB of data (Galvin, §8.5.4).

</div>

$$\text{unshared: } 40 \times (150 + 50) = 8000\ \text{KB} \qquad \text{shared: } 150 + 40 \times 50 = 2150\ \text{KB}$$

Compilers, window systems, run-time libraries and database systems can be shared the same way. To be sharable the code must be reentrant, and its read-only nature should be enforced by the OS, not left to the correctness of the code.

##### Size of the Page Table

But what will be the size of the page table? Take a 32-bit machine with 4-byte (32-bit) page-table entries.

{{< figure src="/images/computer-systems/operating-systems/memory_management/page_table_entry_byte.svg" alt="A page table with one entry per byte" width="360px" class="fig" caption="Mapping every byte: one page-table entry for each of the 2³² virtual addresses." >}}

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
- When the page table is kept in main memory, a **page-table base register (PTBR)** points to it. Changing page tables requires changing only this one register, which reduces context-switch time; but every access now needs two memory accesses, one for the page-table entry and one for the byte (Galvin, §8.5.2).
- The hardware must provide page-table entries **faster than that** (most of the time), so it keeps some of them inside the MMU.

##### Translation Look-aside Buffer (TLB)

<div class="definition">

The *translation look-aside buffer (TLB)* is a small, fast memory in the MMU that contains **some page-table entries** that are likely to be needed soon.

</div>

- If the required page-table entry is present in the TLB (a **TLB hit**), the MMU can do the translation fast.
- Otherwise it is a **TLB miss**: the entry must be fetched from the page table in memory (and added to the TLB). A TLB miss must be handled, possibly like the OS handles a page fault.

{{< figure src="/images/computer-systems/operating-systems/memory_management/paging_hardware_translation_look_aside_buffer.svg" alt="Paging hardware with a translation look-aside buffer" width="700px" class="fig" caption="Paging hardware with a TLB (after Galvin, Fig. 8.14). The page number $p$ is looked up in the TLB; on a hit the frame number $f$ comes straight from the TLB, on a miss it comes from the page table in memory. The offset $d$ is copied unchanged." >}}

- Some TLBs allow entries to be **wired down**, meaning that they cannot be removed from the TLB. Typically, TLB entries for **kernel code** are wired down.
- Some TLBs store **address-space identifiers (ASIDs)** in each TLB entry. An ASID uniquely identifies each process and is used to provide address-space protection for that process.
  - When the TLB attempts to resolve virtual page numbers, it ensures that the ASID for the currently running process matches the ASID associated with the virtual page. If the ASIDs do not match, the attempt is treated as a **TLB miss**.
  - This allows the TLB to contain entries for **several different processes** simultaneously.
  - If the TLB does not support separate ASIDs, then every time a new page table is selected (on a context switch), the TLB must be **flushed** (erased) to ensure that the next running process does not use the wrong translation information.

##### Effective Memory-Access Time

Let $h$ be the TLB **hit ratio**, $T_A$ the TLB access (search) time and $M_A$ the memory-access time.

$$
\begin{aligned}
\text{TLB hit time} &= T_A + M_A && \text{(access the data in memory)} \\
\text{TLB miss time} &= T_A + M_A + M_A && \text{(get the page-table entry, then the page)}
\end{aligned}
$$

$$\text{EMAT} = h\,(T_A + M_A) + (1 - h)\,(T_A + 2M_A)$$

Simplifying, we can get

$$\text{EMAT} = \underbrace{T_A}_{\text{access TLB}} + \underbrace{M_A}_{\text{access the data in memory}} + \underbrace{(1 - h)\,M_A}_{\text{extra access to the page table on a miss}}$$

<div class="example">

With $M_A = 100$ ns, a hit ratio of 80%, and $T_A$ negligible: $\text{EMAT} = 0.8 \times 100 + 0.2 \times 200 = 120$ ns, a 20% slowdown over a single memory access. With a 99% hit ratio, $\text{EMAT} = 0.99 \times 100 + 0.01 \times 200 = 101$ ns, only a 1% slowdown.

</div>

#### Multi-Level Paging

A flat page table has one entry for every page of the **virtual** address space, used or not:

- 32-bit virtual address: several MB per process.
- 64-bit virtual address: far too big.

Yet a process uses only a small part of its address space: code, data and heap at the bottom, the stack at the top, and many terabytes unused in between. *Multi-level page tables* use bits of the virtual address to index a tree of smaller tables, and simply leave out the tables for the unused regions.

{{< figure src="/images/computer-systems/operating-systems/memory_management/sparse_virtual_address_space_code_data.svg" alt="Sparse virtual address space: code, data and heap at the bottom, the stack at the top" width="460px" class="fig" caption="A typical virtual address space: code, data and heap grow from the bottom, the stack from the top, and the gap between them is never used." >}}

##### Structure

The page number is split into an **outer** and an **inner** part. The outer part indexes the *outer page table*, whose entry gives the location of an *inner page table*; the inner part indexes that table, whose entry gives the frame number. In other words, the page table itself is paged.

{{< figure src="/images/computer-systems/operating-systems/memory_management/address_translation_level_page_table.svg" alt="Address translation with a two-level page table" width="560px" class="fig" caption="Two-level address translation (after Galvin, Fig. 8.18). $p_1$ selects an entry of the outer page table, which points to an inner page table; $p_2$ selects the entry there that holds the frame number $f$. The offset $d$ is copied unchanged." >}}

Because translation works from the outer table inward, this is also called a *forward-mapped page table*. An outer entry whose region is unused is marked invalid, and its inner table is **not stored at all**.

{{< figure src="/images/computer-systems/operating-systems/memory_management/level_page_table_which_inner_tables.svg" alt="Two-level page table in which the inner tables for unused regions are not stored" width="520px" class="fig" caption="A small two-level example (2-bit outer index, 2-bit inner index). Outer entries 2 and 3 cover unused regions, so they are invalid and their inner tables are not stored." >}}

##### Two-Level Example

<div class="example">

A system has a 32-bit address space, 4 KB pages and 4 B page-table entries. A program uses only a small region near address $\texttt{0x0001\,0000}$ and the region $\texttt{0xFFFF\,0000}$–$\texttt{0xFFFF\,FFFF}$. Compare a flat page table with a two-level one.

</div>

**Flat.** There are $2^{32} / 2^{12} = 2^{20}$ pages, so the table is $2^{20} \times 4\text{ B} = 4$ MB.

**Two-level.** Split the 20-bit page number into two 10-bit parts, so that every table has $2^{10} = 1024$ entries and exactly fills one 4 KB page:

{{< figure src="/images/computer-systems/operating-systems/memory_management/32_bit_address_split_level_paging.svg" alt="32-bit address split for two-level paging" width="560px" class="fig" caption="32-bit address for two-level paging with 4 KB pages." >}}

- The outer page table has 1024 entries: $2^{10} \times 4\text{ B} = 4$ KB.
- Each inner table covers $2^{10}$ pages $= 4$ MB of address space. The two used regions fall in outer entries 0 and 1023, so only **two** inner tables are needed: $2 \times 2^{10} \times 4\text{ B} = 8$ KB.

{{< figure src="/images/computer-systems/operating-systems/memory_management/level_page_table_32_bit_example.svg" alt="Two-level page table for the 32-bit example: only outer entries 0 and 1023 are used" width="620px" class="fig" caption="The two-level table of the example: of the 1024 outer entries only 0 and 1023 are valid, so only two inner tables exist." >}}

$$\text{Total} = 4\text{ KB} + 8\text{ KB} = 12\text{ KB} \quad\text{instead of } 4\text{ MB}$$

##### Four-Level Example

<div class="example">

A system has a 64-bit address space, 64 KB pages ($2^{16}$) and 8 B page-table entries, with the page number split equally over 4 levels. A program uses only addresses $0$ to $4$ GB. Compare a flat page table with the 4-level one.

</div>

**Flat.** There are $2^{64} / 2^{16} = 2^{48}$ entries, so the table is $2^{48} \times 8\text{ B} = 2^{51}$ B, about 2 PB.

**Four-level.** The 48-bit page number is split into four 12-bit parts, so every table has $2^{12}$ entries and is $2^{12} \times 8\text{ B} = 32$ KB:

{{< figure src="/images/computer-systems/operating-systems/memory_management/64_bit_address_split_four_level.svg" alt="64-bit address split for four-level paging" width="560px" class="fig" caption="64-bit address for four-level paging with 64 KB pages." >}}

- The program uses $2^{32} / 2^{16} = 2^{16}$ pages.
- One last-level table ($P_4$) holds $2^{12}$ pages, so we need $2^{16} / 2^{12} = 2^4 = 16$ of them.
- One $P_3$ table can point to $2^{12}$ $P_4$ tables, so a single $P_3$ table is enough, and likewise a single $P_2$ and a single $P_1$ table.

{{< figure src="/images/computer-systems/operating-systems/memory_management/four_level_page_table_64_bit.svg" alt="Four-level page table for the 64-bit example: one table at each of the first three levels and sixteen at the last" width="500px" class="fig" caption="The four-level table of the example: one table at each of the first three levels, and sixteen at the last." >}}

$$\text{Total} = (1 + 1 + 1 + 16) \times 32\text{ KB} = 608\text{ KB} \quad\text{instead of } 2^{51}\text{ B}$$

The saving is huge for a sparse address space. For a process that really used its whole address space, a multi-level table would be slightly *larger* than a flat one, because the upper levels come on top.

##### Effective Memory-Access Time with $L$ Levels

The price is time: on a TLB miss, the MMU now has to read **one entry per level** before it can fetch the data.

$$
\begin{aligned}
\text{TLB hit} &= T_A + M_A && \text{(access the data in memory)} \\
\text{TLB miss} &= T_A + L \cdot M_A + M_A && \text{(walk all } L \text{ levels, then get the page)}
\end{aligned}
$$

$$\text{EMAT} = h\,(T_A + M_A) + (1 - h)\,\big(T_A + (L + 1)\,M_A\big)$$

With $L = 1$ this is the formula for a flat page table above.

#### Hashed Page Tables

For 64-bit addresses even a hierarchy gets deep. With 4 KB pages and 1024-entry inner tables, a two-level split leaves a 42-bit outer index, i.e. an outer table of $2^{42}$ entries; paging that again still leaves $2^{34}$ bytes (16 GB) at the top. With these sizes, a full 64-bit address space needs **six** levels ($\lceil 52/10 \rceil$) if every table must fit in a page, i.e. six page-table accesses per TLB miss, plus one for the data. Galvin quotes seven levels for the 64-bit UltraSPARC. So for 64-bit architectures, hierarchical page tables are generally considered inappropriate.

A common alternative for address spaces larger than 32 bits is a *hashed page table*: the virtual page number is hashed, and each entry of the hash table holds a **linked list** of the pages that hash to it (to handle collisions). Each list element has three fields:

1. the virtual page number,
2. the frame number it maps to,
3. a pointer to the next element.

To translate, hash the virtual page number $p$ and walk the list of that entry, comparing $p$ with field 1. On a match, field 2 gives the frame $r$, and the physical address is $(r, d)$.

{{< figure src="/images/computer-systems/operating-systems/memory_management/hashed_page_table.svg" alt="Hashed page table" width="540px" class="fig" caption="Hashed page table (after Galvin, Fig. 8.19). The page number $p$ is hashed; the list at that entry is searched until an element with virtual page $p$ is found, and its frame $r$ forms the physical address." >}}

A variation for 64-bit address spaces is the *clustered page table*: each hash entry maps several consecutive pages (e.g. 16) instead of one. This suits *sparse* address spaces, where references are scattered over the address space.

#### Inverted Page Tables

An ordinary page table has one entry per **virtual** page of each process, so with many processes the page tables alone can take a lot of physical memory. An *inverted page table* turns this around:

- it has one entry for each **physical frame**, holding the virtual page stored in that frame and the process that owns it;
- there is only **one** page table in the whole system.

A virtual address is the triple $\langle \text{process-id}, \text{page-number}, \text{offset} \rangle$. The pair $\langle \text{process-id}, \text{page-number} \rangle$ is searched for in the inverted table; if it is found at entry $i$, the physical address is $\langle i, \text{offset} \rangle$. If no match is found, the access is illegal. The process id plays the role of an address-space identifier, which is needed because the table holds the pages of many address spaces at once.

{{< figure src="/images/computer-systems/operating-systems/memory_management/inverted_page_table.svg" alt="Inverted page table" width="510px" class="fig" caption="Inverted page table (after Galvin, Fig. 8.20). The pair (pid, $p$) is searched for in the table; the index $i$ of the matching entry is the frame number." >}}

**Trade-offs.**

- **Less memory, more time:** the table is sorted by physical frame but looked up by virtual page, so in the worst case the whole table must be searched. A hash table limits the search to one or a few entries, but adds a memory access: one virtual reference now needs at least two real memory reads, one for the hash entry and one for the page table. (The TLB is searched first, which hides most of this.)
- **Shared memory is hard:** sharing normally maps several virtual addresses to the same frame, but here each frame has only one entry, so it can record only one virtual address. A common fix is to allow only one mapping of the shared frame at a time; references through the other virtual addresses then cause page faults.

### Virtual Memory

With virtual memory a process can run even when only part of it is in main memory: its pages stay on disk and are brought in when they are needed.

#### Paged Virtual Memory

Take a program (process) on a 32-bit machine, so its virtual address space is $2^{32}$ B = 4 GB, divided into **256 B pages**. Suppose physical memory is only 16 MB, i.e. 24-bit physical addresses, so it holds $2^{24} / 2^8 = 2^{16}$ physical pages.

{{< figure src="/images/computer-systems/operating-systems/memory_management/4_gb_virtual_address_space_256.svg" alt="A 4 GB virtual address space of 256 B pages mapped onto 16 MB of physical memory" width="660px" class="fig" caption="Virtual address 0x00000124 lies in virtual page 1 at offset 0x24. The page table maps virtual page 1 to physical page 0, so the physical address is 0x000024; the braces show how each address splits into page number and offset." >}}

- A virtual address splits into a **page number** (the top 24 bits) and an **offset** within the page (the low 8 bits, since $2^8 = 256$). For 0x000001**24**, the page number is 0x000001 and the offset is 0x24.
- The page table has an entry for this mapping: virtual page 1 → physical page 0.
- The offset is **not translated**; it is simply copied into the physical address.

> **Note.** Physical memory can be **smaller** than the virtual address space. Only some of the virtual pages are in main memory at any time; the rest stay on disk.

#### Address Translation

Each page-table entry holds the **physical page number (PPN)**, a **disk address**, and a **valid bit**:

{{< figure src="/images/computer-systems/operating-systems/memory_management/translating_virtual_address_through_page_table.svg" alt="Translating a virtual address through a page table with PPN, disk address and valid bit" width="700px" class="fig" caption="The virtual page number 0x000001 indexes the page table. Its entry is valid, with PPN 0x0000, so the physical address is the PPN followed by the same offset: 0x0000<strong>24</strong>." >}}

1. The virtual page number is used as an index into the page table.
2. If the entry's **valid bit** is 1, the page is in main memory and the entry gives its PPN.
3. The physical address is the PPN followed by the unchanged offset.

Suppose there are many virtual pages for a process, which cannot all be stored in main memory. Then we store them on the **hard disk**, and the page table records where each one is:

{{< figure src="/images/computer-systems/operating-systems/memory_management/page_tables_three_processes_mapping_virtual.svg" alt="Page tables of three processes mapping virtual pages to main memory or the hard disk" width="660px" class="fig" caption="Three processes share four frames of main memory. Each page table maps a virtual page to a frame, or marks it as not in memory (–); the contents of every virtual page are kept on the hard disk." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/steps_handling_page_fault.svg" alt="Steps in handling a page fault" width="690px" class="fig" caption="Steps in handling a page fault (after Galvin, Fig. 9.6)." >}}

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

Memory access takes 200 ns and the average page-fault service time is 8 ms. Find the EAT (effective memory-access time), and the largest page-fault rate that keeps the slowdown under 10%.

</div>

$$\text{EAT} = (1 - p) \times 200 + p \times 8{,}000{,}000 = 200 + 7{,}999{,}800\,p \text{ ns}$$

If one access in 1000 faults ($p = 0.001$), EAT $\approx 8.2\ \mu$s: the machine is **40 times slower**. For less than 10% slowdown:

$$220 > 200 + 7{,}999{,}800\,p \quad\Rightarrow\quad p < 0.0000025$$

i.e. fewer than one access in 399,990 may fault. The page-fault rate has to be kept very low.

#### Copy-on-Write

`fork()` can bypass demand paging with a technique similar to page sharing. Since many children call `exec()` immediately, copying the parent's address space may be unnecessary (Galvin, §9.3).

<div class="definition">

In *copy-on-write*, the parent and child initially share the same pages, marked as copy-on-write pages. If either process writes to a shared page, a copy of that page is created and mapped into the writer's address space, and the writer modifies its copy.

</div>

Only the pages modified by either process are copied; all unmodified pages stay shared. Only pages that can be modified need be marked copy-on-write: pages containing executable code are simply shared. The free page for the copy is typically taken from a pool of free pages using **zero-fill-on-demand** (pages zeroed-out before being allocated, erasing the previous contents).

> **Note.** `vfork()` (virtual memory fork) does **not** use copy-on-write: the parent is suspended and the child uses the parent's address space, so any page the child changes is visible to the parent when it resumes. It is meant for a child that calls `exec()` immediately, and since no pages are copied it is an extremely efficient way to create a process (Galvin, §9.3).

#### Page-Replacement Policies

**Question:** how does the page-fault handler decide which page to replace when there is a page fault?

- In the worst case, the policy could always replace the page that is going to be accessed next. Each of these would require copying the virtual page from the hard disk to memory again.
- So the OS page-fault manager code must be written based on a **realistic model of how programs behave** with respect to memory.

##### Principle of Locality of Reference

<div class="definition">

If memory address $A$ is referenced at time $t$, then **it** and its **neighbouring** memory locations are likely to be referenced in the near future. The first is *temporal locality*, the second *spatial locality*.

</div>

{{< figure src="/images/computer-systems/operating-systems/memory_management/temporal_spatial_locality.svg" alt="Temporal and spatial locality" width="560px" class="fig" caption="Temporal locality: the same address is used again soon. Spatial locality: nearby addresses are used soon." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/lru_page_replacement_3_frames.svg" alt="LRU page replacement with 3 frames" width="600px" class="fig" caption="LRU with 3 frames: 12 page faults (after Galvin, Fig. 9.15)." >}}

##### Alternate Page-Replacement Policies

**1. First In, First Out (FIFO).**

- Keep track of the order in which the pages came into memory, and replace the oldest.
- **Advantage:** it does not have to be updated when a page is re-accessed.
- **Problem:** unlike LRU, FIFO does not guarantee that the number of page faults will decrease if you increase the size of main memory. This is **Belady's anomaly** (a stack-based algorithm never suffers from it).

{{< figure src="/images/computer-systems/operating-systems/memory_management/fifo_page_replacement_3_frames.svg" alt="FIFO page replacement with 3 frames" width="600px" class="fig" caption="FIFO with 3 frames: 15 page faults (after Galvin, Fig. 9.12)." >}}

<div class="example">

Belady's anomaly. Run FIFO on the reference string $1,2,3,4,1,2,5,1,2,3,4,5$ with 3 and then 4 frames.

</div>

<figure class="fig">
{{< figure src="/images/computer-systems/operating-systems/memory_management/fifo_3_frames_1_2_3.svg" alt="FIFO with 3 frames on 1,2,3,4,1,2,5,1,2,3,4,5" width="376px" >}}
{{< figure src="/images/computer-systems/operating-systems/memory_management/fifo_4_frames_1_2_3.svg" alt="FIFO with 4 frames on 1,2,3,4,1,2,5,1,2,3,4,5" width="376px" >}}
<figcaption>With 3 frames FIFO has 9 faults, but with 4 frames it has 10: more memory gave <em>more</em> faults. LRU on the same string gives 10 faults with 3 frames and 8 with 4.</figcaption>
</figure>

**2. Approximate LRU.** For example:

- Maintain 1 bit of status information (a **reference bit**) with each physical page.
- Initially all bits are 0.
- Set a page's bit to 1 when that page is referenced.
- Replace a page that has its bit equal to 0.
- Reset all bits to 0 every once in a while.

**Additional-reference-bits algorithm.** More ordering information is gained by recording the reference bits at regular intervals (Galvin, §9.4.5.1). The OS keeps an 8-bit byte for each page. At each timer interrupt (say, every 100 ms) it shifts the page's reference bit into the **high-order** bit of the byte, shifting the other bits right by 1 and discarding the low-order bit. The byte is then the history of page use for the last eight periods: 00000000 means not used for eight periods, 11111111 means used in every period, and 11000100 was used more recently than 01110111. Read as unsigned integers, the page with the **lowest** number is the LRU page and is replaced; ties are broken by replacing all of them or by FIFO. With zero bits of history, only the reference bit itself is left, which gives the second-chance algorithm.

> **Note.** The **second-chance** (clock) algorithm is a refinement: pages are kept in FIFO order, but if the oldest page has its reference bit set, the bit is cleared and the page gets a second chance (it is moved to the back) instead of being replaced.

**Enhanced second chance.** The reference bit and the modify (dirty) bit are used as an ordered pair, giving four classes:

<figure class="table">
<figcaption>Classes in the enhanced second-chance algorithm (after Galvin, §9.4.5.3).</figcaption>

| (reference, modify) | Meaning |
|:-:|:--|
| (0, 0) | neither recently used nor modified: best page to replace |
| (0, 1) | not recently used but modified: must be written out first |
| (1, 0) | recently used but clean: probably used again soon |
| (1, 1) | recently used and modified: probably used again soon, and must be written out |

</figure>

The clock scheme is used, but the first page found in the **lowest nonempty class** is replaced, so the queue may be scanned several times. Preferring unmodified pages reduces the number of I/Os.

**Counting-based replacement.** A counter of the number of references is kept for each page:

- **LFU** (least frequently used) replaces the page with the smallest count, since an actively used page should have a large count. A page used heavily at the start but never again keeps a large count; shifting the counts right by 1 bit at regular intervals gives an exponentially decaying count.
- **MFU** (most frequently used) replaces the page with the largest count, on the argument that the page with the smallest count was probably just brought in and has yet to be used.

Neither is common: they are expensive to implement and do not approximate OPT well.

**3. Random.**

- Randomly pick an $i$ between 1 and $n$, and replace the $i$th page.
- It suffers from Belady's anomaly, since it can simulate FIFO (the random choices may happen to be the FIFO ones).

**4. Optimal page replacement (OPT).**

- An optimal page-replacement algorithm has the **lowest page-fault rate** of all algorithms, and will **never suffer from Belady's anomaly**.
- Replace the page that **will not be used for the longest period of time**.
- Unfortunately, it is difficult to implement, because it requires **future knowledge** of the reference string. It is mainly used as a yardstick to compare other algorithms.

{{< figure src="/images/computer-systems/operating-systems/memory_management/opt_page_replacement_3_frames.svg" alt="OPT page replacement with 3 frames" width="600px" class="fig" caption="OPT with 3 frames: 9 page faults (after Galvin, Fig. 9.14)." >}}

##### Stack Algorithms

LRU and OPT are both called **stack algorithms**.

<div class="definition">

A *stack algorithm* is one for which it can be shown that the set of pages in memory with $n$ frames is always a **subset** of the set of pages that would be in memory with $n + 1$ frames.

</div>

For LRU, the set of pages in memory is the $n$ most recently referenced pages; with one more frame it is the $n + 1$ most recently referenced pages, which includes them. So adding frames can never add faults: stack algorithms cannot suffer from Belady's anomaly.

> **Note.**
> - For a reference string $S$ and its reverse $S^R$, LRU has the **same page-fault rate**. Similarly, OPT has the same page-fault rate for $S$ and $S^R$. (On the string above, LRU gives 12 faults both ways and OPT gives 9; FIFO gives 15 forwards but 14 reversed.)
> - The second-chance algorithm and random page replacement **suffer** from Belady's anomaly. Second chance degenerates to FIFO replacement if all reference bits are set (Galvin, §9.4.5.2), so FIFO's anomaly carries over.

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/fields_page_table_entry.svg" alt="Fields of a page-table entry" width="560px" class="fig" caption="A page-table entry: physical page number, disk address, valid bit, bits used by the replacement policy, and the dirty bit." >}}

#### Flow of TLB and Cache

Putting the pieces together, one memory reference goes through the TLB, then (on a miss) the page table, then (on a page fault) the disk, and finally the cache:

{{< figure src="/images/computer-systems/operating-systems/memory_management/flow_address_through_tlb_page_table.svg" alt="Flow of an address through the TLB, page table and cache" width="660px" class="fig" caption="What happens on one memory reference. A TLB hit gives the frame at once; a TLB miss reads the page table and updates the TLB; a page fault brings the page in from disk (evicting a victim if memory is full) and restarts the instruction. With the physical address known, the cache is checked." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/cpu_utilization_against_degree_multiprogramming_dropping.svg" alt="CPU utilization against degree of multiprogramming, dropping sharply when thrashing starts" width="450px" class="fig" caption="Thrashing (after Galvin, Fig. 9.18). CPU utilization grows with the degree of multiprogramming up to a maximum, then drops sharply. To stop thrashing, the degree of multiprogramming must be <em>decreased</em>." >}}

**Local replacement** limits the effect: a thrashing process cannot steal frames from others and make them thrash too. But it does not solve the problem, since the thrashing processes still crowd the paging-device queue, and the page-fault service time rises for everyone.

To prevent thrashing, a process must be given as many frames as it needs. To estimate how many, we use the **locality model**: a process moves from locality to locality, where a *locality* is a set of pages actively used together (e.g. a function's code, its local variables and some globals). If a process has enough frames for its current locality, it faults only until those pages are in, and then not again until it changes locality. If not, it thrashes.

##### Working-Set Model

The **working set** is the set of pages in the most recent $\Delta$ page references, the *working-set window*. A page in active use is in the working set; a page no longer used drops out $\Delta$ references after its last use. So the working set approximates the current locality.

{{< figure src="/images/computer-systems/operating-systems/memory_management/working_set_model_window_10_references.svg" alt="Working-set model with a window of 10 references" width="600px" class="fig" caption="Working-set model (after Galvin, Fig. 9.20) with $\Delta = 10$ references." >}}

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/page_fault_frequency_upper_lower_bounds.svg" alt="Page-fault frequency with upper and lower bounds" width="700px" class="fig" caption="Page-fault frequency (after Galvin, Fig. 9.21)." >}}

#### Memory-Mapped Files

Reading a file with `open()`, `read()` and `write()` needs a system call and a disk access for every access. Instead, virtual memory can treat file I/O as ordinary memory accesses: **memory mapping** a file logically associates part of the virtual address space with the file.

- A disk block is mapped to a page in memory. The first access goes through ordinary demand paging: it page-faults, and a page-sized part of the file is read into a physical page.
- After that, reads and writes to the file are **routine memory accesses**, with no `read()`/`write()` system-call overhead.
- Writes to the mapped memory are not necessarily written to the disk at once. The OS may update the file when it checks whether the page has been modified (the dirty bit), and when the file is closed all mapped data are written back and removed from the process's virtual memory.

In UNIX/Linux this is done with the `mmap()` system call. Solaris goes further and memory-maps every file, even one accessed with `read()`/`write()` (into the kernel address space in that case).

**Sharing.** Several processes can map the same file at once. Each process's page table points to the **same physical page**, the one holding the copy of the disk block, so a write by one process is seen by all the others. Mapping can also be copy-on-write: processes share the file read-only, and get their own copy of any page they modify. Shared memory between processes is in fact often implemented by memory-mapping the same file into both address spaces.

{{< figure src="/images/computer-systems/operating-systems/memory_management/processes_mapping_same_file_onto_same.svg" alt="Two processes mapping the same file onto the same physical pages" width="620px" class="fig" caption="Memory-mapped files (after Galvin, Fig. 9.22). Pages 1–6 of the file appear in the virtual memory of both processes, and both page tables point to the same physical pages." >}}

##### Memory-Mapped I/O

The same idea is used for devices. Each I/O controller has registers for commands and data. With **memory-mapped I/O**, a range of memory addresses is set aside and mapped to the device registers, so reading or writing those addresses transfers data to and from the device. This suits fast devices such as video controllers, where each screen location is mapped to a memory location.

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

{{< figure src="/images/computer-systems/operating-systems/memory_management/buddy_system_splitting_256_kb_satisfy.svg" alt="Buddy system splitting 256 KB to satisfy a 21 KB request" width="520px" class="fig" caption="Buddy system allocation (after Galvin, Fig. 9.26). $C_L$ is allocated to the 21 KB request." >}}

- **Advantage: coalescing.** Adjacent buddies can be combined quickly. When $C_L$ is released, $C_L$ and $C_R$ coalesce into the 64 KB $B_L$, which coalesces with $B_R$ into 128 KB, and so on back to 256 KB.
- **Drawback: internal fragmentation.** Rounding up wastes space inside the allocated unit: a 33 KB request gets 64 KB. Up to about 50% of an allocated unit can be wasted.

##### Slab Allocation

- A **slab** is one or more physically contiguous pages.
- A **cache** consists of one or more slabs. There is one cache for each kind of kernel data structure (process descriptors, file objects, semaphores, …).
- Each cache is filled with **objects**, instances of its data structure.

{{< figure src="/images/computer-systems/operating-systems/memory_management/slab_allocation_kernel_objects_caches_slabs.svg" alt="Slab allocation: kernel objects, caches and slabs" width="540px" class="fig" caption="Slab allocation (after Galvin, Fig. 9.27): two 3 KB objects and three 7 KB objects, each kind in its own cache." >}}

When a cache is created, a number of objects, all marked **free**, are allocated to it; how many depends on the slab size (a 12 KB slab of three 4 KB pages holds six 2 KB objects). When the kernel needs an object, the allocator hands out any free object from the cache and marks it **used**. For example, a new Linux task needs a `struct task_struct`, which comes ready-made from the `task_struct` cache.

In Linux a slab is **full** (all objects used), **empty** (all free) or **partial**. A request is served first from a partial slab, then from an empty one, and only if neither exists is a new slab allocated from contiguous physical pages.

The two main benefits:

1. **No memory is wasted to fragmentation:** each cache is divided into chunks of exactly the object's size, so the kernel gets exactly the memory the object needs.
2. **Requests are satisfied quickly:** objects are created in advance, and a released object is just marked free and returned to its cache, ready for the next request. This suits the kernel, which allocates and frees objects very often.

The slab allocator first appeared in Solaris 2.4; Linux used the buddy system until version 2.2 and then adopted slab allocation.

#### Other Considerations

##### Prepaging

Pure demand paging causes many page faults when a process starts (or a swapped-out process restarts), each page brought in by its own fault. *Prepaging* brings into memory at one time all the pages that will be needed; e.g. with the working-set model, a suspended process's working set is remembered and brought back in full before it is restarted (Galvin, §9.9.1).

If $s$ pages are prepaged and a fraction $\alpha$ of them is actually used ($0 \le \alpha \le 1$), the question is whether the cost of the $s \cdot \alpha$ saved page faults is greater or less than the cost of prepaging $s \cdot (1 - \alpha)$ unnecessary pages. If $\alpha$ is close to 0, prepaging loses; if it is close to 1, prepaging wins.

##### Page Size

Page sizes are invariably powers of 2, generally from $2^{12}$ (4,096) to $2^{22}$ (4,194,304) bytes. There is no single best size (Galvin, §9.9.2):

<figure class="table">
<figcaption>Factors in choosing a page size (after Galvin, §9.9.2).</figcaption>

| Factor | Favours | Galvin's example |
|:--|:-:|:--|
| Page-table size | large | 4 MB of virtual memory: 4,096 pages of 1,024 B but only 512 pages of 8,192 B |
| Internal fragmentation | small | half the last page is wasted on average: 256 B for 512 B pages, 4,096 B for 8,192 B pages |
| I/O time | large | seek 20 ms + latency 8 ms dwarf transfer: one 1,024 B page takes 28.4 ms, two 512 B pages take 56.4 ms |
| Locality (total I/O and memory) | small | of a 200 KB process only 100 KB is used; smaller pages bring in only what is used |
| Number of page faults | large | that 100 KB used: 1 fault with a 200 KB page, 102,400 faults with 1 B pages |

</figure>

The historical trend is toward **larger** page sizes.

##### TLB Reach

<div class="definition">

The *TLB reach* is the amount of memory accessible from the TLB: the number of entries multiplied by the page size.

$$\text{TLB reach} = \text{number of TLB entries} \times \text{page size}$$

</div>

Ideally the working set of a process is stored in the TLB; if not, the process spends considerable time resolving references in the page table. Doubling the number of entries doubles the reach, but the associative memory of the TLB is expensive and power hungry. Increasing the page size, say from 8 KB to 32 KB, quadruples the reach, at the cost of more fragmentation; or the OS may support several page sizes (Galvin, §9.9.3).

<div class="example">

Solaris on UltraSPARC uses 8 KB and 4 MB pages with a 64-entry TLB (Galvin, §9.9.3).

</div>

$$64 \times 8\ \text{KB} = 512\ \text{KB} \qquad 64 \times 4\ \text{MB} = 256\ \text{MB}$$

Supporting multiple page sizes requires the OS, not the hardware, to manage the TLB (each entry must record its page size). Software management costs performance, but the higher hit ratio and reach offset it.

## Storage Management

### Mass-Storage Structure

#### Disk Structure

##### Magnetic Disks

A disk has one or more **platters**, each with two magnetic surfaces, on a common **spindle**. A **read–write head** flies just above each surface. All heads are attached to one **disk arm** and move together.

- Each surface is divided into concentric **tracks**, and each track into **sectors**.
- The set of tracks at one arm position (the same track on every surface) is a **cylinder**.

{{< figure src="/images/computer-systems/operating-systems/storage_management/moving_head_disk_top_view_surface.svg" alt="Moving-head disk: top view of a surface and side view of platters and arm" width="720px" class="fig" caption="Moving-head disk (after Galvin, Fig. 10.1). Left: one surface, with a track and a sector on it. Right: the platters on the spindle and the heads on the arm assembly; the tracks under the heads at one arm position form a cylinder." >}}

If a head touches the surface it damages it. This is a **head crash**, and the disk usually has to be replaced.

The disk is addressed as a one-dimensional array of **logical blocks** (e.g. 512 B), the smallest unit of transfer. The array is mapped onto the sectors in order: sector 0 is the first sector of the first track of the outermost cylinder, then the rest of that track, then the other tracks of that cylinder, then the next cylinder inward. With $H$ surfaces and $S$ sectors per track, block $b$ is at

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

Seek time and rotational latency make up 14.17 ms of the 14.3 ms.

> **Note.** A **solid-state disk (SSD)** is nonvolatile memory used like a hard disk. It has no moving parts, so there is no seek time or rotational latency. It uses less power, but costs more per MB and may wear out sooner.

#### Disk Scheduling

A disk I/O request is a system call that gives: input or output, the disk address, the memory address, and the number of sectors. If the disk is busy, the request goes into the disk's queue of pending requests, and when one request finishes the OS chooses which one to serve next. The algorithms below choose so as to reduce the **total head movement** (seek distance).

All examples use Galvin's request queue on a disk with cylinders 0–199, with the head at cylinder 53:

$$98,\ 183,\ 37,\ 122,\ 14,\ 124,\ 65,\ 67$$

##### FCFS

Serve requests in the order they arrive. It is fair, but does not give the fastest service.

{{< figure src="/images/computer-systems/operating-systems/storage_management/fcfs_head_movement.svg" alt="FCFS head movement" width="600px" class="fig" caption="FCFS disk scheduling (after Galvin, Fig. 10.4). Total head movement: 640 cylinders." >}}

The swing from 122 to 14 and back to 124 shows the problem: serving 37 and 14 together, before or after 122 and 124, would save a lot of movement.

##### Shortest Seek Time First (SSTF)

Serve the pending request **closest to the current head position**. From 53 the closest is 65, then 67, then 37 (closer than 98), then 14, 98, 122, 124 and 183.

{{< figure src="/images/computer-systems/operating-systems/storage_management/sstf_head_movement.svg" alt="SSTF head movement" width="600px" class="fig" caption="SSTF disk scheduling (after Galvin, Fig. 10.5). Total head movement: 12 + 2 + 30 + 23 + 84 + 24 + 2 + 59 = 236 cylinders." >}}

SSTF is essentially SJF for the disk, and like SJF:

- It can cause **starvation**: a steady stream of requests near the head can keep a far request (say at 186) waiting forever.
- It is not optimal: going 53 → 37 → 14 first and then 65, …, 183 gives only 208 cylinders.

##### SCAN (Elevator)

The arm starts at one end and moves to the other end, serving requests as it reaches each cylinder, then reverses. Like an elevator, it serves everything going up, then everything going down. The direction of movement must be given; here the arm moves toward 0.

{{< figure src="/images/computer-systems/operating-systems/storage_management/scan_head_movement.svg" alt="SCAN head movement" width="600px" class="fig" caption="SCAN disk scheduling (after Galvin, Fig. 10.6). The head serves 37 and 14, goes on to 0, then reverses. Total: (53 − 0) + (183 − 0) = 236 cylinders." >}}

A request just in front of the head is served almost at once; one just behind it waits for the arm to reach the end and come back.

##### C-SCAN

When SCAN reverses, the cylinders just in front of the head were served only a moment ago, and the requests that have waited longest are at the **other** end. *Circular SCAN* goes there directly: it serves requests in one direction only, and at the end it returns to the beginning **without serving anything** on the way back. The cylinders are treated as a circular list, which gives a more uniform wait time.

{{< figure src="/images/computer-systems/operating-systems/storage_management/c_scan_head_movement.svg" alt="C-SCAN head movement" width="600px" class="fig" caption="C-SCAN disk scheduling (after Galvin, Fig. 10.7), moving toward 199. The dashed line is the return sweep from 199 to 0, which serves nothing; hollow dots are the ends of the disk. Total: (199 − 53) + 199 + 37 = 382 cylinders, or 183 if the return sweep is not counted." >}}

##### LOOK and C-LOOK

SCAN and C-SCAN go all the way to the end of the disk. In practice the arm goes only as far as the **last request** in each direction and then turns around. These versions are called **LOOK** and **C-LOOK**, because they look for a request before moving on in a direction.

{{< figure src="/images/computer-systems/operating-systems/storage_management/look_head_movement.svg" alt="LOOK head movement" width="600px" class="fig" caption="LOOK, moving toward 0: the arm turns at 14 instead of 0. Total: (53 − 14) + (183 − 14) = 208 cylinders." >}}

{{< figure src="/images/computer-systems/operating-systems/storage_management/c_look_head_movement.svg" alt="C-LOOK head movement" width="600px" class="fig" caption="C-LOOK disk scheduling (after Galvin, Fig. 10.8), moving toward 199: after 183 the arm jumps (dashed) to 14, the lowest request. Total: (183 − 53) + (183 − 14) + (37 − 14) = 322 cylinders, or 153 without the jump." >}}

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
- SSDs have no head, so they usually use FCFS.

#### Disk Management

##### Disk Formatting

A new disk is just magnetic material. **Low-level (physical) formatting** divides it into sectors the controller can read and write. Each sector gets a **header**, a **data area** (e.g. 512 B) and a **trailer**; the header and trailer hold information for the controller, such as the sector number and an **error-correcting code (ECC)**.

{{< figure src="/images/computer-systems/operating-systems/storage_management/sector_layout_header_data_area_trailer.svg" alt="Sector layout: header, data area, trailer" width="560px" class="fig" caption="Layout of a sector after low-level formatting." >}}

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

**Example: Windows with legacy BIOS/MBR booting.** The first sector of the disk is the **master boot record (MBR)**. It holds the boot code and a **partition table** with a flag marking the **boot partition**. The ROM code runs the boot code in the MBR; this finds the boot partition, reads its first sector (the **boot sector**), and the boot continues from there.

{{< figure src="/images/computer-systems/operating-systems/storage_management/booting_disk_windows_mbr_holds_boot.svg" alt="Booting from disk in Windows: the MBR holds boot code and the partition table" width="420px" class="fig" caption="Booting from disk in Windows (after Galvin, Fig. 10.9). The partition table in the MBR marks which partition to boot from." >}}

##### Bad Blocks

Sometimes a disk fails completely and must be replaced. More often, single sectors become defective; most disks even come from the factory with some bad blocks.

**Simple disks.** Bad blocks are handled manually. The disk is scanned for bad blocks while it is formatted, and those found are flagged so the file system never allocates them. Blocks that go bad later are found by running a program such as Linux's `badblocks`; their data are usually lost.

**Smarter disks.** The controller keeps a list of bad blocks, created during low-level formatting and updated over the life of the disk. Formatting also sets aside **spare sectors** that the OS cannot see. A bad sector is then replaced logically in one of two ways.

**Sector sparing (forwarding).** The bad sector is replaced by a spare:

1. The OS tries to read logical block 87.
2. The controller computes the ECC, finds the sector is bad, and reports it to the OS.
3. At the next reboot, a special command tells the controller to replace the bad sector with a spare.
4. From then on, a request for block 87 is translated by the controller to the spare's address.

This redirection can undo the work of the disk-scheduling algorithm, so disks keep a few spare sectors in **every cylinder** (and a spare cylinder), and a bad block is remapped to a spare in the same cylinder when possible.

**Sector slipping.** Suppose logical block 17 goes bad and the first spare follows sector 202. Every sector from 17 to 202 is moved down one place: 202 is copied into the spare, 201 into 202, …, 18 into 19. This frees the place of sector 18, and block 17 is mapped to it. Consecutive blocks stay consecutive on the disk.

{{< figure src="/images/computer-systems/operating-systems/storage_management/bad_block_replacement_sector_sparing_sector.svg" alt="Bad-block replacement by sector sparing and sector slipping" width="460px" class="fig" caption="Replacing bad block 17. Sparing maps it to a spare elsewhere; slipping shifts blocks 17–202 down by one so that block 17 lands in the old place of 18." >}}

Replacement is not fully automatic, because the data in a bad block are usually lost. A soft error can trigger copying the block and sparing or slipping it; an unrecoverable **hard error** loses data, and the file that used the block has to be repaired by hand (e.g. from a backup).

### File-System Interface

#### Open Files

To avoid searching the directory on every operation, most systems require an `open()` call before a file is used. `open()` searches the directory, copies the directory entry into the **open-file table**, checks the requested access mode (read-only, read–write, append-only, …) against the file's permissions, and returns a pointer to the table entry, which is used in all later I/O. `close()` removes the entry.

When several processes may open the same file, the OS keeps two levels of tables:

- a **per-process table** of the files the process has open, holding its own use of each file: the **current file pointer**, access rights and accounting information;
- a **system-wide table** of process-independent information: the file's location on disk, access dates and size, and an **open count** of the processes that have it open. Each `close()` decrements the count, and the entry is removed when it reaches zero.

#### Access Methods

- **Sequential access:** the file is processed in order, one record after the other (the tape model). `read_next()` reads the next portion and advances the file pointer, and `write_next()` appends to the end. This is by far the most common method; editors and compilers use it.
- **Direct (relative) access:** the file is a numbered sequence of fixed-length logical records that can be read and written in any order (the disk model), with `read(n)` and `write(n)`, or `position_file(n)` followed by `read_next()`. The block number $n$ is relative to the beginning of the file, and with record length $L$, record $N$ starts at byte $L \times N$ (records numbered from 0). Databases are often of this type.
- **Indexed access**, built on top of direct access: an index, like the index of a book, holds pointers to the blocks; to find a record, the index is searched and the pointer used to access the file directly. A large index can itself be indexed (a primary index pointing to secondary index blocks).

#### Directory Structure

A directory is a table that maps file names to their directory entries. The question is how to organize it.

##### Single-Level Directory

The simplest structure: **all files are in the same directory**. It is easy to support and understand, but since all files are in one directory they must have **unique names**, which is a problem once there are many files or more than one user.

{{< figure src="/images/computer-systems/operating-systems/storage_management/single_level_directory.svg" alt="Single-level directory" width="540px" class="fig" caption="Single-level directory (after Galvin, Fig. 11.9)." >}}

##### Two-Level Directory

The standard solution is a separate directory for each user. Each user has a **user file directory (UFD)** listing only their files. When a user logs in, the **master file directory (MFD)**, indexed by user name, is searched to find their UFD.

{{< figure src="/images/computer-systems/operating-systems/storage_management/level_directory_structure.svg" alt="Two-level directory structure" width="560px" class="fig" caption="Two-level directory structure (after Galvin, Fig. 11.10)." >}}

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

{{< figure src="/images/computer-systems/operating-systems/storage_management/tree_structured_directory.svg" alt="Tree-structured directory" width="640px" class="fig" caption="Tree-structured directory (simplified, after Galvin, Fig. 11.11). Boxes are directories, circles are files." >}}

Deleting a non-empty directory is a policy choice: some systems refuse until it is empty; others (like UNIX `rm -r`) delete everything below it.

A tree **prohibits sharing** of files or directories: each file has exactly one parent.

##### Acyclic-Graph Directories

An *acyclic graph* (a graph with no cycles) allows directories to **share subdirectories and files**: the same file or directory can appear in two directories at once. A shared file is not the same as two copies: there is only **one** actual file, so a change made by one person is immediately visible to the other, and a new file created in a shared subdirectory appears in all the places it is shared.

{{< figure src="/images/computer-systems/operating-systems/storage_management/acyclic_graph_directory_structure.svg" alt="Acyclic-graph directory structure" width="560px" class="fig" caption="Acyclic-graph directory structure (after Galvin, Fig. 11.12). The file <code>count</code> and the directory <code>list</code> are shared by <code>dict</code> and <code>spell</code>." >}}

Sharing is usually implemented with a **link**, a directory entry that is a pointer (a path name) to another file or directory. It is more flexible than a tree, but also more complex:

- A file can now have several path names, so a traversal (search, backup) must avoid visiting shared parts twice.
- **Deletion:** if the file is removed whenever anyone deletes it, the other entries become **dangling pointers** to a file that no longer exists (or, worse, to blocks reused by another file). With *symbolic links*, deleting the link leaves the file, and deleting the file leaves the links dangling (UNIX and Windows do this). The alternative is to keep the file until all references are gone, using a **reference count**: UNIX does this for *hard links*, keeping the count in the inode.

If links may create cycles we get a **general graph directory**. Then a search can loop forever, and a reference count may be nonzero even when the file can no longer be reached, so **garbage collection** is needed to reclaim space. Cycles are avoided by not allowing links to directories, or by ignoring links when traversing.

### File-System Implementation

#### Allocation Methods

How are a file's blocks placed on the disk, so that space is used well and files can be accessed quickly? There are three main methods: contiguous, linked and indexed.

##### Contiguous Allocation

Each file occupies a set of **contiguous blocks**. A file is described by the address of its first block and its length: a file of $n$ blocks starting at $b$ occupies $b, b+1, \dots, b+n-1$. The directory entry stores the start and the length.

{{< figure src="/images/computer-systems/operating-systems/storage_management/contiguous_allocation_disk_space.svg" alt="Contiguous allocation of disk space" width="500px" class="fig" caption="Contiguous allocation of disk space (after Galvin, Fig. 12.5)." >}}

Accessing block $b+1$ after block $b$ normally needs no head movement, and when it does (from the last sector of one cylinder to the first of the next) the head moves only one track. So the number of seeks is minimal.

- **Sequential access ✓:** remember the last block read and read the next one.
- **Direct access ✓:** block $i$ of the file is at $b + i$.
- **Growing a file ✗:** the space on both sides may be in use.

Problems:

- **Finding space** for a new file is the dynamic storage-allocation problem of memory (first fit, best fit, …), and it suffers from **external fragmentation**. **Compaction** copies all files so that the free space becomes one contiguous region, but it takes time (hours on large disks).
- **The size must be known** when the file is created. If too little is allocated, the file cannot be extended; if we overestimate, the space is wasted (internal fragmentation). A modified scheme allocates more contiguous chunks, called **extents**, when needed.

##### Linked Allocation

Each file is a **linked list of disk blocks**, which may be scattered anywhere on the disk. The directory holds pointers to the first and last blocks, and each block holds a pointer to the next. The pointers are not visible to the user: with 512 B blocks and 4 B pointers, the user sees blocks of 508 B.

{{< figure src="/images/computer-systems/operating-systems/storage_management/linked_allocation_disk_space.svg" alt="Linked allocation of disk space" width="510px" class="fig" caption="Linked allocation of disk space (after Galvin, Fig. 12.6). The file <code>jeep</code> occupies blocks 9, 16, 1, 10 and 25; −1 marks the end." >}}

- **Sequential access ✓**, **growing a file ✓**: any free block can be added, so there is no external fragmentation, the size need not be declared, and compaction is never needed.
- **Direct access ✗:** to find block $i$ we must follow $i$ pointers from the start, each a disk read.

Other problems are **pointer overhead** (4 B of every 512 B block is 0.78% of the disk) and **reliability** (one damaged pointer loses the rest of the file). The usual fix for overhead is to allocate **clusters** of several blocks instead of single blocks: fewer pointers and fewer seeks, at the cost of more internal fragmentation.

##### File-Allocation Table (FAT)

An important variation on linked allocation, used by the FAT file system of MS-DOS. A section at the beginning of each volume holds a **table with one entry per disk block**, indexed by block number.

- The directory entry holds the number of the file's **first block**.
- The table entry for that block holds the number of the **next block**, and so on, until the last block, whose entry is a special **end-of-file** value.
- A free block has table value 0. To add a block, find a 0 entry and link it at the end.

{{< figure src="/images/computer-systems/operating-systems/storage_management/file_allocation_table_file_blocks_217.svg" alt="File-allocation table for a file in blocks 217, 618, 339" width="480px" class="fig" caption="File-allocation table (after Galvin, Fig. 12.7) for a file in blocks 217, 618 and 339." >}}

The FAT can cause many seeks, since the head must go to the start of the volume to read the table and then to the block, unless the FAT is **cached**. The benefit is that **random access improves**: the location of any block can be found by reading only the FAT, without reading the blocks in between.

##### Indexed Allocation

Indexed allocation brings all the pointers together into one place, the **index block**. Each file has its own index block, an array of disk-block addresses: entry $i$ points to block $i$ of the file. The directory holds the address of the index block. When the file is created, all entries are nil.

{{< figure src="/images/computer-systems/operating-systems/storage_management/indexed_allocation_disk_space.svg" alt="Indexed allocation of disk space" width="500px" class="fig" caption="Indexed allocation of disk space (after Galvin, Fig. 12.8). Index block 19 lists the blocks of <code>jeep</code> in order." >}}

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

{{< figure src="/images/computer-systems/operating-systems/storage_management/unix_inode_direct_single_double_triple.svg" alt="The UNIX inode with direct, single, double and triple indirect pointers" width="560px" class="fig" caption="The UNIX inode (after Galvin, Fig. 12.9)." >}}

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

It is efficient only if the whole vector is kept in memory, and it grows with the disk: one bit per block, so a 1 TB disk with 4 KB blocks has $2^{40}/2^{12} = 2^{28}$ blocks and needs $2^{28}$ bits $= 32$ MB. (Galvin gives 256 MB for this case, which would be one byte per block; at one bit per block it is 32 MB.)

##### Linked List

Link all free blocks together: keep a pointer to the first free block (cached in memory), and let each free block point to the next.

{{< figure src="/images/computer-systems/operating-systems/storage_management/linked_free_space_list_disk.svg" alt="Linked free-space list on disk" width="430px" class="fig" caption="Linked free-space list on disk (after Galvin, Fig. 12.10)." >}}

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

6. <span id="ref-6"></span>Bryant, Randal E., and David R. O'Hallaron. *Computer Systems: A Programmer's Perspective*, 3rd ed. Pearson, 2016, §8.1.

7. <span id="ref-7"></span>Martonosi, Margaret. *"Processes and Threads."* COS 318: Operating Systems lecture slides, Princeton University, Fall 2011. [https://www.cs.princeton.edu/courses/archive/fall11/cos318/lectures/L4_ProcessesThreads.pdf](https://www.cs.princeton.edu/courses/archive/fall11/cos318/lectures/L4_ProcessesThreads.pdf).

8. <span id="ref-8"></span>*"Classical Synchronization Problems."* CS 241 lecture slides, University of Illinois at Urbana-Champaign, Spring 2010 (code from Tanenbaum, *Modern Operating Systems*). [https://courses.grainger.illinois.edu/cs241/sp2010/lectures/17-ClassicSynch.pdf](https://courses.grainger.illinois.edu/cs241/sp2010/lectures/17-ClassicSynch.pdf).
