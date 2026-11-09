---
author: ["Utkarsh Sharma"]
title: "Computer Systems I: Digital Electronics"
date: "2026-11-03T10:00:00"
description: "Lecture notes on digital electronics, from Boolean algebra to flip-flops and counters."
summary: "Part I of the Computer Systems series: digital electronics (Boolean algebra, duality, canonical forms, K-maps, NAND/NOR implementation, hazards), decoders, encoders and multiplexers, number systems and codes, number representation, adders, multiplication and Booth's algorithm, IEEE 754 floating point, latches and flip-flops, registers, counters and state machines."
tags: ["Digital Electronics", "Digital Logic"]
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
  .post-content figure.split-1 :is(th, td):nth-child(1),
  .post-content figure.split-2 :is(th, td):nth-child(2),
  .post-content figure.split-3 :is(th, td):nth-child(3),
  .post-content figure.split-4 :is(th, td):nth-child(4),
  .post-content figure.split-5 :is(th, td):nth-child(5),
  .post-content figure.split-6 :is(th, td):nth-child(6),
  .post-content figure.split-7 :is(th, td):nth-child(7),
  .post-content figure.split-8 :is(th, td):nth-child(8) { border-right: 1px solid var(--secondary); }
  .post-content figure.pairs tbody tr:is(:nth-child(4n+1), :nth-child(4n+2)) td { background: var(--tertiary); }
  .post-content .figrow { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; align-items: flex-start; }
</style>

## Boolean Algebra

### Logic Gates

A Boolean variable takes one of two values, 0 or 1. A *truth table* lists the output of a function for every combination of its inputs, so $n$ inputs give $2^n$ rows. The three basic operations are AND ($a \cdot b$, often written $ab$), OR ($a + b$) and NOT ($\bar a$). Combining them gives the other common gates:

<figure class="table split-2">
<figcaption>The two-input gates (NOT has one input: $\bar a$ is 1 exactly when $a = 0$).</figcaption>

| $a$ | $b$ | AND $ab$ | OR $a + b$ | NAND $\overline{ab}$ | NOR $\overline{a + b}$ | XOR $a \oplus b$ | XNOR $a \odot b$ |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 1 | 1 | 0 | 1 |
| 0 | 1 | 0 | 1 | 1 | 0 | 1 | 0 |
| 1 | 0 | 0 | 1 | 1 | 0 | 1 | 0 |
| 1 | 1 | 1 | 1 | 0 | 0 | 0 | 1 |

</figure>

### Postulates

<div class="definition">

A *Boolean algebra* is a set $B$ with two operators $+$ and $\cdot$ satisfying the *Huntington postulates*:

1. **Closure**: $x + y$ and $x \cdot y$ are in $B$.
2. **Identity**: $x + 0 = x$ and $x \cdot 1 = x$.
3. **Commutativity**: $x + y = y + x$ and $x \cdot y = y \cdot x$.
4. **Distributivity**: $x \cdot (y + z) = xy + xz$ and $x + yz = (x + y)(x + z)$.
5. **Complement**: every $x$ has an $\bar x$ with $x + \bar x = 1$ and $x \cdot \bar x = 0$.
6. There are at least two elements $x \neq y$ in $B$.

</div>

Two-valued Boolean algebra is the case $B = \{0, 1\}$ with AND, OR and NOT as defined in the truth table above. Note that $+$ also distributes over $\cdot$, unlike in ordinary arithmetic.

### Basic Theorems

Every theorem below follows from the postulates:

$$
\begin{aligned}
x + x &= x & x \cdot x &= x && \text{idempotence} \\
x + 1 &= 1 & x \cdot 0 &= 0 && \text{null element} \\
\bar{\bar x} &= x & & && \text{involution} \\
x + (y + z) &= (x + y) + z & x(yz) &= (xy)z && \text{associativity} \\
x + xy &= x & x(x + y) &= x && \text{absorption} \\
\overline{x + y} &= \bar x \, \bar y & \overline{xy} &= \bar x + \bar y && \text{De Morgan} \\
xy + \bar x z + yz &= xy + \bar x z & (x + y)(\bar x + z)(y + z) &= (x + y)(\bar x + z) && \text{consensus}
\end{aligned}
$$

### Duality

Every postulate above comes as a pair: the second half is the first with $+$ and $\cdot$ swapped and $0$ and $1$ swapped. So any proof made from the postulates can be dualized step by step, which gives:

<div class="definition">

The *duality principle* states that every Boolean identity remains valid if the operators and the identity elements are interchanged: $+ \leftrightarrow \cdot$ and $0 \leftrightarrow 1$.

</div>

For example, in the theorems above each identity on the right is the dual of the one on its left.

If $F = F(a, b, c, +, \cdot, 1, 0)$ is a function, then

$$
\begin{aligned}
F   &= F(a, b, c,\; +, \cdot,\; 1, 0) && \text{function} \\
F^D &= F(a, b, c,\; \cdot, +,\; 0, 1) && \text{dual} \\
F^C &= F(\bar a, \bar b, \bar c,\; \cdot, +,\; 0, 1) && \text{complement}
\end{aligned}
$$

So the complement is the dual with every variable complemented as well.

<div class="example">

$F = a\cdot(b + c) + c \cdot 0$ has the dual $F^D = (a + b\cdot c)\cdot(c + 1)$.

</div>

## Canonical and Standard Forms

With $n$ variables there are $2^n$ rows in the truth table. Each row can be 0 or 1 independently, so

$$2^n \text{ rows} \implies 2^{2^n} \text{ Boolean functions in total.}$$

<div class="definition">

The rows with output 1 are the *minterms* of $F$; the rows with output 0 are its *maxterms*.

</div>

<div class="example">

Consider the following function of $x, y, z$.

</div>

<figure class="table split-2 split-5">
<figcaption>$F = \sum m(1, 3, 6, 7)$.</figcaption>

| Row | Term | $x$ | $y$ | $z$ | $F$ | |
|:-:|:-:|:-:|:-:|:-:|:-:|:--|
| 0 | $\bar x \bar y \bar z$ | 0 | 0 | 0 | 0 | maxterm |
| 1 | $\bar x \bar y z$ | 0 | 0 | 1 | 1 | minterm |
| 2 | $\bar x y \bar z$ | 0 | 1 | 0 | 0 | maxterm |
| 3 | $\bar x y z$ | 0 | 1 | 1 | 1 | minterm |
| 4 | $x \bar y \bar z$ | 1 | 0 | 0 | 0 | maxterm |
| 5 | $x \bar y z$ | 1 | 0 | 1 | 0 | maxterm |
| 6 | $x y \bar z$ | 1 | 1 | 0 | 1 | minterm |
| 7 | $x y z$ | 1 | 1 | 1 | 1 | minterm |

</figure>

The **sum of products (SOP)** form is the OR of the minterms:

$$F = \sum m(1,3,6,7) = \bar x \bar y z + \bar x y z + x y \bar z + x y z$$

The complement is the OR of the remaining rows:

$$\bar F = \sum m(0,2,4,5) = \bar x \bar y \bar z + \bar x y \bar z + x \bar y \bar z + x \bar y z$$

Applying De Morgan's law to $\bar F$ gives the **product of sums (POS)** form:

$$F = (x + y + z)(x + \bar y + z)(\bar x + y + z)(\bar x + y + \bar z) = \prod M(0,2,4,5)$$

### Self-Dual Functions

<div class="definition">

A function is *self-dual* if its dual is the same as the function itself: $F^D = F$.

</div>

Comparing the definitions of $F^D$ and $F^C$ under Duality, $F^D(a,b,c) = \overline{F(\bar a, \bar b, \bar c)}$. Complementing every input sends row $i$ of the truth table to row $2^n - 1 - i$ (e.g. $\overline{011} = 100$, so row 3 goes to row 4 and row 0 to row 7). Hence **the $F^D$ column is the $F^C$ column read in reverse**.

<figure class="table split-2 split-5">
<figcaption>$F = \sum m(0, 2, 3, 6)$ is self-dual: the $F^D$ column (reverse of $F^C$) equals $F$.</figcaption>

| Row | Term | $a$ | $b$ | $c$ | $F$ | $F^C$ | $F^D$ |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | $\bar a \bar b \bar c$ | 0 | 0 | 0 | 1 | 0 | 1 |
| 1 | $\bar a \bar b c$ | 0 | 0 | 1 | 0 | 1 | 0 |
| 2 | $\bar a b \bar c$ | 0 | 1 | 0 | 1 | 0 | 1 |
| 3 | $\bar a b c$ | 0 | 1 | 1 | 1 | 0 | 1 |
| 4 | $a \bar b \bar c$ | 1 | 0 | 0 | 0 | 1 | 0 |
| 5 | $a \bar b c$ | 1 | 0 | 1 | 0 | 1 | 0 |
| 6 | $a b \bar c$ | 1 | 1 | 0 | 1 | 0 | 1 |
| 7 | $a b c$ | 1 | 1 | 1 | 0 | 1 | 0 |

</figure>

**Counting self-dual functions.** For $F^D = F$, the rows in each pair $(i,\, 2^n-1-i)$, i.e. $(0,7), (1,6), (2,5), (3,4)$ for $n = 3$, must have *different* values. If both rows of a pair had the same value, complementing would flip both, and reversing would swap them, so $F^D$ would differ from $F$ there. (Notice above that no two minterms of $F$ sum to 7.)

With $n$ variables there are $2^n$ rows, i.e. $2^n / 2 = 2^{n-1}$ pairs, and each pair is either $(0,1)$ or $(1,0)$:

$$\text{Number of self-dual functions of } n \text{ variables} = 2^{2^{n-1}}$$

### Simplifying with K-Maps

The canonical forms are rarely the simplest. Two minterms that differ in exactly one variable can always be merged, and that variable disappears:

$$a \bar b + a b = a(\bar b + b) = a \cdot 1 = a$$

This uses only the distributive, complement and identity postulates. Simplifying by algebra this way works, but there is no fixed rule for which terms to pair up next. The *map method* makes the pairs visible [[1]](#ref-1), [[2]](#ref-2).

<div class="definition">

A *Karnaugh map* (K-map) is a diagram made of squares, one square per minterm of the function. Marking the squares of the minterms where $F = 1$ draws the function, so the map is a pictorial form of its truth table.

</div>

<figure class="fig">
{{< kmap rowvar="a" colvar="b" rows="0,1" cols="0,1" idx="0,1;2,3" cells="0,0;1,1" groups="1,0,1,2" >}}
<figcaption>$F = a\bar b + ab$: the two squares in row $a = 1$ are adjacent, and together they are just $a$.</figcaption>
</figure>

**Why the rows and columns are in Gray-code order.** With three or more variables the columns are labelled $00, 01, 11, 10$, not in binary order. This is *Gray code*, an ordering in which consecutive values differ in exactly one bit (see [Binary Codes](#binary-codes)). In this order only one bit changes from one column to the next, so any two adjacent squares differ in exactly one variable. That is exactly the condition for $a\bar b + ab = a$. For example $m_5$ and $m_7$ sit side by side, and

$$m_5 + m_7 = x \bar y z + x y z = x z(\bar y + y) = x z$$

In binary order, columns $01$ and $10$ would be neighbours, but they differ in two bits, so those two squares could not be merged. The first and last columns ($00$ and $10$) also differ in one bit, so they count as adjacent too: $m_0 + m_2 = \bar x \bar y \bar z + \bar x y \bar z = \bar x \bar z$. Think of the map as drawn on a surface where the left and right edges touch. In a four-variable map the rows use the same order, so the top and bottom edges touch as well.

<figure class="fig">
<div class="figrow">
{{< kmap rowvar="x" colvar="yz" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="1,0,0,1;0,1,1,0" groups="1,1,1,2;0,3,1,2" >}}
{{< kmap rowvar="x" colvar="yz" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="1,0,0,1;1,0,0,1" groups="0,3,2,2" >}}
</div>
<figcaption>Left: $m_5 + m_7 = xz$, and $m_0 + m_2 = \bar x \bar z$ across the wrap-around edge. Right: four adjacent squares $m_0 + m_2 + m_4 + m_6 = \bar z$.</figcaption>
</figure>

**Why groups have $2^k$ squares.** Merging two adjacent squares removes one variable. Two adjacent pairs that again differ in one variable merge the same way, removing a second variable:

$$
\begin{aligned}
m_0 + m_2 + m_4 + m_6 &= \bar x \bar y \bar z + \bar x y \bar z + x \bar y \bar z + x y \bar z \\
&= \bar x \bar z(\bar y + y) + x \bar z(\bar y + y) \\
&= \bar x \bar z + x \bar z = \bar z(\bar x + x) = \bar z
\end{aligned}
$$

Each merge doubles the group, so a group always has $1, 2, 4, 8, \ldots$ squares. Seen the other way, a product term that leaves out $k$ of the $n$ variables is 1 for every one of the $2^k$ combinations of those $k$ variables, so it covers exactly $2^k$ squares. A block of 3 or 6 squares is not a single product term. In an $n$-variable map:

<figure class="table split-1">
<figcaption>Group size and the term it gives, for $n = 3$ and $n = 4$.</figcaption>

| Squares in group | Literals ($n = 3$) | Literals ($n = 4$) |
|:-:|:-:|:-:|
| 1 | 3 (a minterm) | 4 (a minterm) |
| 2 | 2 | 3 |
| 4 | 1 | 2 |
| 8 | $F = 1$ | 1 |
| 16 | | $F = 1$ |

</figure>

The larger the group, the fewer literals in its term, so each group should be as large as possible, and squares may be used in more than one group. Formally:

<div class="definition">

A *prime implicant* is a product term obtained by combining the maximum possible number of adjacent squares in the map. It is *essential* if some minterm of the function is covered by that prime implicant alone.

</div>

"Maximum" is meant locally [[1]](#ref-1): a single 1 is a prime implicant if it is not adjacent to any other 1; two adjacent 1s form a prime implicant if they are not within a group of four; four adjacent 1s form one if they are not within a group of eight; and so on. So a prime implicant is a group not contained in any larger group, and a function can have prime implicants of different sizes.

A minimal SOP always contains every essential prime implicant, plus as few others as needed to cover the remaining 1s.

We can use a K-map for either canonical form. Taking $F = \sum m(1, 3, 6, 7)$ from above: group the **1s** to get a minimal SOP, or group the **0s** to get $\bar F$ in SOP and then apply De Morgan to get a minimal POS.

<figure class="fig">
<div class="figrow">
{{< kmap rowvar="x" colvar="yz" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,1,1,0;0,0,1,1" groups="0,1,1,2;1,2,1,2" >}}
{{< kmap rowvar="x" colvar="yz" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,1,1,0;0,0,1,1" groups="0,3,1,2;1,0,1,2" >}}
</div>
<figcaption>Left: grouping the 1s. Right: grouping the 0s (cells 0 and 2 are adjacent by wrap-around, so the loop is open at the edges).</figcaption>
</figure>

$$F = \bar x z + x y \qquad\equiv\qquad \bar F = \bar x \bar z + x \bar y \;\implies\; F = (x + z)(\bar x + y)$$

#### Don't-Care Conditions

<div class="definition">

A *don't-care* term (written $\times$) is an input combination that is never reached or given, or one where we simply do not care what the output is. In a K-map it may be treated as 1 or 0, whichever gives larger groups.

</div>

#### K-Map Problems

<div class="example">

A decimal digit is represented by 4 bits $abcd$ ($0000 \to 0$, $0001 \to 1$, …). The output is 1 if the digit is $\le 5$ and 0 otherwise. Inputs are only given up to 9.

</div>

Rows 0–5 give 1, rows 6–9 give 0, and rows 10–15 are never given, so they are don't-cares.

<figure class="fig">
{{< kmap rowvar="ab" colvar="cd" rows="00,01,11,10" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6;12,13,15,14;8,9,11,10" cells="1,1,1,1;1,1,0,0;x,x,x,x;0,0,x,x" groups="0,0,1,4;1,0,2,2" >}}
<figcaption>Digit $\le 5$: the top row and the 2×2 block using don't-cares 12, 13.</figcaption>
</figure>

$$F = \bar a \bar b + b \bar c$$

<div class="example">

Given $F = P' + QR$, find its canonical forms.

</div>

All rows with $P' = 1$ (i.e. $P = 0$) are 1, plus the cell where $P = 1$ and $QR = 11$.

<figure class="fig">
{{< kmap rowvar="P" colvar="QR" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="1,1,1,1;0,0,1,0" groups="0,0,1,4;0,2,2,1" >}}
<figcaption>$F = P' + QR$.</figcaption>
</figure>

$$F = \sum m(0, 1, 2, 3, 7) = \prod M(4, 5, 6)$$

### Properties of XOR

$$
\begin{aligned}
x \oplus y &\equiv \bar x \oplus \bar y \\
\bar x \oplus y &\equiv x \odot y \equiv \overline{x \oplus y} \\
x \oplus y \oplus y &= x \\
0 \oplus x &= x \\
1 \oplus x &= \bar x \\
x \oplus x &= 0
\end{aligned}
$$

Here $\odot$ is XNOR.

## NAND–NOR Implementation

<div class="definition">

A set of operations is *functionally complete* if every Boolean function can be built from it alone.

</div>

$\{\text{AND}, \text{OR}, \text{NOT}\}$ is complete, since every function has an SOP form. So are $\{\text{AND}, \text{NOT}\}$ and $\{\text{OR}, \text{NOT}\}$, because De Morgan gives the missing operation: $x + y = \overline{\bar x\, \bar y}$. NAND on its own is complete too:

$$\bar x = \overline{x \cdot x}, \qquad xy = \overline{\overline{xy}}, \qquad x + y = \overline{\bar x \cdot \bar y}$$

and likewise NOR. A single gate that is complete on its own is called *universal*.

**Test (Post's theorem, 1941).** A set is complete exactly when, for each of these five properties, at least one of its operations does **not** have it [[7]](#ref-7):

- *preserves 0*: $f(0, \ldots, 0) = 0$;
- *preserves 1*: $f(1, \ldots, 1) = 1$;
- *monotone*: changing an input from 0 to 1 never changes the output from 1 to 0;
- *self-dual*: $f^D = f$ (see [Self-Dual Functions](#self-dual-functions));
- *affine*: each input either always affects the output or never does, e.g. an XOR (parity) of some of the inputs; NOT is affine too.

For example $\{\text{AND}, \text{OR}\}$ is not complete: both are monotone, so NOT can never be built. NAND breaks all five properties at once, which is why it is universal: $\overline{0 \cdot 0} = 1$, $\overline{1 \cdot 1} = 0$ (so it is also not monotone), its dual is NOR, and $x$ affects $\overline{xy}$ only when $y = 1$.

Since NAND and NOR are universal, any SOP can be built from NAND gates alone, and any POS from NOR gates alone. The trick is to add pairs of bubbles (inversions), since $\bar{\bar x} = x$, and then use these equivalences (De Morgan's laws in gate form):

{{< figure src="/images/computer-systems/digital-electronics/nand_nor_implementation/inverted_inputs_equals_nand_inverted_inputs.svg" alt="OR with inverted inputs equals NAND; AND with inverted inputs equals NOR" width="300px" class="fig" caption="Top: OR with inverted inputs ≡ NAND ($\bar a + \bar b = \overline{ab}$). Bottom: AND with inverted inputs ≡ NOR ($\bar a \bar b = \overline{a+b}$)." >}}

<div class="example">

Implement $F(x, y, z) = \sum m(1, 2, 3, 4, 5, 7)$ using only NAND gates.

</div>

**Step 1.** Simplify and write in SOP form: $F = x\bar y + \bar x y + z$.

**Step 2.** Draw it as AND–OR, then add two bubbles on each AND→OR wire (one at the AND output, one at the OR input). Each AND with an output bubble is a NAND, and the OR with bubbled inputs is a NAND. The single literal $z$ goes straight into the OR, so its bubble has to be absorbed by feeding $\bar z$ instead.

{{< figure src="/images/computer-systems/digital-electronics/nand_nor_implementation/level_nand_nand_circuit_f.svg" alt="Two-level NAND-NAND circuit for F" width="340px" class="fig" caption="$F = \overline{\overline{x\bar y}\cdot\overline{\bar x y}\cdot \bar z} = x\bar y + \bar x y + z$, built from NAND gates." >}}

For NOR gates, follow the same steps starting from the POS form, with the roles of AND and OR swapped.

<div class="example">

Implement the function in the K-map below using NOR gates ($\bar a, \bar b, \bar c, \bar d$ are also available, so no extra inverters are needed).

</div>

<figure class="fig">
{{< kmap rowvar="dc" colvar="ba" rows="00,01,11,10" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6;12,13,15,14;8,9,11,10" cells=",x,x,;1,,,1;x,x,x,x;,,," groups="1,3,2,2" >}}
<figcaption>The group of four ($c = 1$, $a = 0$) uses the wrap-around columns and the don't-cares in row 11.</figcaption>
</figure>

$$F = c\,\bar a = \overline{\bar c + a}$$

An AND with bubbled inputs is a NOR, so $F$ is a single NOR gate fed with $\bar c$ and $a$. If the complemented inputs are **not** available, an inverter can be made from either universal gate by tying its inputs together:

$$\overline{x + x} = \bar x, \qquad \overline{x \cdot x} = \bar x$$

{{< figure src="/images/computer-systems/digital-electronics/nand_nor_implementation/nor_implementation_c_bar_nor_used.svg" alt="NOR implementation of c a-bar, and a NOR used as an inverter" width="410px" class="fig" caption="Left: $F = c\bar a$ as one NOR gate. Right: a NOR gate with tied inputs acting as an inverter." >}}

## Hazards

When a circuit may have a problem due to timing, it has a *hazard*; a temporarily incorrect output of a combinational circuit is a *glitch* [[6]](#ref-6).

### Static-1 Hazard

<div class="definition">

A *static hazard* lets the output change when moving between two input combinations that should produce the same output. With a *static-1 hazard* both combinations should give 1, but the output may drop to 0 briefly because of timing [[6]](#ref-6).

</div>

It can be seen on a K-map, where the loops are the AND gates: a move between two adjacent 1s that lie in **different loops** can glitch. To remove it, add a new loop (a new AND gate) covering that move; this gate stays at 1 during the change [[6]](#ref-6).

For instance, in $F = \bar x z + x y$ from above, cells 3 and 7 are adjacent but lie in different groups. When $y = z = 1$ and $x$ changes, one AND turns off as the other turns on, and the output can glitch to 0. Adding the group $yz$ (green, dashed) covers that pair and removes the hazard: $F = \bar x z + x y + y z$.

<figure class="fig">
{{< kmap rowvar="x" colvar="yz" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,1,1,0;0,0,1,1" groups="0,1,1,2;1,2,1,2;0,2,2,1,d" >}}
<figcaption>The extra (redundant) group $yz$ that should be there to avoid the static-1 hazard.</figcaption>
</figure>

### Static-0 Hazard

<div class="definition">

A *static-0 hazard* is when the output momentarily becomes 1 while it is supposed to stay 0.

</div>

It is the dual of the static-1 hazard and appears in POS circuits: a hazard exists if there are **adjacent 0s that are not covered by a common sum term**. The same function in POS form, $F = (x + z)(\bar x + y)$, has one: with $y = z = 0$ it is $x \bar x$, and when $x$ changes, one OR output can rise before the other falls, so $F$ can glitch to 1. Adding the redundant sum term $(y + z)$, which covers cells 0 and 4, removes it: $F = (x + z)(\bar x + y)(y + z)$.

### Dynamic Hazard

<div class="definition">

A *dynamic hazard* occurs when the input changes from a combination that should give 0 to one that should give 1 (or vice versa). The output should change exactly once, but it may bounce between 0 and 1 before settling to its final value [[6]](#ref-6).

</div>

*Essential hazards*, unlike static and dynamic ones, are related to the function the circuit implements and cannot be eliminated [[6]](#ref-6).

## Decoders

<div class="definition">

An $n$-to-$2^n$ *decoder* has $n$ inputs and $2^n$ outputs; exactly one output is 1, the one whose index equals the input. Each output is therefore one minterm of the inputs.

</div>

{{< figure src="/images/computer-systems/digital-electronics/decoders/2_4_decoder_enable.svg" alt="2 to 4 decoder with enable" width="360px" class="fig" caption="2 × 4 decoder with an enable input." >}}

<figure class="table split-2">
<figcaption>2 × 4 decoder truth table (EN = 1).</figcaption>

| $a$ | $b$ | $D_0$ | $D_1$ | $D_2$ | $D_3$ |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 1 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 | 0 |
| 1 | 1 | 0 | 0 | 0 | 1 |

</figure>

> **Note.** Decoder + enable = demultiplexer. If the data signal is fed into EN, the inputs $a, b$ choose which output it appears on.

### Larger Decoders

<div class="example">

Implement a 4 × 16 decoder using 2 × 4 decoders.

</div>

We need **five** 2 × 4 decoders. The first one decodes the two high bits $c, d$ and enables exactly one of the other four. Each of those four decodes the low bits $a, b$ into its group of four outputs.

{{< figure src="/images/computer-systems/digital-electronics/decoders/4_16_decoder_built_five_2.svg" alt="4 to 16 decoder built from five 2 to 4 decoders" width="470px" class="fig" caption="4 × 16 decoder from five 2 × 4 decoders. $c d$ selects a 2 × 4 decoder, and that decoder's $a b$ gives the output." >}}

### Implementing Functions with a Decoder

Since the outputs are the minterms, any $n$-variable function can be built from an $n$-to-$2^n$ decoder by ORing the outputs for the minterms where $f = 1$.

<div class="example">

Implement $f(x, y) = \bar x y + x \bar y$ using a decoder.

</div>

{{< figure src="/images/computer-systems/digital-electronics/decoders/implementing_function_decoder_gate.svg" alt="Implementing a function with a decoder and an OR gate" width="400px" class="fig" caption="$f = \sum m(1, 2) = D_1 + D_2$." >}}

## Encoders

An *encoder* is the reverse of a decoder: $2^n$ inputs, of which one is 1, and $n$ outputs giving its index.

<figure class="table split-4">
<figcaption>4 × 2 encoder.</figcaption>

| $D_0$ | $D_1$ | $D_2$ | $D_3$ | $x$ | $y$ |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 0 | 0 | 1 |
| 0 | 0 | 1 | 0 | 1 | 0 |
| 0 | 0 | 0 | 1 | 1 | 1 |

</figure>

$$x = D_2 + D_3, \qquad y = D_1 + D_3$$

{{< figure src="/images/computer-systems/digital-electronics/encoders/4_2_encoder_gates.svg" alt="4 by 2 encoder from two OR gates" width="330px" class="fig" caption="4 × 2 encoder: $x = D_2 + D_3$, $y = D_1 + D_3$. $D_0$ is not connected, since its code is $00$." >}}

But the output is undefined for all other inputs, e.g. when two inputs are 1 at once. A *priority encoder* fixes this: if several inputs are 1, the one with the highest index wins ($D_i$ has priority over $D_j$ if $i > j$).

<figure class="table split-4">
<figcaption>4 × 2 priority encoder ($\times$ = don't care).</figcaption>

| $D_0$ | $D_1$ | $D_2$ | $D_3$ | $x$ | $y$ |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | 0 | 0 | 0 | 0 | 0 |
| × | 1 | 0 | 0 | 0 | 1 |
| × | × | 1 | 0 | 1 | 0 |
| × | × | × | 1 | 1 | 1 |

</figure>

This gives $x = D_2 + D_3$ and $y = D_3 + D_1 \bar D_2$. Only $y$ needs extra logic for priority: $D_1$ may set $y = 1$ only while $D_2$, the one higher input that would make $y = 0$, is inactive ($D_3$ sets $y = 1$ anyway). For example, $D_0 D_1 D_2 D_3 = 1110$ gives $xy = 10$: $D_2$ wins over $D_1$ and $D_0$.

{{< figure src="/images/computer-systems/digital-electronics/encoders/4_2_priority_encoder.svg" alt="4 by 2 priority encoder" width="380px" class="fig" caption="4 × 2 priority encoder: $x = D_2 + D_3$, $y = D_3 + D_1 \bar D_2$. The bubble on the AND gate blocks $D_1$ whenever $D_2$ is 1." >}}

## Multiplexers

<div class="definition">

A $2^n$-to-1 *multiplexer* (mux) has $2^n$ data inputs, $n$ select lines and one output; the select lines choose which input is passed to the output.

</div>

<div class="figrow">

{{< figure src="/images/computer-systems/digital-electronics/multiplexers/4_1_multiplexer.svg" alt="4 to 1 multiplexer" width="330px" class="fig" caption="4 : 1 multiplexer." >}}

<figure class="table split-2">
<figcaption>4 : 1 mux.</figcaption>

| $s_1$ | $s_0$ | $y$ |
|:-:|:-:|:-:|
| 0 | 0 | $I_0$ |
| 0 | 1 | $I_1$ |
| 1 | 0 | $I_2$ |
| 1 | 1 | $I_3$ |

</figure>

</div>

$$y = \bar s_1 \bar s_0 I_0 + \bar s_1 s_0 I_1 + s_1 \bar s_0 I_2 + s_1 s_0 I_3$$

**Larger muxes from smaller ones.** A $2^n$ : 1 mux can be built as a tree of 2 : 1 muxes: $2^{n-1}$ in the first level, $2^{n-2}$ in the next, and so on, i.e. $2^n - 1$ in all ($s_0$ drives the first level, $s_{n-1}$ the last). In general each $k$ : 1 mux reduces the number of signals by $k - 1$, so an $N$ : 1 mux built from $k$ : 1 muxes needs $\lceil (N-1)/(k-1) \rceil$ of them, exactly $(N-1)/(k-1)$ when $N$ is a power of $k$. For example a 16 : 1 mux needs $15/3 = 5$ 4 : 1 muxes, and an 8 : 1 mux needs $\lceil 7/3 \rceil = 3$ (two 4 : 1 muxes take the 8 inputs, a third selects between their 2 outputs).

**Try it.** Click the data inputs and the select lines; the dashed line shows which input is routed through.

{{< fullscreen-iframe id="mux-demux" src="/interactive/mux_demux.html" height="360" title="Multiplexer and demultiplexer" >}}

### Implementing Functions with a Multiplexer

Any function can also be implemented with a multiplexer, in two ways. Take $f(a, b, c) = \sum m(0, 2, 3, 5, 6)$:

<figure class="table split-3 split-4 pairs">
<figcaption>Truth table of $f$, grouped in pairs of rows for Method 2.</figcaption>

| $a$ | $b$ | $c$ | $f$ | $f$ in terms of $c$ |
|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 1 | $\bar c$ |
| 0 | 0 | 1 | 0 | |
| 0 | 1 | 0 | 1 | $1$ |
| 0 | 1 | 1 | 1 | |
| 1 | 0 | 0 | 0 | $c$ |
| 1 | 0 | 1 | 1 | |
| 1 | 1 | 0 | 1 | $\bar c$ |
| 1 | 1 | 1 | 0 | |

</figure>

- **Method 1** ($2^n$-to-1 mux, $n$ select lines): connect all $n$ variables to the select lines and wire each data input to the constant $f$ value of its row.
- **Method 2** ($2^{n-1}$-to-1 mux): connect $n - 1$ variables ($a, b$) to the select lines. Within each pair of rows $f$ is one of $0$, $1$, $c$ or $\bar c$, and that becomes the data input.

{{< figure src="/images/computer-systems/digital-electronics/multiplexers/implementing_f_8_1_mux_4.svg" alt="Implementing f with an 8 to 1 mux and with a 4 to 1 mux" width="600px" class="fig" caption="Left: Method 1 with an 8 : 1 mux (inputs are the $f$ column). Right: Method 2 with a 4 : 1 mux (inputs $\bar c, 1, c, \bar c$)." >}}

## Number Systems and Codes

### Number Systems

<div class="definition">

A number in *base* (or *radix*) $r$ has digits $0, 1, \ldots, r - 1$, each weighted by a power of $r$:

$$(a_{n-1} \ldots a_1 a_0 . a_{-1} \ldots a_{-m})_r = \sum_{i=-m}^{n-1} a_i\, r^i$$

</div>

For example $(4021.2)_5 = 4 \cdot 5^3 + 0 \cdot 5^2 + 2 \cdot 5 + 1 + 2 \cdot 5^{-1} = (511.4)_{10}$. Bases above 10 borrow letters for the extra digits: in hexadecimal (base 16), A–F stand for 10–15, so $(\text{B65F})_{16} = 11 \cdot 16^3 + 6 \cdot 16^2 + 5 \cdot 16 + 15 = (46687)_{10}$ [[1]](#ref-1).

**Decimal to base $r$.** Convert the integer and fraction parts separately:

- Integer part: divide by $r$ repeatedly. The remainders, read from last to first, are the digits.
- Fraction part: multiply by $r$ repeatedly. The integer parts, read from first to last, are the digits.

<div class="example">

Convert $41.6875$ to binary.

</div>

$$
\begin{array}{r|l}
41 & \\ 20 & 1 \\ 10 & 0 \\ 5 & 0 \\ 2 & 1 \\ 1 & 0 \\ 0 & 1
\end{array}
\qquad\qquad
\begin{aligned}
0.6875 \times 2 &= \mathbf{1}.375 \\ 0.375 \times 2 &= \mathbf{0}.75 \\ 0.75 \times 2 &= \mathbf{1}.5 \\ 0.5 \times 2 &= \mathbf{1}.0
\end{aligned}
$$

The remainders read upwards give $41 = 101001_2$, and the integer parts read downwards give $0.6875 = 0.1011_2$, so $41.6875 = 101001.1011_2$. A fraction may never reach 0 (e.g. $0.1_{10}$); then stop after enough digits.

**Binary to octal and hexadecimal.** Since $8 = 2^3$ and $16 = 2^4$, group the bits in threes or fours *starting from the binary point*, padding the ends with 0s:

$$
\begin{aligned}
(10\;110\;001\;101\;011\,.\,111\;100\;000\;110)_2 &= (26153.7406)_8 \\
(10\;1100\;0110\;1011\,.\,1111\;0000\;0110)_2 &= (\text{2C6B.F06})_{16}
\end{aligned}
$$

Going back, each octal digit becomes 3 bits and each hex digit 4 bits. Octal to hex goes through binary.

<div class="example">

Find the base $r$ for which $(121)_r = (144)_8$.

</div>

$(144)_8 = 64 + 32 + 4 = 100$ and $(121)_r = r^2 + 2r + 1 = (r + 1)^2$, so $(r + 1)^2 = 100$ and $r = 9$. (Every digit must be less than $r$, which holds.)

### Binary Codes

A *code* assigns a bit pattern to each element of a set. The ten decimal digits need at least 4 bits, which leaves 6 of the 16 patterns unused [[1]](#ref-1).

<figure class="table split-1">
<figcaption>Three codes for the decimal digits (BCD: binary-coded decimal).</figcaption>

| Decimal | BCD (8421) | Excess-3 | Gray |
|:-:|:-:|:-:|:-:|
| 0 | 0000 | 0011 | 0000 |
| 1 | 0001 | 0100 | 0001 |
| 2 | 0010 | 0101 | 0011 |
| 3 | 0011 | 0110 | 0010 |
| 4 | 0100 | 0111 | 0110 |
| 5 | 0101 | 1000 | 0111 |
| 6 | 0110 | 1001 | 0101 |
| 7 | 0111 | 1010 | 0100 |
| 8 | 1000 | 1011 | 1100 |
| 9 | 1001 | 1100 | 1101 |

</figure>

- **BCD** (*binary-coded decimal*) codes each decimal digit separately in 4 bits: $185 = 0001\,1000\,0101_{\text{BCD}}$, while in binary $185 = 10111001_2$. The patterns 1010–1111 are not used.
- **Excess-3** is BCD plus 3. It is *self-complementing*: complementing every bit gives the 9's complement of the digit, e.g. $2 = 0101 \to 1010 = 7$.
- **Gray code** changes only one bit between consecutive values, so a changing value never passes through a wrong intermediate reading ($7 \to 8$ is $0100 \to 1100$, against $0111 \to 1000$ in binary). It is the order used for the K-map rows and columns. Gray to binary: $b_{n-1} = g_{n-1}$ and $b_i = b_{i+1} \oplus g_i$ [[5]](#ref-5) (Problem A.14); XORing both sides with $b_{i+1}$ gives binary to Gray, $g_i = b_{i+1} \oplus b_i$.

**BCD addition.** Add two BCD digits as binary numbers. If the sum is more than 9, add 6 ($0110$) to skip the six unused patterns; this gives the correct digit and a decimal carry:

$$8 + 9:\quad 1000 + 1001 = 1\,0001 \;\xrightarrow{+\,0110}\; 1\,0111 = 17$$

## Number Representation

For an $n$-bit representation:

**Unsigned integers** range over $000\ldots0$ to $111\ldots1$, i.e. $0$ to $2^n - 1$.

**Complements in base $r$.** For an $n$-digit number $N$ in base $r$ [[1]](#ref-1):

- the *diminished radix* or $(r-1)$'s complement is $(r^n - 1) - N$: subtract each digit from $r - 1$;
- the *radix* or $r$'s complement is $r^n - N$ (and $0$ for $N = 0$): the $(r-1)$'s complement plus 1.

For example, the 9's complement of $546700$ is $453299$ and the 10's complement of $012398$ is $987602$. In binary these are the 1's and 2's complements below.

### Signed Magnitude

<div class="definition">

In *signed magnitude*, the most significant bit $x_{n-1}$ is the sign and the remaining bits $x_{n-2} \ldots x_0$ are the magnitude:

$$\text{value} = (-1)^{x_{n-1}} \times \sum_{i=0}^{n-2} 2^i x_i$$

</div>

- There are **two representations of zero**: $1\,00\ldots0 = -0$ and $0\,00\ldots0 = +0$.
- Range: $-(2^{n-1} - 1)$ to $+(2^{n-1} - 1)$, i.e. only $2^n - 1$ distinct numbers.

### One's Complement

<div class="definition">

The *1's complement* of an $n$-bit number $N$ is $(2^n - 1) - N$. Since $2^n - 1 = 11\ldots1$, it is obtained by **complementing every bit**. In the *signed-1's-complement* representation, a negative number is the 1's complement of its positive value, sign bit included [[1]](#ref-1).

</div>

Equivalently, the most significant bit has weight $-(2^{n-1} - 1)$:

$$\text{value} = -(2^{n-1} - 1)\,x_{n-1} + \sum_{i=0}^{n-2} 2^i x_i$$

For example, $+9 = 00001001$ in 8 bits, and $-9$ is written in the three signed systems as [[1]](#ref-1)

$$\underbrace{10001001}_{\text{signed magnitude}} \qquad \underbrace{11110110}_{\text{1's complement}} \qquad \underbrace{11110111}_{\text{2's complement}}$$

- Like signed magnitude, there are **two representations of zero**: $00\ldots0 = +0$ and $11\ldots1 = -0$.
- Range: $-(2^{n-1} - 1)$ to $+(2^{n-1} - 1)$.
- The 2's complement is the 1's complement plus 1.

**Subtraction with end-around carry.** To compute $A - B$, add $A$ and the 1's complement of $B$. Because the 1's complement is one less than the 2's complement, the sum is one less than the correct difference when an end carry occurs, so the carry is removed and added back to the sum (the *end-around carry*). If there is no end carry, the result is negative and equals the 1's complement of the sum [[1]](#ref-1).

<div class="example">

In 4 bits, $0111 - 0010$ $(7 - 2)$: $0111 + 1101 = 1\,0100$. There is an end carry, so $0100 + 1 = 0101 = 5$.

$0010 - 0111$ $(2 - 7)$: $0010 + 1000 = 1010$. There is no end carry, so the result is $-(\text{1's complement of } 1010) = -0101 = -5$.

</div>

### Two's Complement

<div class="definition">

In *two's complement*, the most significant bit has weight $-2^{n-1}$ instead of $+2^{n-1}$:

$$\text{value} = -2^{n-1} x_{n-1} + \sum_{i=0}^{n-2} 2^i x_i, \qquad \text{e.g. } n = 4: \; -8\,b_3 + 4\,b_2 + 2\,b_1 + b_0$$

</div>

If $b_3 = 1$, the other bits add up to at most $7$, so the value is at most $-1$. Hence only $0000$ is zero.

To negate a number, complement every bit and add 1:

$$\underset{(3)}{0011} \xrightarrow{\text{complement}} 1100 + 1 \longrightarrow \underset{(-3)}{1101}$$

{{< figure src="/images/computer-systems/digital-electronics/number_representation/4_bit_s_complement_number_wheel.svg" alt="4-bit two's complement number wheel" width="400px" class="fig" caption="The 4-bit two's complement wheel. Adding 1 moves one step clockwise; the jump from $0111\,(+7)$ to $1000\,(-8)$ is where overflow happens." >}}

- Range: $-8$ to $7$ for 4 bits, and in general $-2^{n-1}$ to $2^{n-1} - 1$.
- No repeated representations $\implies$ $2^n$ distinct numbers.
- Signed numbers are added and subtracted by the same rules as unsigned ones, so one hardware circuit handles both [[1]](#ref-1) (§1.6).

**Sign extension.** To widen a two's complement number, copy the sign bit into the new positions [[5]](#ref-5): $1101$ and $11111101$ are both $-3$. (Unsigned numbers are widened with 0s.)

**Arithmetic shifts.** An arithmetic shift-left multiplies a signed number by 2 and an arithmetic shift-right divides it by 2, leaving the sign unchanged [[2]](#ref-2). For 2's complement the right shift copies the sign bit into the vacated position, e.g. $0110\,(6) \to 0011\,(3)$ and $1100\,(-4) \to 1110\,(-2)$. A shift-left overflows if the sign bit after the shift is not the same as before, e.g. $0\,1001\,(9) \to 1\,0010$ gives a negative result instead of 18.

### Fixed-Point Representation

A register has no place to store the binary point; its position is only **assumed**. In the *fixed-point* method the binary point is always in the same position. The two positions most used are [[2]](#ref-2):

1. at the extreme **right** of the register, so the stored number is an **integer**;
2. at the extreme **left** (just after the sign bit), so the stored number is a **fraction**.

A positive fixed-point number has sign bit 0 followed by its magnitude. A negative one has sign bit 1, and the rest is in sign-magnitude, sign-1's-complement or sign-2's-complement form, exactly as for integers [[2]](#ref-2).

In general, if $f$ bits lie to the right of the assumed binary point, the stored bit pattern is read as an integer $I$ and

$$\text{value} = I \times 2^{-f}$$

<div class="example">

An 8-bit register holding a signed 2's-complement fraction ($f = 7$):

$$0.1010000 = 2^{-1} + 2^{-3} = +0.625, \qquad 1.0110000 = -1 + 2^{-2} + 2^{-3} = -0.625$$

The range is $-1$ to $1 - 2^{-7}$, in steps of $2^{-7}$.

</div>

The step between neighbouring values is fixed at $2^{-f}$, so fixed point cannot represent very large and very small numbers in the same format. That is the motivation for floating point, below.

## Addition and Overflow

$$
\begin{array}{r@{\;}c@{\;}c@{\;}c@{\;}c@{\;}c}
c_n & c_{n-1} & c_{n-2} & \cdots & c_1 & \\
    & a_{n-1} & a_{n-2} & \cdots & a_1 & a_0 \\
{+} & b_{n-1} & b_{n-2} & \cdots & b_1 & b_0 \\ \hline
s_n & s_{n-1} & s_{n-2} & \cdots & s_1 & s_0
\end{array}
$$

### Unsigned Overflow

$$
\begin{array}{r@{\qquad}l}
1011 & (11) \\
+\;0101 & (5) \\ \hline
1\,0000 & (16)
\end{array}
$$

4 bits can only represent values up to 15, so a **carry out of the MSB (most significant bit) means overflow** for unsigned numbers.

### Two's Complement Overflow

Adding a positive and a negative number can **never** overflow, since the result's magnitude is smaller than the larger of the two operands [[1]](#ref-1). Overflow happens only when both operands have the same sign but the result has the opposite sign:

$$
\begin{array}{r@{\qquad}l}
1011 & (-5) \\
+\;1100 & (-4) \\ \hline
1\,0111 & (+7)\ \text{overflow: } (-) + (-) = (+)
\end{array}
\qquad\qquad
\begin{array}{r@{\qquad}l}
0100 & (+4) \\
+\;0101 & (+5) \\ \hline
0\,1001 & (-7)\ \text{overflow: } (+) + (+) = (-)
\end{array}
$$

**Logic.** Overflow occurs if $a_{n-1}$ and $b_{n-1}$ are the same but $s_{n-1}$ is different:

<figure class="table split-3">
<figcaption>Sign-bit cases that overflow.</figcaption>

| $a_{n-1}$ | $b_{n-1}$ | $s_{n-1}$ | term |
|:-:|:-:|:-:|:-:|
| 1 | 1 | 0 | $a_{n-1}\, b_{n-1}\, \bar s_{n-1}$ |
| 0 | 0 | 1 | $\bar a_{n-1}\, \bar b_{n-1}\, s_{n-1}$ |

</figure>

$$\boxed{\text{Overflow} = a_{n-1}\, b_{n-1}\, \bar s_{n-1} + \bar a_{n-1}\, \bar b_{n-1}\, s_{n-1}}$$

Equivalently, overflow occurs when the carry **into** the sign bit and the carry **out of** it differ:

$$\boxed{\text{Overflow} = c_{n-1} \oplus c_n}$$

> **Note.** A carry out of the MSB does **not** by itself mean overflow in two's complement. For example, $1101\,(-3) + 1100\,(-4) = 1\,1001\,(-7)$ has $c_n = c_{n-1} = 1$, so $1 \oplus 1 = 0$: no overflow.

## Adders

### Half Adder

A *half adder* adds two bits $a$ and $b$, giving a sum $S$ and a carry $C$. It is only "half" because it has no input for the carry from the previous position. A *full adder* adds three bits (the two bits and that carry), and two half adders together make one full adder, hence the names [[1]](#ref-1).

<figure class="table split-2">
<figcaption>Half adder truth table.</figcaption>

| $a$ | $b$ | $S$ | $C$ |
|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |

</figure>

<figure class="fig">
<div class="figrow">
{{< kmap rowvar="a" colvar="b" rows="0,1" cols="0,1" idx="0,1;2,3" cells="0,1;1,0" groups="0,1,1,1;1,0,1,1" >}}
{{< kmap rowvar="a" colvar="b" rows="0,1" cols="0,1" idx="0,1;2,3" cells="0,0;0,1" groups="1,1,1,1" >}}
</div>
<figcaption>K-maps for $S$ (left, no two 1s are adjacent) and $C$ (right).</figcaption>
</figure>

$$S = a \oplus b = \bar a b + a \bar b, \qquad C = ab$$

{{< figure src="/images/computer-systems/digital-electronics/adders/half_adder_circuit.svg" alt="Half adder circuit" width="360px" class="fig" caption="Half adder: one XOR and one AND gate. Equivalently, $S$ can be built two-level as $\bar a b + a \bar b$ (two ANDs and an OR)." >}}

### Full Adder

A half adder has no carry input, so it can only add the lowest bit. A *full adder* also takes the carry $c$ from the previous position.

**Using half adders.** First add $x = a + b$ with one half adder, then add $x + c$ with a second; a carry can come out of either, so the two carries are ORed:

{{< figure src="/images/computer-systems/digital-electronics/adders/full_adder_built_half_adders_gate.svg" alt="Full adder built from two half adders and an OR gate" width="640px" class="fig" caption="Full adder from two half adders and an OR gate: 2 XOR, 2 AND and 1 OR gate in total." >}}

$$S = a \oplus b \oplus c, \qquad C_{\text{out}} = (a \oplus b)\,c + ab$$

**Using a truth table.**

<figure class="table split-3">
<figcaption>Full adder truth table ($c_n$ is the carry in, $c_{n+1}$ the carry out).</figcaption>

| $a$ | $b$ | $c_n$ | $S$ | $c_{n+1}$ |
|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 1 | 0 |
| 0 | 1 | 0 | 1 | 0 |
| 0 | 1 | 1 | 0 | 1 |
| 1 | 0 | 0 | 1 | 0 |
| 1 | 0 | 1 | 0 | 1 |
| 1 | 1 | 0 | 0 | 1 |
| 1 | 1 | 1 | 1 | 1 |

</figure>

<figure class="fig">
<div class="figrow">
{{< kmap rowvar="a" colvar="bcₙ" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,1,0,1;1,0,1,0" groups="0,1,1,1;0,3,1,1;1,0,1,1;1,2,1,1" >}}
{{< kmap rowvar="a" colvar="bcₙ" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,0,1,0;0,1,1,1" groups="0,2,2,1;1,1,1,2;1,2,1,2" >}}
</div>
<figcaption>K-maps for $S$ (left: a checkerboard, nothing groups) and $c_{n+1}$ (right: three pairs, all sharing cell 7).</figcaption>
</figure>

$$
\begin{aligned}
S &= \bar a \bar b c_n + \bar a b \bar c_n + a \bar b \bar c_n + a b c_n \\
c_{n+1} &= ab + b c_n + a c_n
\end{aligned}
$$

If XOR is not a basic gate but is itself made from AND, OR and NOT, the full adder is best built directly from the equations above:

{{< figure src="/images/computer-systems/digital-electronics/adders/full_adder_sum_products_form_not.svg" alt="Full adder in sum-of-products form, with NOT gates on the complemented inputs" width="680px" class="fig" caption="Full adder in sum-of-products form (after Mano, Fig. 4.7 [[1]](#ref-1)), with NOT gates for the complemented inputs. $S$ passes through NOT → AND → OR (3 gate delays); $c_{n+1}$ uses no complements, so AND → OR (2 gate delays). The ripple-carry example below uses this circuit." >}}

**Try it.** Change an input and watch the change move through the circuit above one gate delay at a time. The NOT gates and the carry ANDs update at step 1, the sum ANDs and $c_{n+1}$ at step 2, and $S$ at step 3.

{{< fullscreen-iframe id="full-adder-steps" src="/interactive/full_adder_steps.html" height="440" title="Full adder step by step" >}}

### Ripple-Carry Adder

Chaining $n$ full adders, each passing its carry out to the next, gives an $n$-bit *ripple-carry adder*.

<div class="example">

A 16-bit ripple-carry adder is built from full adders using AND, OR and NOT gates, each with a delay of 1 ns. How long does an addition take?

</div>

{{< figure src="/images/computer-systems/digital-electronics/adders/16_bit_ripple_carry_adder.svg" alt="16-bit ripple carry adder" width="650px" class="fig" caption="16-bit ripple-carry adder. Each carry is ready 2 ns after the previous one; the times shown are when each carry is ready." >}}

With only AND, OR and NOT, each full adder is the two-level (AND–OR) build, so each $C_i$ takes 2 ns and each $S_i$ takes 3 ns once its carry in is ready. The carry ripples through the chain, so $C_{15}$ reaches FA15 at the **30th ns**. $S_{15}$ then needs 3 more ns. The other sums $S_i$ ($0 \le i \le 14$) are computed while the carry is still propagating, so they finish earlier.

$$\text{Time to add} = 30 + 3 = 33 \text{ ns}$$

### Carry-Lookahead Adder

The problem with the ripple-carry adder is that every stage must **wait for $C_i$ to propagate** from all the stages below it. Instead, we can compute every carry beforehand, directly from the inputs.

From the full adder, $C_{i+1} = (a_i \oplus b_i)\,C_i + a_i b_i$. Name the two parts:

<div class="definition">

$P_i = a_i \oplus b_i$ is the *propagate* term: it decides whether the previous carry passes through stage $i$. $G_i = a_i b_i$ is the *generate* term: stage $i$ produces a carry regardless of $C_i$.

</div>

$$C_{i+1} = G_i + P_i C_i$$

Substituting $C_i = G_{i-1} + P_{i-1} C_{i-1}$ again and again:

$$
\begin{aligned}
C_{i+1} &= G_i + P_i\,(G_{i-1} + P_{i-1} C_{i-1}) \\
&= G_i + P_i G_{i-1} + P_i P_{i-1}\,(G_{i-2} + P_{i-2} C_{i-2}) \\
&= G_i + P_i G_{i-1} + P_i P_{i-1} G_{i-2} + \cdots + P_i P_{i-1} \cdots P_0\, C_0
\end{aligned}
$$

**Intuition.** There is a carry out of stage $i$ if it was *generated* at stage $i$ ($G_i$), or generated at stage $i-1$ and *propagated* through stage $i$ ($G_{i-1} P_i$), and so on down to the input carry $C_0$.

For 4 bits, with input carry $C_0$:

$$
\begin{aligned}
C_1 &= G_0 + P_0 C_0 \\
C_2 &= G_1 + P_1 G_0 + P_1 P_0 C_0 \\
C_3 &= G_2 + P_2 G_1 + P_2 P_1 G_0 + P_2 P_1 P_0 C_0 \\
C_4 &= G_3 + P_3 G_2 + P_3 P_2 G_1 + P_3 P_2 P_1 G_0 + P_3 P_2 P_1 P_0 C_0
\end{aligned}
$$

Every carry is a two-level AND–OR expression of $P$, $G$ and $C_0$, so no carry has to ripple.

{{< figure src="/images/computer-systems/digital-electronics/adders/gate_level_4_bit_carry_lookahead.svg" alt="Gate-level 4-bit carry lookahead logic" width="640px" class="fig" caption="The 4-bit carry lookahead unit: one AND gate per product term and one OR gate per carry. Every carry is ready after the same two gate levels, but the gates get wider for higher bits ($C_4$ needs a 5-input OR and a 5-input AND), which is why lookahead is usually built in blocks of 4 bits." >}}

<div class="example">

A 4-bit carry-lookahead adder is built from AND, OR, NOT, NAND and NOR gates, implemented as two-level AND–OR logic. All inputs are also available in complemented form, and each gate has unit delay. What is the overall propagation delay?

</div>

{{< figure src="/images/computer-systems/digital-electronics/adders/carry_lookahead_adder_stages_gate_levels.svg" alt="Carry lookahead adder stages and gate levels" width="640px" class="fig" caption="Carry-lookahead adder: three stages, each two gate levels deep." >}}

- $G_i = a_i b_i$ takes 1 level, and $P_i = a_i \oplus b_i = a_i \bar b_i + \bar a_i b_i$ takes 2 levels (complemented inputs are available).
- The carries $C_i$ are two-level AND–OR of $P$, $G$, $C_0$: 2 more levels.
- $S_i = P_i \oplus C_i$ is another two-level XOR: 2 more levels.

$$\text{Delay} = 2 + 2 + 2 = 6 \text{ unit delays}$$

**Try it.** Compare the two adders on the same inputs. With the worst-case preset, the ripple-carry adder shows wrong sums until the carry has rippled through every stage (dashed means not settled yet). The lookahead adder settles at $t = 6$ for any $n$, assuming gates with unlimited fan-in. Its view shows the three stages: $P_i, G_i$ are ready at $t = 2$, all carries at $t = 4$ and all sums at $t = 6$.

{{< fullscreen-iframe id="adder-timing" src="/interactive/adder_timing.html" height="700" title="Ripple-carry vs carry-lookahead timing" >}}

### Adder/Subtractor

For $A - B$ we can add $A$ and $-B$, and in two's complement $-B = \bar B + 1$. Each $B_i$ goes through an XOR with a control bit $K$: $B_i \oplus 0 = B_i$ and $B_i \oplus 1 = \bar B_i$. Feeding $K$ in as $C_0$ supplies the $+1$.

{{< figure src="/images/computer-systems/digital-electronics/adders/4_bit_adder_subtractor_overflow_detection.svg" alt="4-bit adder/subtractor with overflow detection" width="660px" class="fig" caption="4-bit adder/subtractor. $K = 0$ computes $A + B$, $K = 1$ computes $A - B$; overflow is $C_3 \oplus C_4$." >}}

## Integer Multiplication

The basic approach is $O(n^2)$: an $n$-bit $\times$ $n$-bit product has $2n$ bits. For every 1 in the multiplier we add a shifted copy of the multiplicand, and for every 0 we only shift.

$$
\begin{array}{r@{\qquad}l}
1101 & (13) \\
\times\;1010 & (10) \\ \hline
0000 & \text{shift} \\
1101\phantom{0} & \text{add} \\
0000\phantom{00} & \text{shift} \\
1101\phantom{000} & \text{add} \\ \hline
10000010 & (130)
\end{array}
$$

### Array Multiplier

The basic method maps directly onto hardware. Each partial-product bit is $b_j a_i$, i.e. an AND gate:

$$
\begin{array}{cccccccc}
 & & & & a_3 & a_2 & a_1 & a_0 \\
 & & & \times & b_3 & b_2 & b_1 & b_0 \\ \hline
 & & & & b_0 a_3 & b_0 a_2 & b_0 a_1 & b_0 a_0 \\
 & & & b_1 a_3 & b_1 a_2 & b_1 a_1 & b_1 a_0 & \\
 & & b_2 a_3 & b_2 a_2 & b_2 a_1 & b_2 a_0 & & \\
 & b_3 a_3 & b_3 a_2 & b_3 a_1 & b_3 a_0 & & & \\ \hline
m_7 & m_6 & m_5 & m_4 & m_3 & m_2 & m_1 & m_0
\end{array}
$$

The hardware mirrors this array: a row of AND gates per bit $b_j$, and a 4-bit adder per row that adds it to the upper bits of the running sum. The lowest bit of each step drops straight out as a product bit.

{{< figure src="/images/computer-systems/digital-electronics/integer_multiplication/4_4_array_multiplier.svg" alt="4 by 4 array multiplier" width="560px" class="fig" caption="4 × 4 array multiplier: 16 AND gates and three 4-bit adders, i.e. $O(n^2)$ gates." >}}

Gate by gate, the same circuit looks like this. Mano's Fig. 4.16 shows the 4 × 3 case; in general $J$ multiplier bits and $K$ multiplicand bits need $J \times K$ AND gates and $J - 1$ $K$-bit adders [[1]](#ref-1), so 4 × 4 needs 16 AND gates and three 4-bit adders:

{{< figure src="/images/computer-systems/digital-electronics/integer_multiplication/gate_level_4_4_array_multiplier.svg" alt="Gate-level 4 by 4 array multiplier: four rows of AND gates and three 4-bit adders" width="654px" class="fig" caption="The 4 × 4 array multiplier in full. Row $j$ ANDs $b_j$ with every bit of $a$. Each adder adds that row to the upper three bits and the carry of the sum above it, and its lowest sum bit drops out as a product bit. The top augend bit of the first adder is 0." >}}

### Booth's Algorithm

With the basic method, $01011101 \times 00111110$ needs one addition for each of the five 1s in the multiplier. If shifts are faster than additions, this is slow. Booth's idea is to rewrite a run of 1s as a difference [[5]](#ref-5) (§9.4.1):

$$00111110 = 01000000 - 00000010$$

so $01011101 \times 00111110 = 01011101 \times (01000000 - 00000010)$ needs only **one addition and one subtraction** (adding the two's complement), plus shifts.

<div class="definition">

*Booth encoding.* Scan the multiplier from right to left with an extra 0 appended to the right of the LSB (least significant bit). Each digit is (bit on the right) $-$ (current bit):

$$1 \leftarrow 0 \;\Rightarrow\; -1, \qquad 0 \leftarrow 1 \;\Rightarrow\; +1, \qquad 0 \leftarrow 0 \text{ or } 1 \leftarrow 1 \;\Rightarrow\; 0$$

</div>

<figure class="fig">
{{< booth q="00111110" m="01011101" >}}
<figcaption>Booth encoding of the multiplier $Q = 00111110$ (top). Each bracket marks the pair (bit, bit on its right) that produced a non-zero digit. Below, the partial products for $M = 01011101$ as 16-bit two's complement rows: the basic method adds $M$ once per 1 bit, Booth adds $-M \cdot 2^1$ (two's complement, red) and $+M \cdot 2^6$ (green). Both sum to $93 \times 62 = 5766$.</figcaption>
</figure>

A run of 1s costs only two non-zero digits however long it is: $+1$ just above its top bit and $-1$ at its bottom bit.

- **Worst case**: alternating bits encode as $+1\,-1\,+1\,-1\ldots$, i.e. $n$ additions (worse than the basic method):

<figure class="fig">
{{< booth q="01010101" >}}
<figcaption>Worst case for Booth: every digit is non-zero.</figcaption>
</figure>

- **Best case**: $00\ldots0$ (or a single long run of 1s) needs almost no additions.

<div class="example">

Find the 8-bit Booth coding of $-57$.

</div>

$57 = 32 + 16 + 8 + 1 = 00111001$, so $-57 = 11000110 + 1 = 11000111$.

<figure class="fig">
{{< booth q="11000111" >}}
<figcaption>Booth encoding of $-57 = 11000111$.</figcaption>
</figure>

Encoding: $0\;{-1}\;0\;0\;{+1}\;0\;0\;{-1}$. Check: $-2^6 + 2^3 - 2^0 = -64 + 8 - 1 = -57$.

## Integer Division

Division of unsigned integers follows the longhand method [[5]](#ref-5): position the divisor against the dividend and subtract; if the remainder is zero or positive the quotient bit is 1, otherwise it is 0 and the dividend is *restored* by adding the divisor back.

For an $n$-bit division the $n$-bit divisor is in register $M$, the $n$-bit dividend in $Q$, and $A$ starts at 0. $A$ and $M$ have an extra bit on the left for the sign during subtraction. At the end the quotient is in $Q$ and the remainder in $A$.

### Restoring Division

Do the following $n$ times:

1. Shift $A$ and $Q$ left one bit.
2. Subtract $M$ from $A$, and put the result back in $A$.
3. If the sign of $A$ is 1, set $q_0 = 0$ and add $M$ back to $A$ (restore $A$); otherwise set $q_0 = 1$.

<div class="example">

Divide $8$ by $3$: $Q = 1000$, $M = 00011$ [[5]](#ref-5).

</div>

<figure class="table">
<figcaption>Restoring division of $1000$ by $11$ (after Hamacher, Fig. 9.24); □ marks the bit $q_0$ still to be set.</figcaption>

| Cycle | Step | $A$ | $Q$ |
|:-:|:--|:-:|:-:|
| | initially | 00000 | 1000 |
| 1 | shift | 00001 | 000□ |
| | subtract $M$ | 11110 | |
| | negative: $q_0 = 0$, restore | 00001 | 0000 |
| 2 | shift | 00010 | 000□ |
| | subtract $M$ | 11111 | |
| | negative: $q_0 = 0$, restore | 00010 | 0000 |
| 3 | shift | 00100 | 000□ |
| | subtract $M$ | 00001 | |
| | positive: $q_0 = 1$ | 00001 | 0001 |
| 4 | shift | 00010 | 001□ |
| | subtract $M$ | 11111 | |
| | negative: $q_0 = 0$, restore | 00010 | 0010 |

</figure>

The quotient is $Q = 0010 = 2$ and the remainder $A = 00010 = 2$.

### Non-Restoring Division

The restore can be avoided. If $A$ is positive after a subtraction, the next cycle shifts and subtracts, i.e. computes $2A - M$. If $A$ is negative, restoring and then shifting and subtracting gives $2(A + M) - M = 2A + M$, so the next cycle can simply shift and *add* [[5]](#ref-5):

- **Stage 1.** Do the following $n$ times:
  1. If the sign of $A$ is 0, shift $A$ and $Q$ left and subtract $M$ from $A$; otherwise shift $A$ and $Q$ left and add $M$ to $A$.
  2. If the sign of $A$ is now 0, set $q_0 = 1$; otherwise set $q_0 = 0$.
- **Stage 2.** If the sign of $A$ is 1, add $M$ to $A$, to leave the correct positive remainder.

<figure class="table">
<figcaption>Non-restoring division of $1000$ by $11$ (after Hamacher, Fig. 9.25); □ marks the bit $q_0$ still to be set.</figcaption>

| Cycle | Step | $A$ | $Q$ |
|:-:|:--|:-:|:-:|
| | initially | 00000 | 1000 |
| 1 | shift | 00001 | 000□ |
| | subtract $M$ | 11110 | |
| | $q_0 = 0$ | | 0000 |
| 2 | shift | 11100 | 000□ |
| | add $M$ | 11111 | |
| | $q_0 = 0$ | | 0000 |
| 3 | shift | 11110 | 000□ |
| | add $M$ | 00001 | |
| | $q_0 = 1$ | | 0001 |
| 4 | shift | 00010 | 001□ |
| | subtract $M$ | 11111 | |
| | $q_0 = 0$ | | 0010 |
| | stage 2: add $M$ | 00010 | |

</figure>

## Floating Point (IEEE 754)

### Why Floating Point

With 32 bits we could fix a binary point somewhere, say 24 bits of integer part (including the sign) and 8 bits of fraction. This *fixed-point* format is simple, but its range is small: nothing above about $8.4 \times 10^6$, and nothing between 0 and $2^{-8} \approx 0.0039$. Real numbers are instead stored in *normalized floating point* [[3]](#ref-3):

$$\text{value} = (\text{sign}) \times \text{significand} \times 2^{\text{exponent}}$$

The significand fixes the **precision** (how many significant digits) and the exponent fixes the **range**. About 7 significant decimal digits are needed in practice. Each decimal digit needs $\log_2 10 \approx 3.32$ bits, so that is about 23–24 bits of significand, leaving 8 bits for the exponent in a 32-bit word.

### The Single-Precision Format

<figure class="fig">
{{< bits bits="s eeeeeeee fffffffffffffffffffffff" sizes="1,8,23" >}}
<figcaption>IEEE 754 single precision (32 bits): sign, biased exponent $E$, and significand (fraction) $f$.</figcaption>
</figure>

$$\text{value} = (-1)^s \times (1.f)_2 \times 2^{\,E - 127}$$

- **Sign** $s$: 0 for positive, 1 for negative.
- **Significand** $f$: a normalized binary number always starts with 1, so that 1 is **not stored**. This *hidden bit* gives 24 bits of precision from 23 stored bits.
- **Exponent** $E$: stored with a bias of 127 (below).

### Biased Exponent

Instead of giving the exponent its own sign bit, the stored 8-bit value $E$ stands for the exponent $E - 127$ (*excess-127*); this simplifies comparing the sizes of two floating-point numbers [[5]](#ref-5). The two extreme values are reserved for special numbers:

{{< figure src="/images/computer-systems/digital-electronics/floating_point_ieee_754/meaning_8_bit_biased_exponent.svg" alt="Meaning of the 8-bit biased exponent" width="610px" class="fig" caption="What each stored exponent value means. Normal numbers use $E = 1 \ldots 254$, i.e. exponents $-126 \ldots +127$." >}}

> **Note.** The sign and the biased exponent come **before** the significand on purpose. For two positive floats, comparing their bit patterns as plain integers gives the same order as comparing their values, so comparisons and sorting can run on the faster integer unit.

<div class="example">

Represent $-14.25$ in IEEE 754 single precision.

</div>

1. Negative, so $s = 1$.
2. $14 = 1110_2$ and $0.25 = 0.01_2$, so $14.25 = 1110.01_2 = 1.11001_2 \times 2^3$.
3. $E - 127 = 3 \implies E = 130 = 10000010_2$.
4. $f = 11001000\ldots0$ (the bits after the hidden 1).

<figure class="fig">
{{< bits bits="1 10000010 11001000000000000000000" notes="$s = 1$,$E = 130$,$(1).11001$" >}}
<figcaption>$-14.25$. Grouped in fours this is $1100\,0001\,0110\,0100\,0000\ldots = \texttt{C1640000}_{16}$.</figcaption>
</figure>

<div class="example">

Represent $52.21875$ in IEEE 754 single precision.

</div>

$52.21875 = 110100.00111_2 = 1.1010000111_2 \times 2^5$, so $E = 127 + 5 = 132 = 10000100_2$ and $f = 1010000111\,0\ldots0$:

<figure class="fig">
{{< bits bits="0 10000100 10100001110000000000000" notes="$s = 0$,$E = 132$,$(1).1010000111$" >}}
<figcaption>$52.21875$ in single precision.</figcaption>
</figure>

> **Note.** $4096 \times 4096 \times 4096 = 2^{36} = 1.00\ldots0 \times 2^{36}$ is exact. More generally, any 7-digit decimal integer can be represented without loss of precision, since the 24-bit significand covers integers up to $2^{24} \approx 1.6 \times 10^7$.

### Special Values

The reserved exponents $E = 0$ and $E = 255$ encode zero, infinity and NaN (not a number):

<figure class="fig">
{{< bits bits="0 00000000 00000000000000000000000" name="+0" >}}
{{< bits bits="1 00000000 00000000000000000000000" name="−0" >}}
{{< bits bits="0 11111111 00000000000000000000000" name="+∞" >}}
{{< bits bits="1 11111111 00000000000000000000000" name="−∞" >}}
{{< bits bits="x 11111111 1xxxxxxxxxxxxxxxxxxxxxx" name="QNaN" >}}
{{< bits bits="x 11111111 0xxxxxxxxxxxxxxxxxxxxxx" name="SNaN" >}}
<figcaption>Special values ($x$ = any bit; for SNaN the significand must not be all 0s, or it would be $\infty$). The QNaN/SNaN encoding is the one recommended by IEEE 754-2008; 754-1985 left it to the implementation.</figcaption>
</figure>

- **Zero** is all 0s in exponent and significand. Because of the hidden bit, an all-0 significand would otherwise mean $1.0$, so $E = 0$ is not used for normal numbers. $+0$ and $-0$ are different bit patterns but compare equal.
- **Infinity** is all 1s in the exponent with a zero significand; the sign bit gives $\pm\infty$.
- **NaN** (Not a Number) is all 1s in the exponent with a non-zero significand. It is the result of an indeterminate operation.
  - A **quiet NaN** (QNaN) simply propagates through later operations, e.g. from $0/0$, $\infty - \infty$ or $\sqrt{-1}$.
  - A **signalling NaN** (SNaN) raises an exception when used, e.g. to flag an uninitialized variable.

<figure class="table split-2">
<figcaption>Operations on special values ($n$ is a finite non-zero number; all NaNs here are quiet).</figcaption>

| Operation | Result | Operation | Result |
|:-:|:-:|:-:|:-:|
| $n / \pm\infty$ | $0$ | $\pm 0 / \pm 0$ | NaN |
| $\pm\infty \times \pm\infty$ | $\pm\infty$ | $\infty - \infty$ | NaN |
| $\pm n / 0$ | $\pm\infty$ | $\pm\infty / \pm\infty$ | NaN |
| $\infty + \infty$ | $\infty$ | $\pm\infty \times 0$ | NaN |

</figure>

### Range: Largest and Smallest Values

Since $E = 255$ is reserved, the **largest** finite number has $E = 254$ and an all-1s significand:

<figure class="fig">
{{< bits bits="0 11111110 11111111111111111111111" notes=",$E - 127 = 127$,$(1).11\ldots1 = 2 - 2^{-23}$" >}}
<figcaption>The largest single-precision number, $(2 - 2^{-23}) \times 2^{127} \approx 3.4 \times 10^{38}$.</figcaption>
</figure>

**Sum of a run of 1s.** Let $S = 1.11111_2 = 1 + \frac{1}{2} + \frac{1}{2^2} + \frac{1}{2^3} + \frac{1}{2^4} + \frac{1}{2^5}$. Then

$$2S = 2 + \underbrace{1 + \tfrac{1}{2} + \cdots + \tfrac{1}{2^4}}_{S - \frac{1}{2^5}} \implies 2S - 2 = S - \tfrac{1}{2^5} \implies S = 2 - 2^{-5}$$

for 5 fraction bits of 1. With 23 fraction bits,

$$\text{Maximum value} = (2 - 2^{-23}) \times 2^{127} \approx 3.403 \times 10^{38}$$

The **minimum** (most negative) value is the same with $s = 1$: $-(2 - 2^{-23}) \times 2^{127}$.

The **smallest positive normalized** number has $E = 1$ and $f = 0$:

<figure class="fig">
{{< bits bits="0 00000001 00000000000000000000000" notes=",$E - 127 = -126$,$(1).00\ldots0$" >}}
<figcaption>The smallest normalized number, $2^{-126} \approx 1.18 \times 10^{-38}$.</figcaption>
</figure>

A result larger in magnitude than the largest number is an **overflow**; a non-zero result smaller than the smallest normalized number is an **underflow** (it then becomes a subnormal, below, or 0).

### Subnormal Numbers

<div class="definition">

When $E = 0$ and $f \neq 0$, the hidden bit is taken as 0 and the number is *subnormal* (also called denormalized): $\text{value} = (-1)^s \times (0.f)_2 \times 2^{-126}$.

</div>

The exponent is $-126$ (not $E - 127 = -127$) so that the largest subnormal, $(1 - 2^{-23}) \times 2^{-126}$, sits right next to the smallest normal number $2^{-126}$ with no extra gap.

<figure class="fig">
{{< bits bits="0 00000000 11111111111111111111111" name="largest" notes=",$E = 0$,$(0).11\ldots1$" >}}
{{< bits bits="0 00000000 00000000000000000000001" name="smallest" notes=",$E = 0$,$(0).00\ldots01$" >}}
<figcaption>The largest and smallest subnormals. The smallest, $2^{-23} \times 2^{-126} = 2^{-149} \approx 1.4 \times 10^{-45}$, is called *tiny* or *dwarf*.</figcaption>
</figure>

Subnormals make underflow **gradual**. Instead of jumping from $2^{-126}$ straight to 0, numbers lose precision one bit at a time, and the smallest representable number moves much closer to 0. The picture below shows the same structure in a toy format with only 3 fraction bits:

{{< figure src="/images/computer-systems/digital-electronics/floating_point_ieee_754/spacing_values_toy_floating_point_format.svg" alt="Spacing of values in a toy floating-point format" width="600px" class="fig" caption="Representable values in a toy format. Inside each power-of-2 interval (a *binade*) the values are evenly spaced, and the gap doubles from one binade to the next. The subnormals (amber) fill $[0, \tfrac14)$ with the same spacing as the first binade." >}}

This is why, in the 16-bit question below, the largest gap between successive numbers is at the top of the range.

<div class="definition">

*Machine epsilon* is the gap between 1 and the next larger representable number. For single precision it is $2^{-23} \approx 1.19 \times 10^{-7}$, which is why single precision gives about 7 decimal digits. (Some texts instead define it as the maximum relative rounding error, $2^{-24} \approx 5.96 \times 10^{-8}$.)

</div>

### Rounding

After an operation the exact significand may need more than 23 bits, so it must be cut back:

- **Truncation** (round toward 0): drop the extra bits.
- **Round to nearest**: if the dropped bits are more than half of the last kept bit, add 1 to the last kept bit. For example, $0.110\ldots01$ followed by dropped bits $11$ becomes $0.110\ldots10$. On an exact tie (dropped bits $10\ldots0$) IEEE rounds to whichever neighbour ends in 0, *ties to even*, so ties do not always go up.

Round to nearest, ties to even, is the default. The standard also has round toward $+\infty$ and toward $-\infty$.

The standard asks for **correct rounding**: the result of $c = a \;\langle\text{op}\rangle\; b$ must be as if it were computed exactly and then rounded. This makes results reproducible across machines.

### Other Formats

IEEE 754-1985 defined single (32-bit) and double (64-bit) precision. IEEE 754-2008 kept these and added half (16-bit, originally for storing pixels in graphics) and quadruple (128-bit) precision, plus decimal formats. All binary formats follow the same rules for the hidden bit, bias, zero, infinity, NaN and subnormals.

<figure class="table split-1">
<figcaption>IEEE 754 binary formats.</figcaption>

| | Half | Single | Double | Quadruple |
|:--|:-:|:-:|:-:|:-:|
| Total bits | 16 | 32 | 64 | 128 |
| Exponent bits | 5 | 8 | 11 | 15 |
| Significand bits (stored) | 10 | 23 | 52 | 112 |
| Bias | 15 | 127 | 1023 | 16383 |
| Largest | $65504$ | $\approx 3.4 \times 10^{38}$ | $\approx 1.8 \times 10^{308}$ | $\approx 1.2 \times 10^{4932}$ |
| Smallest normal | $2^{-14}$ | $2^{-126}$ | $2^{-1022}$ | $2^{-16382}$ |
| Smallest subnormal | $2^{-24}$ | $2^{-149}$ | $2^{-1074}$ | $2^{-16494}$ |
| Machine epsilon | $2^{-10}$ | $2^{-23}$ | $2^{-52}$ | $2^{-112}$ |

</figure>

### Decimal Floating Point

A terminating decimal fraction need not terminate in binary: $0.1_{10} = 0.0\overline{0011}_2$, so $0.1$ is stored slightly wrong. In double precision, for example, $0.1 + 0.2$ gives $0.30000000000000004$, which is unacceptable for financial calculations. IEEE 754-2008 adds decimal formats, with a decimal significand $f$ and no hidden bit:

$$\text{value} = (-1)^s \times f \times 10^{\,\text{exp} - \text{bias}}$$

<figure class="fig">
{{< bits bits="s ccccc eeeeee dddddddddddddddddddd" labels="sign,combination,exp. continuation,coefficient" sizes="1,5,6,20" >}}
<figcaption>32-bit decimal floating point (IEEE 754-2008).</figcaption>
</figure>

- The 20-bit **coefficient** uses *densely packed decimal*: every 10 bits encode 3 decimal digits ($2^{10} = 1024 \geq 1000$), giving 6 digits.
- The 5-bit **combination field** supplies one more leading digit (0–9) and the top 2 bits of the exponent, or marks $\infty$ and NaN. This gives 7 significant digits.
- The exponent's top 2 bits take only the values 00, 01, 10, so with the 6 continuation bits there are $3 \times 2^6 = 192$ exponent values. The largest number is $9.999999 \times 10^{96}$.

<figure class="table">
<figcaption>Use of the combination bits $b_1 \ldots b_5$.</figcaption>

| Combination bits | Type | Top exponent bits | Leading coefficient digit |
|:-:|:-:|:-:|:-:|
| $x\,y\,a\,b\,c$ | finite | $x\,y$ | $0\,a\,b\,c$ (0–7) |
| $1\,1\,a\,b\,c$ | finite | $a\,b$ | $1\,0\,0\,c$ (8–9) |
| $1\,1\,1\,1\,0$ | $\infty$ | – | – |
| $1\,1\,1\,1\,1$ | NaN | – | – |

</figure>

### Floating-Point Questions

<div class="example">

Evaluate using 3-digit floating-point arithmetic **without rounding**: $(113. + (-111.)) + 7.51$ and $113. + ((-111.) + 7.51)$.

</div>

$$
\begin{aligned}
(113. + (-111.)) + 7.51 &= (1.13 \times 10^2 - 1.11 \times 10^2) + 7.51 \\
&= 0.02 \times 10^2 + 7.51 = 9.51
\end{aligned}
$$

$$
\begin{aligned}
113. + ((-111.) + 7.51) &= 1.13 \times 10^2 + (-1.11 \times 10^2 + 0.0751 \times 10^2) \\
&= 1.13 \times 10^2 + (-1.0349 \times 10^2) \\
&= 1.13 \times 10^2 - 1.03 \times 10^2 \quad \text{(truncated to 3 digits)} \\
&= 0.10 \times 10^2 = 10
\end{aligned}
$$

So floating-point addition is **not associative**.

<div class="example">

A 16-bit floating-point scheme is given below. Find the maximum difference between two successive real numbers that can be represented.

</div>

{{< figure src="/images/computer-systems/digital-electronics/floating_point_ieee_754/16_bit_floating_point_layout.svg" alt="16-bit floating point layout" width="420px" class="fig" caption="A 16-bit floating-point format." >}}

$$
\text{value} =
\begin{cases}
(-1)^s \left(1 + m \times 2^{-9}\right) 2^{\,e - 31}, & e \neq 111111 \\
0, & \text{otherwise}
\end{cases}
$$

The gap between successive numbers is **largest at the largest exponent** and smallest at the smallest exponent (this format has no subnormals). So take $e = 111110 = 62$, giving $2^{62 - 31} = 2^{31}$, and compare the two largest mantissas:

$$
\begin{aligned}
s = 0,\ m = 111111111: &\quad \left(1 + (2^9 - 1)\,2^{-9}\right) 2^{31} = (2 - 2^{-9})\, 2^{31} \\
s = 0,\ m = 111111110: &\quad \left(1 + (2^9 - 2)\,2^{-9}\right) 2^{31} = (2 - 2^{-8})\, 2^{31}
\end{aligned}
$$

$$\text{Difference} = (2^{-8} - 2^{-9})\, 2^{31} = 2^{-9} \times 2^{31} = \boxed{2^{22}}$$

## Latches and Flip-Flops

Combinational circuits have no memory: their outputs depend only on the current inputs. *Sequential* circuits feed outputs back into inputs, so they can store a bit.

### SR Latch

The simplest storage element is the SR (set–reset) latch: two NAND gates, each feeding its output back into the other:

{{< figure src="/images/computer-systems/digital-electronics/latches_flip_flops/sr_latch_cross_coupled_nand_gates.svg" alt="SR latch from two cross-coupled NAND gates" width="320px" class="fig" caption="SR latch from two cross-coupled NAND gates. Its inputs are active-low." >}}

A NAND output is 1 whenever either input is 0. So $\bar S = 0$ forces $Q = 1$ (*set*) and $\bar R = 0$ forces $\bar Q = 1$, i.e. $Q = 0$ (*reset*). With both inputs at 1, each gate just inverts the other's output, so the pair stays in whichever of its two stable states it was in: it remembers.

<figure class="table split-2 split-4">
<figcaption>NAND SR latch.</figcaption>

| $\bar S$ | $\bar R$ | $Q$ | $\bar Q$ | |
|:-:|:-:|:-:|:-:|:--|
| 1 | 1 | memory | memory | hold |
| 0 | 1 | 1 | 0 | set |
| 1 | 0 | 0 | 1 | reset |
| 0 | 0 | 1 | 1 | not allowed |

</figure>

$\bar S = \bar R = 0$ is not allowed: it makes $Q = \bar Q = 1$, and if both inputs then return to 1 together, the final state depends on which gate is faster. The same latch built from NOR gates has active-high inputs $S$ and $R$, and there $S = R = 1$ is the forbidden input.

### Clocked SR Latch

Adding two NAND gates in front of the latch makes the inputs active-high and only lets them through while the clock is 1:

{{< figure src="/images/computer-systems/digital-electronics/latches_flip_flops/clocked_sr_latch_nand_gates.svg" alt="Clocked SR latch from NAND gates" width="470px" class="fig" caption="Clocked SR latch. With CLK = 1: $S = 1$ sets $Q = 1$, $R = 1$ resets $Q = 0$, and $S = R = 0$ holds." >}}

<figure class="table split-3">
<figcaption>Clocked SR latch.</figcaption>

| CLK | $S$ | $R$ | $Q$ | |
|:-:|:-:|:-:|:-:|:--|
| 0 | × | × | memory | hold |
| 1 | 0 | 0 | memory | hold |
| 1 | 0 | 1 | 0 | reset |
| 1 | 1 | 0 | 1 | set |
| 1 | 1 | 1 | ? | not allowed |

</figure>

The input $S = R = 1$ is not allowed: both NAND outputs become 1 (so $Q = \bar Q$), and when the clock falls the latch ends up in an unpredictable state, a *race condition*.

### D Latch (Transparent Latch)

One way to make $S = R = 1$ impossible is to drive both inputs from a single input $D$: set $S = D$ and $R = \bar D$ with an inverter. Then $S$ and $R$ are always complements, and the output simply takes the value of $D$.

{{< figure src="/images/computer-systems/digital-electronics/latches_flip_flops/gated_d_latch_nand_gates.svg" alt="Gated D latch from NAND gates" width="470px" class="fig" caption="Gated D latch: two input NANDs steer $D$ and $\bar D$ into a cross-coupled NAND latch." >}}

<figure class="table split-2">
<figcaption>D latch.</figcaption>

| EN | $D$ | $Q$ | $\bar Q$ |
|:-:|:-:|:-:|:-:|
| 0 | × | memory | memory |
| 1 | 1 | 1 | 0 |
| 1 | 0 | 0 | 1 |

</figure>

While EN = 1 the output follows $D$ (the latch is *transparent*: $D$ passes straight through to $Q$, as if through a wire); when EN = 0 it holds the last value. $D$ stands for *data*, the bit the latch stores [[1]](#ref-1).

### JK Latch and Race-Around

The D latch avoids $S = R = 1$ by giving up one input. The JK latch keeps two inputs and instead eliminates the race condition by feeding back $Q$ and $\bar Q$: the $J$ gate is only enabled when $Q = 0$ and the $K$ gate only when $Q = 1$.

{{< figure src="/images/computer-systems/digital-electronics/latches_flip_flops/jk_latch_clocked_sr_latch_feedback.svg" alt="JK latch: clocked SR latch with feedback from Q and Q-bar" width="480px" class="fig" caption="JK latch: a clocked SR latch with $\bar Q$ fed back into the $J$ gate and $Q$ into the $K$ gate." >}}

<figure class="table split-3">
<figcaption>JK latch.</figcaption>

| CLK | $J$ | $K$ | $Q$ | |
|:-:|:-:|:-:|:-:|:--|
| 0 | × | × | memory | hold |
| 1 | 0 | 0 | memory | hold |
| 1 | 0 | 1 | 0 | reset |
| 1 | 1 | 0 | 1 | set |
| 1 | 1 | 1 | $\bar Q$ | toggle (repeatedly, see below) |

</figure>

Now $J = K = 1$ means *toggle*. But at CLK = 1, $J = K = 1$, every toggle changes the feedback, which enables the other gate, which toggles again: the output **toggles uncontrollably** for as long as the clock is high. This is the *race-around* problem of a level-triggered flip-flop.

{{< figure src="/images/computer-systems/digital-electronics/latches_flip_flops/race_around_q_toggles_repeatedly_while.svg" alt="Race-around: Q toggles repeatedly while CLK is high" width="600px" class="fig" caption="Race-around in a level-triggered JK latch." >}}

### Master–Slave JK Flip-Flop

Race-around is removed by making it a *master–slave* JK flip-flop. The master is enabled while CLK = 1 and the slave while CLK = 0, and the feedback comes from the **slave**, which does not change while the master is listening.

{{< figure src="/images/computer-systems/digital-electronics/latches_flip_flops/master_slave_jk_flip_flop.svg" alt="Master-slave JK flip-flop" width="560px" class="fig" caption="Master–slave JK flip-flop: the master is clocked by CLK, the slave by CLK̄, and the feedback comes from the slave's outputs." >}}

{{< figure src="/images/computer-systems/digital-electronics/latches_flip_flops/master_slave_jk_timing.svg" alt="Master-slave JK timing" width="600px" class="fig" caption="With $J = K = 1$ the output toggles exactly once per clock cycle." >}}

The output changes only when the clock falls, so it works like a **negative-edge-triggered** flip-flop.

It is not truly edge-triggered, though: the master–slave is a *pulse-triggered* flip-flop [[1]](#ref-1). While CLK = 1 the master is immediately affected by changes in its inputs, and the slave takes the master's state after the 1-to-0 transition of the clock [[5]](#ref-5). In an edge-triggered flip-flop, once the clock crosses its threshold the inputs are locked out until the next pulse [[2]](#ref-2).

<figure class="table split-3">
<figcaption>Master–slave JK flip-flop ($\downarrow$ = falling clock edge, $Q^+$ = the next state).</figcaption>

| CLK | $J$ | $K$ | $Q^+$ | |
|:-:|:-:|:-:|:-:|:--|
| not $\downarrow$ | × | × | $Q$ | hold |
| $\downarrow$ | 0 | 0 | $Q$ | hold |
| $\downarrow$ | 0 | 1 | 0 | reset |
| $\downarrow$ | 1 | 0 | 1 | set |
| $\downarrow$ | 1 | 1 | $\bar Q$ | toggle (once) |

</figure>

### Characteristic and Excitation Tables

A *characteristic table* gives the next state $Q^+$ from the inputs and the present state $Q$. Written as a Boolean equation it is the *characteristic equation* [[1]](#ref-1):

<figure class="table split-1">
<figcaption>Characteristic equations.</figcaption>

| Flip-flop | $Q^+$ | |
|:-:|:-:|:--|
| SR | $S + \bar R Q$ (with $SR = 0$) | set, reset, hold |
| JK | $J \bar Q + \bar K Q$ | as SR, and $J = K = 1$ toggles |
| D | $D$ | copies $D$ |
| T | $T \bar Q + \bar T Q = T \oplus Q$ | $T = 1$ toggles |

</figure>

Design goes the other way: we know the transition $Q \to Q^+$ each flip-flop has to make and need the inputs that cause it. That is the *excitation table* ($\times$ = don't care):

<figure class="table split-2 split-4 split-6 split-7">
<figcaption>Excitation tables.</figcaption>

| $Q$ | $Q^+$ | $S$ | $R$ | $J$ | $K$ | $T$ | $D$ |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | × | 0 | × | 0 | 0 |
| 0 | 1 | 1 | 0 | 1 | × | 1 | 1 |
| 1 | 0 | 0 | 1 | × | 1 | 1 | 0 |
| 1 | 1 | × | 0 | × | 0 | 0 | 1 |

</figure>

For a D flip-flop the input is just the next state, and for T it is $Q \oplus Q^+$. The don't-cares in the JK columns are why JK flip-flops often give the simplest input logic.

**Converting flip-flops.** To build one flip-flop from another, drive the inputs of the one you have with the characteristic equation of the one you want [[1]](#ref-1): a JK from a D is $D = J \bar Q + \bar K Q$, a T from a D is $D = T \oplus Q$, and a T from a JK is $J = K = T$.

### Setup and Hold Time

An edge-triggered flip-flop only works if its input is steady around the clock edge [[1]](#ref-1):

- **Setup time** $t_{su}$: the input must be stable for at least this long *before* the edge.
- **Hold time** $t_h$: it must stay stable for at least this long *after* the edge.
- **Propagation delay** $t_{pd}$: the time from the edge until the output has settled.

## Registers

A *register* is a group of flip-flops sharing a clock, one per bit. A *shift register* also connects each flip-flop's output to the next one's input, so the stored bits move one place per clock. The counters in the next section are registers with extra logic or feedback between the flip-flops.

{{< figure src="/images/computer-systems/digital-electronics/registers/parallel_parallel_out_register_parallel_load.svg" alt="Parallel-in parallel-out register with parallel load" width="580px" class="fig" caption="Parallel-in parallel-out (PIPO) register with parallel load (after Mano [[1]](#ref-1)). With LOAD = 1 each multiplexer passes $I_j$, so all four bits are loaded on the clock edge; with LOAD = 0 it feeds $Q_j$ back, so the register holds. CLEAR resets every flip-flop to 0." >}}

{{< figure src="/images/computer-systems/digital-electronics/registers/serial_serial_out_shift_register.svg" alt="Serial-in serial-out shift register" width="560px" class="fig" caption="Serial-in serial-out (SISO) shift register: one bit moves one place per clock." >}}

## Counters

### Ripple Counter

We can build counters from JK flip-flops with $J = K = 1$ (equivalently T flip-flops with $T = 1$), so each one toggles on every falling edge of its clock. In a *ripple counter* only the first flip-flop is driven by the clock; each later flip-flop is clocked by the output of the one before it.

{{< figure src="/images/computer-systems/digital-electronics/counters/3_bit_ripple_counter_jk_flip.svg" alt="3-bit ripple counter from JK flip-flops" width="560px" class="fig" caption="3-bit ripple counter (negative-edge-triggered JK flip-flops with $J = K = 1$)." >}}

{{< figure src="/images/computer-systems/digital-electronics/counters/ripple_counter_timing.svg" alt="Ripple counter timing" width="600px" class="fig" caption="$Q_C Q_B Q_A$ counts $0 \to 1 \to 2 \to \cdots \to 7 \to 0$. Each stage toggles slightly after the stage before it, which is why it is called a ripple counter." >}}

### Mod-$n$ Counter by Resetting

We can stop this sequence early using extra logic. For $0 \to 1 \to 2 \to 3 \to 0$, clear every flip-flop as soon as the count reaches 4 $= Q_C Q_B Q_A = 100$:

{{< figure src="/images/computer-systems/digital-electronics/counters/reset_logic_clear_flip_flops_when.svg" alt="Reset logic: clear all flip-flops when the count reaches 4" width="420px" class="fig" caption="Asynchronous reset: state 100 lasts only for an instant before everything is cleared to 000." >}}

### Synchronous Counters

In a *synchronous* counter all flip-flops share the same clock, and combinational logic decides which of them toggle. To design one, write the next state for every present state, and from it the input each flip-flop needs.

<div class="example">

Design a synchronous counter for $0 \to 1 \to 3 \to 5 \to 0$ using T flip-flops.

</div>

A T flip-flop toggles when $T = 1$, so $T$ is 1 exactly for the bits that change: $T = Q \oplus Q^+$.

<figure class="table split-3 split-6">
<figcaption>Excitation table ($\times$ for the unused states 2, 4, 6, 7).</figcaption>

| $Q_C$ | $Q_B$ | $Q_A$ | $Q_C^+$ | $Q_B^+$ | $Q_A^+$ | $T_C$ | $T_B$ | $T_A$ |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| 0 | 0 | 1 | 0 | 1 | 1 | 0 | 1 | 0 |
| 0 | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 1 |
| unused | (2, 4, | 6, 7) | | | | × | × | × |

</figure>

<figure class="fig">
<div class="figrow">
{{< kmap rowvar="Q_C" colvar="Q_BQ_A" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,0,1,x;x,1,x,x" groups="1,0,1,4;0,2,2,2" >}}
{{< kmap rowvar="Q_C" colvar="Q_BQ_A" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,1,1,x;x,0,x,x" groups="0,1,1,2" >}}
{{< kmap rowvar="Q_C" colvar="Q_BQ_A" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="1,0,0,x;x,1,x,x" groups="1,0,1,4;0,3,2,2" >}}
</div>
<figcaption>K-maps for $T_C$, $T_B$ and $T_A$ (left to right).</figcaption>
</figure>

$$T_C = Q_C + Q_B, \qquad T_B = \bar Q_C Q_A, \qquad T_A = Q_C + \bar Q_A$$

**Unused states.** With don't-cares, the unused states go wherever the logic happens to send them. Here $010 \to 111 \to 010 \to \cdots$ forms a loop that never reaches the count sequence, so a counter that powers up in 010 is stuck (*lock-out*). Instead of don't-cares, we can send every unused state to 000:

{{< figure src="/images/computer-systems/digital-electronics/counters/state_diagram_synchronous_0_1_3.svg" alt="State diagram of the synchronous 0, 1, 3, 5 counter" width="560px" class="fig" caption="Self-correcting design: every unused state goes to 000 on the next clock." >}}

Filling the table with $T = Q \oplus 000 = Q$ for the unused states gives

$$T_C = Q_C + Q_B Q_A, \qquad T_B = Q_B + \bar Q_C Q_A, \qquad T_A = Q_C Q_A + \bar Q_C \bar Q_B \bar Q_A$$

### Maximum Clock Frequency

In a ripple counter each flip-flop is clocked by the one before it, so after a clock edge the last of $n$ flip-flops settles only after $n\, t_{pd}$. The next edge must not come before that:

$$T_{clk} \ge n\, t_{pd} \quad\implies\quad f_{max} = \frac{1}{n\, t_{pd}}$$

In a synchronous counter every flip-flop is clocked at once, so the period only has to cover one flip-flop delay, the next-state logic and the setup time:

$$T_{clk} \ge t_{pd} + t_{\text{logic}} + t_{su}$$

<div class="example">

Flip-flops have $t_{pd} = 10$ ns and $t_{su} = 5$ ns, and the next-state logic of a synchronous counter is one level of AND gates with a delay of 5 ns. Find the maximum clock frequency of a 4-bit ripple counter and of a 4-bit synchronous counter.

</div>

Ripple: $f_{max} = 1 / (4 \times 10\text{ ns}) = 25$ MHz. Synchronous: $T_{clk} \ge 10 + 5 + 5 = 20$ ns, so $f_{max} = 50$ MHz. The ripple counter gets slower with every bit added; the synchronous one does not, as long as its logic stays one level deep.

### Ring Counter

A *ring counter* is a shift register whose last output feeds back into its first input.

{{< figure src="/images/computer-systems/digital-electronics/counters/3_bit_ring_counter_d_flip.svg" alt="3-bit ring counter from D flip-flops" width="540px" class="fig" caption="3-bit ring counter from D flip-flops." >}}

Initialize with $Q_C Q_B Q_A = 100$. Then $Q_B^+ = Q_C$, $Q_A^+ = Q_B$ and $Q_C^+ = Q_A$, so the single 1 circulates: $100 \to 010 \to 001 \to 100$.

{{< figure src="/images/computer-systems/digital-electronics/counters/ring_counter_timing.svg" alt="Ring counter timing" width="600px" class="fig" caption="3 distinct states, so this is a mod-3 counter ($n$ flip-flops give $n$ states)." >}}

We can also make a 4-bit ring counter by connecting a 2-to-4 decoder to a 2-bit counter:

{{< figure src="/images/computer-systems/digital-electronics/counters/4_bit_ring_counter_2_bit.svg" alt="4-bit ring counter from a 2-bit counter and a 2 to 4 decoder" width="520px" class="fig" caption="Ring counter from a counter and a decoder." >}}

### Johnson Counter

A *Johnson* (twisted-ring) counter feeds back the **complement** of the last output: $Q_B^+ = Q_C$, $Q_A^+ = Q_B$, $Q_C^+ = \bar Q_A$.

{{< figure src="/images/computer-systems/digital-electronics/counters/3_bit_johnson_counter_d_flip.svg" alt="3-bit Johnson counter from D flip-flops" width="540px" class="fig" caption="3-bit Johnson counter: $\bar Q_A$ is fed back to the first flip-flop." >}}

Initialize $Q_C Q_B Q_A = 000$: the sequence is $000 \to 100 \to 110 \to 111 \to 011 \to 001 \to 000$.

{{< figure src="/images/computer-systems/digital-electronics/counters/johnson_counter_timing.svg" alt="Johnson counter timing" width="600px" class="fig" caption="$n$ flip-flops give $2n$ states, so 3 flip-flops make a mod-6 counter. The outputs are phase-shifted square waves, so it can be used as a multi-phase clock." >}}

## State Machines

A sequential circuit with inputs, outputs and flip-flops is a *finite state machine* (FSM). There are two models, which differ only in how the output is formed [[1]](#ref-1):

<div class="definition">

In a *Moore machine* the output depends only on the present state. In a *Mealy machine* it depends on the present state **and** the input.

</div>

- In a Moore state diagram the output is written inside the state ($S/y$); in a Mealy diagram it is written on the arrow ($x/y$).
- Moore outputs change only with the clock, since they come from the flip-flops. A Mealy output can change in the middle of a clock period if the input does.
- For the same behaviour a Mealy machine often needs fewer states, because its output can react to the input directly.

**Design procedure** [[1]](#ref-1):

1. Draw the state diagram from the word description.
2. Reduce the number of states if possible: merge *equivalent* states, i.e. states that give the same output for every input and go to equivalent next states. This is the same procedure as minimizing a DFA (deterministic finite automaton); see Linz [[4]](#ref-4), §2.4.
3. Give each state a binary code. $k$ states need $\lceil \log_2 k \rceil$ flip-flops.
4. Write the state table: present state and input give the next state and output.
5. Choose the flip-flop type and find its inputs with the excitation table.
6. Simplify the input and output equations with K-maps and draw the circuit.

<div class="example">

Design a circuit whose output is 1 while it has seen three or more consecutive 1s on its input $x$.

</div>

As a Moore machine it needs four states: $S_0$ (no 1s yet), $S_1$ (one 1), $S_2$ (two) and $S_3$ (three or more, output 1). A 0 always sends it back to $S_0$.

{{< figure src="/images/computer-systems/digital-electronics/state_machines/moore_state_diagram_detector_three_more.svg" alt="Moore state diagram of a detector for three or more consecutive 1s" width="440px" class="fig" caption="Moore state diagram of the detector. Each state shows its output; each arrow shows the input $x$." >}}

With $S_0 = 00$, $S_1 = 01$, $S_2 = 10$, $S_3 = 11$ held in flip-flops $A$ and $B$:

<figure class="table split-2 split-3 split-5">
<figcaption>State table of the detector.</figcaption>

| $A$ | $B$ | $x$ | $A^+$ | $B^+$ | $y$ |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 0 | 0 | 0 | 0 |
| 0 | 0 | 1 | 0 | 1 | 0 |
| 0 | 1 | 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 1 | 0 | 0 |
| 1 | 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 1 | 1 | 1 | 0 |
| 1 | 1 | 0 | 0 | 0 | 1 |
| 1 | 1 | 1 | 1 | 1 | 1 |

</figure>

With D flip-flops the inputs are just the next-state columns, simplified with K-maps:

$$D_A = \textstyle\sum m(3, 5, 7) = Ax + Bx, \qquad D_B = \textstyle\sum m(1, 5, 7) = Ax + \bar B x, \qquad y = AB$$

As a Mealy machine the same detector needs only three states (no 1s, one 1, two or more 1s): the output is 1 on the arrow that takes a 1 while in the third state.

## Sequential Circuit Problems

<div class="example">

We want to design a synchronous counter for the sequence $0 \to 1 \to 0 \to 2 \to 0 \to 3 \to 0 \to \cdots$ using JK flip-flops, where the counter's state is the output. How many flip-flops do we need?

</div>

We need to count up to 3, so 2 bits are needed for the value. But the three 0s are followed by different numbers ($0 \to 1$, $0 \to 2$, $0 \to 3$), so the counter must also remember *which* 0 it is in. Telling 3 cases apart needs 2 more bits. In total we need **4 bits, i.e. 4 flip-flops**.

<div class="example">

Design a counter for the sequence $0 \to 2 \to 3 \to 1 \to 0$ using T flip-flops.

</div>

<figure class="table split-2 split-4">
<figcaption>Excitation table.</figcaption>

| $Q_2$ | $Q_1$ | $Q_2^+$ | $Q_1^+$ | $T_2$ | $T_1$ |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 0 | 1 | 0 | 1 | 0 |
| 1 | 0 | 1 | 1 | 0 | 1 |
| 1 | 1 | 0 | 1 | 1 | 0 |
| 0 | 1 | 0 | 0 | 0 | 1 |

</figure>

$$T_1 = \bar Q_2 Q_1 + Q_2 \bar Q_1 = Q_1 \oplus Q_2, \qquad T_2 = \bar Q_2 \bar Q_1 + Q_2 Q_1 = Q_1 \odot Q_2$$

{{< figure src="/images/computer-systems/digital-electronics/sequential_circuit_problems/t_flip_flop_counter_0_2.svg" alt="T flip-flop counter for 0, 2, 3, 1" width="590px" class="fig" caption="The $0 \to 2 \to 3 \to 1$ counter: an XNOR drives $T_2$ and an XOR drives $T_1$." >}}

<div class="example">

Consider the following circuit with a positive-edge-triggered D flip-flop. What is the output sequence on $Y$?

</div>

{{< figure src="/images/computer-systems/digital-electronics/sequential_circuit_problems/d_flip_flop_circuit_d_ax.svg" alt="D flip-flop circuit with D = AX + Q-bar X-bar" width="500px" class="fig" caption="$D = AX + \bar Q \bar X$." >}}

$$D = AX + \bar Q \bar X$$

The value of $X$ just before each positive edge decides what is stored:

- $X = 1$: $D = A$, so the flip-flop **loads $A$**.
- $X = 0$: $D = \bar Q$, so the flip-flop **toggles**.

So on each clock edge $k$, read $X$: if it is 1, $Y$ becomes the current $A_k$; if it is 0, $Y$ becomes the complement of its previous value. For example, with $X = 1, 1, 0, 1, 1$ on edges 1–5, the output is $Y = A_1, A_2, \bar A_2, A_4, A_5$.

<div class="example">

The circuit below uses XOR gates and non-inverting buffers with delays $\delta_1 = 2$ ns and $\delta_2 = 4$ ns; the XOR gates have zero delay. The logic is stable at 0 at time 0. If $A$ rises at $t = 1$ ns, how many transitions (changes of logic level) happen at $B$ from 0 to 10 ns?

</div>

{{< figure src="/images/computer-systems/digital-electronics/sequential_circuit_problems/xor_gates_delay_buffers.svg" alt="XOR gates with delay buffers" width="540px" class="fig" caption="$Q = A \oplus P$ with $P$ = $A$ delayed by 2 ns, and $B = Q \oplus R$ with $R$ = $Q$ delayed by 4 ns." >}}

{{< figure src="/images/computer-systems/digital-electronics/sequential_circuit_problems/timing_xor_buffer_circuit.svg" alt="Timing of the XOR and buffer circuit" width="600px" class="fig" caption="$Q$ is a 2 ns pulse (while $A$ and $P$ differ), $R$ is that pulse 4 ns later, and $B$ is high whenever exactly one of them is." >}}

$B$ rises at 1, falls at 3, rises at 5 and falls at 7: **4 transitions**.

<div class="example">

The control signals of a 4-bit binary counter are given below. The counter is connected so that it is cleared when $A_1$ and $A_3$ are both 1. Assuming counter and gate delays are negligible, if the counter starts at 0, what sequence does it go through?

</div>

<figure class="table split-4">
<figcaption>Counter control signals.</figcaption>

| Clear | Clock | Load | Count | Function |
|:-:|:-:|:-:|:-:|:--|
| 1 | × | × | × | clear to 0 |
| 0 | × | 0 | 0 | no change |
| 0 | ↑ | 1 | × | load input |
| 0 | ↑ | 0 | 1 | count next |

</figure>

{{< figure src="/images/computer-systems/digital-electronics/sequential_circuit_problems/4_bit_counter_clear_driven_a1.svg" alt="4-bit counter with Clear driven by A1 and A3" width="470px" class="fig" caption="The counter with Count = 1, Load = 0 and Clear = $A_3 A_1$." >}}

Counting up from $A_4 A_3 A_2 A_1 = 0000$: 0001, 0010, 0011, 0100, then 0101, where $A_3 = A_1 = 1$. Since the delay is negligible, the counter is cleared immediately and we never see this state. The sequence is

$$0 \to 1 \to 2 \to 3 \to 4 \to 0 \quad \text{(a mod-5 counter)}$$

## References

1. <span id="ref-1"></span>Mano, M. Morris, and Michael D. Ciletti. *Digital Design: With an Introduction to the Verilog HDL*, 5th ed. Pearson, 2013.

2. <span id="ref-2"></span>Mano, M. Morris. *Digital Logic and Computer Design*. Pearson India, 2017.

3. <span id="ref-3"></span>Rajaraman, V. *“IEEE Standard for Floating Point Numbers.”* *Resonance*, 21(1), 11–30, 2016. [https://www.ias.ac.in/public/Volumes/reso/021/01/0011-0030.pdf](https://www.ias.ac.in/public/Volumes/reso/021/01/0011-0030.pdf).

4. <span id="ref-4"></span>Linz, Peter. *An Introduction to Formal Languages and Automata*, 6th ed. Jones & Bartlett Learning, 2017.

5. <span id="ref-5"></span>Hamacher, Carl, Zvonko Vranesic, Safwat Zaky, and Naraig Manjikian. *Computer Organization and Embedded Systems*, 6th ed. McGraw-Hill, 2012, §1.4, Ch. 9 and App. A.

6. <span id="ref-6"></span>Lumetta, Steven S. *Static Hazards*. ECE 120: Introduction to Computing, lecture slides, University of Illinois at Urbana-Champaign, 2016. [https://lumetta.web.engr.illinois.edu/120-S19/slide-copies/061-static-hazards.pdf](https://lumetta.web.engr.illinois.edu/120-S19/slide-copies/061-static-hazards.pdf).

7. <span id="ref-7"></span>Sarma, Jayalal. *Lecture 34: Boolean Circuit Model of Computation* (scribe: Rahul CS). CS6840: Advanced Complexity Theory, IIT Madras, 2012. [https://www.cse.iitm.ac.in/~jayalal/teaching/CS6840/2012/lecture34.pdf](https://www.cse.iitm.ac.in/~jayalal/teaching/CS6840/2012/lecture34.pdf).
