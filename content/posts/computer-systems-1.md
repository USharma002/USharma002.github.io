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

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <path id="g-and" d="M0,0 h20 a20,20 0 0 1 0,40 h-20 z" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    <path id="g-or" d="M0,0 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  </defs>
</svg>


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
\overline{x + y} &= \bar x \, \bar y & \overline{xy} &= \bar x + \bar y && \text{De Morgan}
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

**Why the rows and columns are in Gray-code order.** With three or more variables the columns are labelled $00, 01, 11, 10$, not in binary order. In this order only one bit changes from one column to the next, so

> any two adjacent squares differ in exactly one variable.

That is exactly the condition for $a\bar b + ab = a$. For example $m_5$ and $m_7$ sit side by side, and

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

**Test (Post's theorem).** A set is complete exactly when, for each of these five properties, at least one of its operations does **not** have it:

- *preserves 0*: $f(0, \ldots, 0) = 0$;
- *preserves 1*: $f(1, \ldots, 1) = 1$;
- *self-dual*: $f^D = f$ (see [Self-Dual Functions](#self-dual-functions));
- *monotone*: changing an input from 0 to 1 never changes the output from 1 to 0;
- *linear*: $f$ is an XOR of some of its inputs, possibly with the constant 1.

For example $\{\text{AND}, \text{OR}\}$ is not complete: both are monotone, so NOT can never be built. NAND breaks all five properties at once, which is why it is universal.

Since NAND and NOR are universal, any SOP can be built from NAND gates alone, and any POS from NOR gates alone. The trick is to add pairs of bubbles (inversions), since $\bar{\bar x} = x$, and then use these equivalences (De Morgan's laws in gate form):

<figure class="fig">
<svg viewBox="0 0 300 140" width="300" role="img" aria-label="OR with inverted inputs equals NAND; AND with inverted inputs equals NOR">
  <g stroke="currentColor" stroke-width="1.5" fill="none">
    <!-- row 1: bubbled OR == NAND -->
    <line x1="10" y1="20" x2="34" y2="20"/><line x1="10" y1="40" x2="34" y2="40"/>
    <circle cx="38" cy="20" r="4"/><circle cx="38" cy="40" r="4"/>
    <use href="#g-or" x="40" y="10"/>
    <line x1="95" y1="30" x2="120" y2="30"/>
    <line x1="165" y1="20" x2="190" y2="20"/><line x1="165" y1="40" x2="190" y2="40"/>
    <use href="#g-and" x="190" y="10"/>
    <circle cx="234" cy="30" r="4"/>
    <line x1="238" y1="30" x2="265" y2="30"/>
    <!-- row 2: bubbled AND == NOR -->
    <line x1="10" y1="90" x2="32" y2="90"/><line x1="10" y1="110" x2="32" y2="110"/>
    <circle cx="36" cy="90" r="4"/><circle cx="36" cy="110" r="4"/>
    <use href="#g-and" x="40" y="80"/>
    <line x1="80" y1="100" x2="120" y2="100"/>
    <line x1="165" y1="90" x2="192" y2="90"/><line x1="165" y1="110" x2="192" y2="110"/>
    <use href="#g-or" x="190" y="80"/>
    <circle cx="249" cy="100" r="4"/>
    <line x1="253" y1="100" x2="280" y2="100"/>
  </g>
  <g fill="currentColor" font-size="22" text-anchor="middle">
    <text x="142" y="38">≡</text><text x="142" y="108">≡</text>
  </g>
</svg>
<figcaption>Top: OR with inverted inputs ≡ NAND ($\bar a + \bar b = \overline{ab}$). Bottom: AND with inverted inputs ≡ NOR ($\bar a \bar b = \overline{a+b}$).</figcaption>
</figure>

<div class="example">

Implement $F(x, y, z) = \sum m(1, 2, 3, 4, 5, 7)$ using only NAND gates.

</div>

**Step 1.** Simplify and write in SOP form: $F = x\bar y + \bar x y + z$.

**Step 2.** Draw it as AND–OR, then add two bubbles on each AND→OR wire (one at the AND output, one at the OR input). Each AND with an output bubble is a NAND, and the OR with bubbled inputs is a NAND. The single literal $z$ goes straight into the OR, so its bubble has to be absorbed by feeding $\bar z$ instead.

<figure class="fig">
<svg viewBox="0 0 340 190" width="340" role="img" aria-label="Two-level NAND-NAND circuit for F">
  <g stroke="currentColor" stroke-width="1.5" fill="none">
    <line x1="30" y1="30" x2="60" y2="30"/><line x1="30" y1="50" x2="60" y2="50"/>
    <use href="#g-and" x="60" y="20"/><circle cx="104" cy="40" r="4"/>
    <line x1="30" y1="100" x2="60" y2="100"/><line x1="30" y1="120" x2="60" y2="120"/>
    <use href="#g-and" x="60" y="90"/><circle cx="104" cy="110" r="4"/>
    <polyline points="108,40 160,40 160,95 210,95"/>
    <line x1="108" y1="110" x2="210" y2="110"/>
    <polyline points="30,165 170,165 170,125 210,125"/>
    <use href="#g-and" x="210" y="80" transform="translate(210 80) scale(1.25 1.5) translate(-210 -80)"/>
    <circle cx="264" cy="110" r="4"/>
    <line x1="268" y1="110" x2="305" y2="110"/>
  </g>
  <g fill="currentColor" font-size="15" font-style="italic">
    <text x="12" y="35">x</text><text x="12" y="55">ȳ</text>
    <text x="12" y="105">x̄</text><text x="12" y="125">y</text>
    <text x="12" y="170">z̄</text>
    <text x="310" y="115">F</text>
  </g>
</svg>
<figcaption>$F = \overline{\overline{x\bar y}\cdot\overline{\bar x y}\cdot \bar z} = x\bar y + \bar x y + z$, built from NAND gates.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 410 60" width="410" role="img" aria-label="NOR implementation of c a-bar, and a NOR used as an inverter">
  <g stroke="currentColor" stroke-width="1.5" fill="none">
    <line x1="25" y1="20" x2="62" y2="20"/><line x1="25" y1="40" x2="62" y2="40"/>
    <use href="#g-or" x="60" y="10"/><circle cx="119" cy="30" r="4"/>
    <line x1="123" y1="30" x2="150" y2="30"/>
    <polyline points="260,30 285,30"/><polyline points="285,20 285,40"/>
    <line x1="285" y1="20" x2="312" y2="20"/><line x1="285" y1="40" x2="312" y2="40"/>
    <use href="#g-or" x="310" y="10"/><circle cx="369" cy="30" r="4"/>
    <line x1="373" y1="30" x2="395" y2="30"/>
  </g>
  <g fill="currentColor" font-size="15" font-style="italic">
    <text x="8" y="25">c̄</text><text x="8" y="45">a</text>
    <text x="155" y="35">F = cā</text>
    <text x="245" y="35">a</text><text x="399" y="35">ā</text>
  </g>
</svg>
<figcaption>Left: $F = c\bar a$ as one NOR gate. Right: a NOR gate with tied inputs acting as an inverter.</figcaption>
</figure>

## Hazards

### Static-1 Hazard

<div class="definition">

A *static-1 hazard* is when the output momentarily becomes 0 while it is supposed to stay 1, caused by unequal gate delays when a single input changes.

</div>

It can be detected on a K-map: a hazard exists if there are **adjacent 1s that are not covered by a common implicant**. To avoid it, add a redundant group that covers those two cells.

For instance, in $F = \bar x z + x y$ from above, cells 3 and 7 are adjacent but lie in different groups. When $y = z = 1$ and $x$ changes, one AND turns off as the other turns on, and the output can glitch to 0. Adding the group $yz$ (green, dashed) covers that pair and removes the hazard: $F = \bar x z + x y + y z$.

<figure class="fig">
{{< kmap rowvar="x" colvar="yz" rows="0,1" cols="00,01,11,10" idx="0,1,3,2;4,5,7,6" cells="0,1,1,0;0,0,1,1" groups="0,1,1,2;1,2,1,2;0,2,2,1,d" >}}
<figcaption>The extra (redundant) group $yz$ that should be there to avoid the static-1 hazard.</figcaption>
</figure>

## Decoders

<div class="definition">

An $n$-to-$2^n$ *decoder* has $n$ inputs and $2^n$ outputs; exactly one output is 1, the one whose index equals the input. Each output is therefore one minterm of the inputs.

</div>

<figure class="fig">
<svg viewBox="0 0 360 150" width="360" role="img" aria-label="2 to 4 decoder with enable">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="110" y="15" width="110" height="110" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="165.0" y="66.0" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <text x="165.0" y="84.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">decoder</text>
  <polyline points="60,50 110,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50" y="55" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">a</text>
  <polyline points="60,80 110,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="50" y="85" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">b</text>
  <polyline points="165,145 165,125" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="180" y="146" text-anchor="start" font-size="12" fill="currentColor">EN</text>
  <polyline points="220,33 270,33" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="278" y="38" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">D₀ = āb̄</text>
  <polyline points="220,58 270,58" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="278" y="63" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">D₁ = āb</text>
  <polyline points="220,83 270,83" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="278" y="88" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">D₂ = ab̄</text>
  <polyline points="220,108 270,108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="278" y="113" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">D₃ = ab</text>
</svg>
<figcaption>2 × 4 decoder with an enable input.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 470 380" width="470" role="img" aria-label="4 to 16 decoder built from five 2 to 4 decoders">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="50" y="140" width="90" height="100" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95.0" y="195.0" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <polyline points="15,170 50,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="10" y="175" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">c</text>
  <polyline points="15,200 50,200" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="10" y="205" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">d</text>
  <polyline points="95,262 95,240" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="95" y="276" text-anchor="middle" font-size="12" fill="currentColor">EN</text>
  <rect x="270" y="10" width="90" height="70" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="315.0" y="50.0" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <text x="234" y="26" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <text x="234" y="46" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="240,22 270,22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="240,42 270,42" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,155 160,155 160,68 270,68" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="282" y="72" text-anchor="start" font-size="10" fill="currentColor" class="dim">EN</text>
  <polyline points="360,22 385,22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,37 385,37" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,52 385,52" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,67 385,67" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="395" y="50" text-anchor="start" font-size="13" fill="currentColor" font-style="italic">D₀–D₃</text>
  <rect x="270" y="102" width="90" height="70" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="315.0" y="142.0" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <text x="234" y="118" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <text x="234" y="138" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="240,114 270,114" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="240,134 270,134" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,177 174,177 174,160 270,160" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="282" y="164" text-anchor="start" font-size="10" fill="currentColor" class="dim">EN</text>
  <polyline points="360,114 385,114" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,129 385,129" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,144 385,144" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,159 385,159" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="395" y="142" text-anchor="start" font-size="13" fill="currentColor" font-style="italic">D₄–D₇</text>
  <rect x="270" y="194" width="90" height="70" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="315.0" y="234.0" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <text x="234" y="210" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <text x="234" y="230" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="240,206 270,206" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="240,226 270,226" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,199 188,199 188,252 270,252" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="282" y="256" text-anchor="start" font-size="10" fill="currentColor" class="dim">EN</text>
  <polyline points="360,206 385,206" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,221 385,221" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,236 385,236" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,251 385,251" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="395" y="234" text-anchor="start" font-size="13" fill="currentColor" font-style="italic">D₈–D₁₁</text>
  <rect x="270" y="286" width="90" height="70" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="315.0" y="326.0" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <text x="234" y="302" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <text x="234" y="322" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="240,298 270,298" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="240,318 270,318" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,221 202,221 202,344 270,344" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="282" y="348" text-anchor="start" font-size="10" fill="currentColor" class="dim">EN</text>
  <polyline points="360,298 385,298" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,313 385,313" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,328 385,328" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,343 385,343" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="395" y="326" text-anchor="start" font-size="13" fill="currentColor" font-style="italic">D₁₂–D₁₅</text>
</svg>
<figcaption>4 × 16 decoder from five 2 × 4 decoders. $c d$ selects a 2 × 4 decoder, and that decoder's $a b$ gives the output.</figcaption>
</figure>

### Implementing Functions with a Decoder

Since the outputs are the minterms, any $n$-variable function can be built from an $n$-to-$2^n$ decoder by ORing the outputs for the minterms where $f = 1$.

<div class="example">

Implement $f(x, y) = \bar x y + x \bar y$ using a decoder.

</div>

<figure class="fig">
<svg viewBox="0 0 400 140" width="400" role="img" aria-label="Implementing a function with a decoder and an OR gate">
  <rect x="90" y="10" width="100" height="120" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="125" y="75" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <polyline points="40,50 90,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30" y="55" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">x</text>
  <polyline points="40,90 90,90" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30" y="95" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">y</text>
  <text x="184" y="29" text-anchor="end" font-size="10" fill="currentColor" class="dim">x̄ȳ</text>
  <text x="184" y="59" text-anchor="end" font-size="10" fill="currentColor" class="dim">x̄y</text>
  <text x="184" y="89" text-anchor="end" font-size="10" fill="currentColor" class="dim">xȳ</text>
  <text x="184" y="119" text-anchor="end" font-size="10" fill="currentColor" class="dim">xy</text>
  <polyline points="190,25 215,25" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220" y="29" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">D₀</text>
  <polyline points="190,55 235,55 235,60 264,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="198" y="51" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">D₁</text>
  <polyline points="190,85 235,85 235,80 264,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="198" y="99" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">D₂</text>
  <polyline points="190,115 215,115" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="220" y="119" text-anchor="start" font-size="11" fill="currentColor" font-style="italic">D₃</text>
  <path d="M258,50 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="313,70 360,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="368" y="75" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">f</text>
</svg>
<figcaption>$f = \sum m(1, 2) = D_1 + D_2$.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 330 160" width="330" role="img" aria-label="4 by 2 encoder from two OR gates">
  <text x="40" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic" class="dim">D₀</text>
  <polyline points="40,28 40,150" stroke="currentColor" stroke-width="1.5" fill="none" class="dim"/>
  <text x="70" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D₁</text>
  <polyline points="70,28 70,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D₂</text>
  <polyline points="100,28 100,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D₃</text>
  <polyline points="130,28 130,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="100,50 206,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="50" r="2.6" fill="currentColor"/>
  <polyline points="130,70 206,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="130" cy="70" r="2.6" fill="currentColor"/>
  <path d="M200,40 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="255,60 300,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="308" y="65" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">x</text>
  <polyline points="70,110 206,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="70" cy="110" r="2.6" fill="currentColor"/>
  <polyline points="130,130 206,130" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="130" cy="130" r="2.6" fill="currentColor"/>
  <path d="M200,100 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="255,120 300,120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="308" y="125" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">y</text>
</svg>
<figcaption>4 × 2 encoder: $x = D_2 + D_3$, $y = D_1 + D_3$. $D_0$ is not connected, since its code is $00$.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 380 180" width="380" role="img" aria-label="4 by 2 priority encoder">
  <text x="40" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic" class="dim">D₀</text>
  <polyline points="40,28 40,170" stroke="currentColor" stroke-width="1.5" fill="none" class="dim"/>
  <text x="70" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D₁</text>
  <polyline points="70,28 70,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D₂</text>
  <polyline points="100,28 100,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="130" y="20" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">D₃</text>
  <polyline points="130,28 130,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="100,50 256,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="50" r="2.6" fill="currentColor"/>
  <polyline points="130,70 256,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="130" cy="70" r="2.6" fill="currentColor"/>
  <path d="M250,40 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="305,60 350,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="358" y="65" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">x</text>
  <polyline points="70,110 170,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="70" cy="110" r="2.6" fill="currentColor"/>
  <polyline points="100,130 162,130" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="130" r="2.6" fill="currentColor"/>
  <circle cx="166" cy="130" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M170,100 h20 a20,20 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="210,120 235,120 235,135 256,135" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="130,155 256,155" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="130" cy="155" r="2.6" fill="currentColor"/>
  <path d="M250,125 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="305,145 350,145" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="358" y="150" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">y</text>
</svg>
<figcaption>4 × 2 priority encoder: $x = D_2 + D_3$, $y = D_3 + D_1 \bar D_2$. The bubble on the AND gate blocks $D_1$ whenever $D_2$ is 1.</figcaption>
</figure>

## Multiplexers

<div class="definition">

A $2^n$-to-1 *multiplexer* (mux) has $2^n$ data inputs, $n$ select lines and one output; the select lines choose which input is passed to the output.

</div>

<div class="figrow">

<figure class="fig">
<svg viewBox="0 0 330 200" width="330" role="img" aria-label="4 to 1 multiplexer">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <polygon points="120,15 210,45 210,135 120,165" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="165.0" y="95.0" text-anchor="middle" font-size="14" fill="currentColor">4 : 1</text>
  <polyline points="70,40 120,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60" y="45" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">I₀</text>
  <polyline points="70,72 120,72" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60" y="77" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">I₁</text>
  <polyline points="70,104 120,104" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60" y="109" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">I₂</text>
  <polyline points="70,136 120,136" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="60" y="141" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">I₃</text>
  <polyline points="210,90 260,90" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="268" y="95" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">y</text>
  <polyline points="150,185 150,155.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="150" y="198" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">s₁</text>
  <polyline points="180,185 180,145.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="180" y="198" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">s₀</text>
</svg>
<figcaption>4 : 1 multiplexer.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 600 262" width="600" role="img" aria-label="Implementing f with an 8 to 1 mux and with a 4 to 1 mux">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <polygon points="90,10 180,50 180,190 90,230" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="125.0" text-anchor="middle" font-size="14" fill="currentColor">8 : 1</text>
  <polyline points="50,30 90,30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="35" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <polyline points="50,55 90,55" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="60" text-anchor="end" font-size="14" fill="currentColor">0</text>
  <polyline points="50,80 90,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="85" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <polyline points="50,105 90,105" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="110" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <polyline points="50,130 90,130" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="135" text-anchor="end" font-size="14" fill="currentColor">0</text>
  <polyline points="50,155 90,155" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="160" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <polyline points="50,180 90,180" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="185" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <polyline points="50,205 90,205" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="42" y="210" text-anchor="end" font-size="14" fill="currentColor">0</text>
  <polyline points="180,120 220,120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="228" y="125" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">f</text>
  <polyline points="115,240 115,218.9" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="115" y="254" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">a</text>
  <polyline points="137,240 137,209.1" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="137" y="254" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">b</text>
  <polyline points="159,240 159,199.3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="159" y="254" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">c</text>
  <polygon points="400,40 490,70 490,170 400,200" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="445.0" y="125.0" text-anchor="middle" font-size="14" fill="currentColor">4 : 1</text>
  <polyline points="360,70 400,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350" y="75" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">c̄</text>
  <polyline points="360,102 400,102" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350" y="107" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <polyline points="360,134 400,134" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350" y="139" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">c</text>
  <polyline points="360,166 400,166" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350" y="171" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">c̄</text>
  <polyline points="490,120 530,120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="538" y="125" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">f</text>
  <polyline points="430,240 430,190.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="430" y="254" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">a</text>
  <polyline points="460,240 460,180.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="460" y="254" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">b</text>
</svg>
<figcaption>Left: Method 1 with an 8 : 1 mux (inputs are the $f$ column). Right: Method 2 with a 4 : 1 mux (inputs $\bar c, 1, c, \bar c$).</figcaption>
</figure>

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
(10\;1100\;0110\;1011\,.\,1111\;0010)_2 &= (\text{2C6B.F2})_{16}
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
<figcaption>Three codes for the decimal digits.</figcaption>

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
- **Gray code** changes only one bit between consecutive values, so a changing value never passes through a wrong intermediate reading ($7 \to 8$ is $0100 \to 1100$, against $0111 \to 1000$ in binary). It is the order used for the K-map rows and columns. To convert, $g_{n-1} = b_{n-1}$ and $g_i = b_{i+1} \oplus b_i$; back again, $b_i = b_{i+1} \oplus g_i$.

**BCD addition.** Add two BCD digits as binary numbers. If the sum is more than 9, add 6 ($0110$) to skip the six unused patterns; this gives the correct digit and a decimal carry:

$$8 + 9:\quad 1000 + 1001 = 1\,0001 \;\xrightarrow{+\,0110}\; 1\,0111 = 17$$

## Number Representation

For an $n$-bit representation:

**Unsigned integers** range over $000\ldots0$ to $111\ldots1$, i.e. $0$ to $2^n - 1$.

### Signed Magnitude

<div class="definition">

In *signed magnitude*, the most significant bit $x_{n-1}$ is the sign and the remaining bits $x_{n-2} \ldots x_0$ are the magnitude:

$$\text{value} = (-1)^{x_{n-1}} \times \sum_{i=0}^{n-2} 2^i x_i$$

</div>

- There are **two representations of zero**: $1\,00\ldots0 = -0$ and $0\,00\ldots0 = +0$.
- Range: $-(2^{n-1} - 1)$ to $+(2^{n-1} - 1)$, i.e. only $2^n - 1$ distinct numbers.

### Two's Complement

<div class="definition">

In *two's complement*, the most significant bit has weight $-2^{n-1}$ instead of $+2^{n-1}$:

$$\text{value} = -2^{n-1} x_{n-1} + \sum_{i=0}^{n-2} 2^i x_i, \qquad \text{e.g. } n = 4: \; -8\,b_3 + 4\,b_2 + 2\,b_1 + b_0$$

</div>

If $b_3 = 1$, the other bits add up to at most $7$, so the value is at most $-1$. Hence only $0000$ is zero.

To negate a number, complement every bit and add 1:

$$\underset{(3)}{0011} \xrightarrow{\text{complement}} 1100 + 1 \longrightarrow \underset{(-3)}{1101}$$

<figure class="fig">
<svg viewBox="0 0 400 350" width="400" role="img" aria-label="4-bit two's complement number wheel">
  <circle cx="200" cy="175" r="105" fill="none" stroke="currentColor" stroke-width="1.5"/>
  <g fill="currentColor">
    <circle cx="200.0" cy="70.0" r="3"/>
    <text x="200.0" y="45.0" text-anchor="middle" font-size="14"><tspan font-family="Source Code Pro, monospace">0000</tspan> <tspan font-weight="bold">0</tspan></text>
    <circle cx="240.2" cy="78.0" r="3"/>
    <text x="233.7" y="55.3" text-anchor="start" font-size="14"><tspan font-family="Source Code Pro, monospace">0001</tspan> <tspan font-weight="bold">+1</tspan></text>
    <circle cx="274.2" cy="100.8" r="3"/>
    <text x="277.5" y="84.5" text-anchor="start" font-size="14"><tspan font-family="Source Code Pro, monospace">0010</tspan> <tspan font-weight="bold">+2</tspan></text>
    <circle cx="297.0" cy="134.8" r="3"/>
    <text x="306.7" y="128.3" text-anchor="start" font-size="14"><tspan font-family="Source Code Pro, monospace">0011</tspan> <tspan font-weight="bold">+3</tspan></text>
    <circle cx="305.0" cy="175.0" r="3"/>
    <text x="317.0" y="180.0" text-anchor="start" font-size="14"><tspan font-family="Source Code Pro, monospace">0100</tspan> <tspan font-weight="bold">+4</tspan></text>
    <circle cx="297.0" cy="215.2" r="3"/>
    <text x="306.7" y="231.7" text-anchor="start" font-size="14"><tspan font-family="Source Code Pro, monospace">0101</tspan> <tspan font-weight="bold">+5</tspan></text>
    <circle cx="274.2" cy="249.2" r="3"/>
    <text x="277.5" y="275.5" text-anchor="start" font-size="14"><tspan font-family="Source Code Pro, monospace">0110</tspan> <tspan font-weight="bold">+6</tspan></text>
    <circle cx="240.2" cy="272.0" r="3"/>
    <text x="233.7" y="304.7" text-anchor="start" font-size="14"><tspan font-family="Source Code Pro, monospace">0111</tspan> <tspan font-weight="bold">+7</tspan></text>
    <circle cx="200.0" cy="280.0" r="3"/>
    <text x="200.0" y="315.0" text-anchor="middle" font-size="14"><tspan font-family="Source Code Pro, monospace">1000</tspan> <tspan font-weight="bold">-8</tspan></text>
    <circle cx="159.8" cy="272.0" r="3"/>
    <text x="166.3" y="304.7" text-anchor="end" font-size="14"><tspan font-family="Source Code Pro, monospace">1001</tspan> <tspan font-weight="bold">-7</tspan></text>
    <circle cx="125.8" cy="249.2" r="3"/>
    <text x="122.5" y="275.5" text-anchor="end" font-size="14"><tspan font-family="Source Code Pro, monospace">1010</tspan> <tspan font-weight="bold">-6</tspan></text>
    <circle cx="103.0" cy="215.2" r="3"/>
    <text x="93.3" y="231.7" text-anchor="end" font-size="14"><tspan font-family="Source Code Pro, monospace">1011</tspan> <tspan font-weight="bold">-5</tspan></text>
    <circle cx="95.0" cy="175.0" r="3"/>
    <text x="83.0" y="180.0" text-anchor="end" font-size="14"><tspan font-family="Source Code Pro, monospace">1100</tspan> <tspan font-weight="bold">-4</tspan></text>
    <circle cx="103.0" cy="134.8" r="3"/>
    <text x="93.3" y="128.3" text-anchor="end" font-size="14"><tspan font-family="Source Code Pro, monospace">1101</tspan> <tspan font-weight="bold">-3</tspan></text>
    <circle cx="125.8" cy="100.8" r="3"/>
    <text x="122.5" y="84.5" text-anchor="end" font-size="14"><tspan font-family="Source Code Pro, monospace">1110</tspan> <tspan font-weight="bold">-2</tspan></text>
    <circle cx="159.8" cy="78.0" r="3"/>
    <text x="166.3" y="55.3" text-anchor="end" font-size="14"><tspan font-family="Source Code Pro, monospace">1111</tspan> <tspan font-weight="bold">-1</tspan></text>
  </g>
  <text x="200" y="180" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">+1 clockwise</text>
</svg>
<figcaption>The 4-bit two's complement wheel. Adding 1 moves one step clockwise; the jump from $0111\,(+7)$ to $1000\,(-8)$ is where overflow happens.</figcaption>
</figure>

- Range: $-8$ to $7$ for 4 bits, and in general $-2^{n-1}$ to $2^{n-1} - 1$.
- No repeated representations $\implies$ $2^n$ distinct numbers.
- Allows efficient addition and multiplication (the same adder works for signed and unsigned numbers).

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

4 bits can only represent values up to 15, so a **carry out of the MSB means overflow** for unsigned numbers.

### Two's Complement Overflow

Adding a positive and a negative number can **never** overflow, since the result's magnitude is smaller than both operands. Overflow happens only when both operands have the same sign but the result has the opposite sign:

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

<figure class="fig">
<svg viewBox="0 0 360 150" width="360" role="img" aria-label="Half adder circuit">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="22" y="45" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">a</text>
  <text x="22" y="65" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">b</text>
  <path d="M150,30 q15,20 0,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M157,30 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M150,90 h20 a20,20 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="32,40 154,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="32,60 154,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="90,40 90,100 150,100" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="90" cy="40" r="2.6" fill="currentColor"/>
  <polyline points="110,60 110,120 150,120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="110" cy="60" r="2.6" fill="currentColor"/>
  <polyline points="212,50 270,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="190,110 270,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="280" y="55" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">S = a ⊕ b</text>
  <text x="280" y="115" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">C = ab</text>
</svg>
<figcaption>Half adder: one XOR and one AND gate. Equivalently, $S$ can be built two-level as $\bar a b + a \bar b$ (two ANDs and an OR).</figcaption>
</figure>

### Full Adder

A half adder has no carry input, so it can only add the lowest bit. A *full adder* also takes the carry $c$ from the previous position.

**Using half adders.** First add $x = a + b$ with one half adder, then add $x + c$ with a second; a carry can come out of either, so the two carries are ORed:

<figure class="fig">
<svg viewBox="0 0 640 170" width="640" role="img" aria-label="Full adder built from two half adders and an OR gate">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20" y="55" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">a</text>
  <text x="20" y="85" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">b</text>
  <text x="20" y="145" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">c</text>
  <rect x="80" y="30" width="80" height="70" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="120.0" y="70.0" text-anchor="middle" font-size="14" fill="currentColor">HA₁</text>
  <rect x="260" y="15" width="80" height="70" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="55.0" text-anchor="middle" font-size="14" fill="currentColor">HA₂</text>
  <polyline points="30,50 80,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="30,80 80,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="160,50 210,50 210,35 260,35" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="185" y="44" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">a⊕b</text>
  <polyline points="30,140 230,140 230,65 260,65" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="340,35 470,35" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="478" y="40" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">S = a⊕b⊕c</text>
  <path d="M395,95 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="340,65 370,65 370,105 398,105" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="352" y="58" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">(a⊕b)c</text>
  <polyline points="160,80 190,80 190,125 398,125" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="172" y="74" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">ab</text>
  <polyline points="450,115 470,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="478" y="120" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">C = (a⊕b)c + ab</text>
</svg>
<figcaption>Full adder from two half adders and an OR gate: 2 XOR, 2 AND and 1 OR gate in total.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 680 260" width="680" role="img" aria-label="Full adder in sum-of-products form, with NOT gates on the complemented inputs">
  <path d="M100,20 h20 a20,20 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="31" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <polyline points="42,27 62,27" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M62,22 L73,27 L62,32 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="76" cy="27" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="79,27 100,27" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="44" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="42,40 62,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M62,35 L73,40 L62,45 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="76" cy="40" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="79,40 100,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="57" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">cₙ</text>
  <polyline points="42,53 100,53" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M100,75 h20 a20,20 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="86" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <polyline points="42,82 62,82" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M62,77 L73,82 L62,87 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="76" cy="82" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="79,82 100,82" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="99" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="42,95 100,95" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="112" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">cₙ</text>
  <polyline points="42,108 62,108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M62,103 L73,108 L62,113 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="76" cy="108" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="79,108 100,108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M100,130 h20 a20,20 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="141" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <polyline points="42,137 100,137" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="154" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="42,150 62,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M62,145 L73,150 L62,155 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="76" cy="150" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="79,150 100,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="167" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">cₙ</text>
  <polyline points="42,163 62,163" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M62,158 L73,163 L62,168 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="76" cy="163" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="79,163 100,163" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M100,185 h20 a20,20 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="196" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <polyline points="42,192 100,192" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="209" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="42,205 100,205" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="38" y="222" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">cₙ</text>
  <polyline points="42,218 100,218" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M210,92 q18,30 0,60 q55,0 72,-30 q-18,-30 -72,-30 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,40 180,40 180,104 216,104" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,95 170,95 170,116 219,116" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,150 170,150 170,128 219,128" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="140,205 180,205 180,140 216,140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="282,122 315,122" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="322" y="127" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">S</text>
  <path d="M440,55 h20 a15,15 0 0 1 0,30 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="378" y="66" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <polyline points="382,62 440,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="378" y="82" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="382,78 440,78" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M440,107 h20 a15,15 0 0 1 0,30 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="378" y="118" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">b</text>
  <polyline points="382,114 440,114" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="378" y="134" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">cₙ</text>
  <polyline points="382,130 440,130" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M440,159 h20 a15,15 0 0 1 0,30 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="378" y="170" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">a</text>
  <polyline points="382,166 440,166" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="378" y="186" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">cₙ</text>
  <polyline points="382,182 440,182" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M530,97 q15,25 0,50 q48,0 62,-25 q-15,-25 -62,-25 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="475,70 505,70 505,109 535,109" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="475,122 537,122" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="475,174 505,174 505,135 535,135" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="592,122 620,122" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="626" y="127" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">cₙ₊₁</text>
  <text x="170" y="250" text-anchor="middle" font-size="12" fill="currentColor" class="dim">(a) sum</text>
  <text x="510" y="250" text-anchor="middle" font-size="12" fill="currentColor" class="dim">(b) carry</text>
</svg>
<figcaption>Full adder in sum-of-products form (after Mano, Fig. 4.7 [[1]](#ref-1)), with NOT gates for the complemented inputs. $S$ passes through NOT → AND → OR (3 gate delays); $c_{n+1}$ uses no complements, so AND → OR (2 gate delays). The ripple-carry example below uses this circuit.</figcaption>
</figure>

**Try it.** Change an input and watch the change move through the circuit above one gate delay at a time. The NOT gates and the carry ANDs update at step 1, the sum ANDs and $c_{n+1}$ at step 2, and $S$ at step 3.

{{< fullscreen-iframe id="full-adder-steps" src="/interactive/full_adder_steps.html" height="440" title="Full adder step by step" >}}

### Ripple-Carry Adder

Chaining $n$ full adders, each passing its carry out to the next, gives an $n$-bit *ripple-carry adder*.

<div class="example">

A 16-bit ripple-carry adder is built from full adders using AND, OR and NOT gates, each with a delay of 1 ns. How long does an addition take?

</div>

<figure class="fig">
<svg viewBox="0 0 650 175" width="650" role="img" aria-label="16-bit ripple carry adder">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="40" y="55" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="80.0" y="85.0" text-anchor="middle" font-size="14" fill="currentColor">FA15</text>
  <polyline points="65,18 65,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="95,18 95,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="65" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₁₅</text>
  <text x="95" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₁₅</text>
  <polyline points="80,105 80,132" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="80" y="148" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₁₅</text>
  <rect x="220" y="55" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="85.0" text-anchor="middle" font-size="14" fill="currentColor">FA2</text>
  <polyline points="245,18 245,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="275,18 275,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="245" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₂</text>
  <text x="275" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₂</text>
  <polyline points="260,105 260,132" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="260" y="148" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₂</text>
  <rect x="340" y="55" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="380.0" y="85.0" text-anchor="middle" font-size="14" fill="currentColor">FA1</text>
  <polyline points="365,18 365,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="395,18 395,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="365" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₁</text>
  <text x="395" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₁</text>
  <polyline points="380,105 380,132" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="380" y="148" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₁</text>
  <rect x="460" y="55" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="500.0" y="85.0" text-anchor="middle" font-size="14" fill="currentColor">FA0</text>
  <polyline points="485,18 485,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="515,18 515,55" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="485" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₀</text>
  <text x="515" y="14" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₀</text>
  <polyline points="500,105 500,132" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="500" y="148" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₀</text>
  <polyline points="610,80 540,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="618" y="85" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">C₀</text>
  <polyline points="460,80 420,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="440" y="72" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₁</text>
  <polyline points="340,80 300,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="320" y="72" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₂</text>
  <polyline points="220,80 185,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="168" y="85" text-anchor="middle" font-size="18" fill="currentColor">⋯</text>
  <polyline points="150,80 120,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="135" y="72" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₁₅</text>
  <polyline points="40,80 8,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="22" y="72" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₁₆</text>
  <text x="440" y="97" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2 ns</text>
  <text x="320" y="97" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4 ns</text>
  <text x="142" y="97" text-anchor="middle" font-size="11" fill="currentColor" class="dim">30 ns</text>
  <text x="22" y="97" text-anchor="middle" font-size="11" fill="currentColor" class="dim">32 ns</text>
  <text x="80" y="168" text-anchor="middle" font-size="11" fill="currentColor" class="dim">33 ns</text>
</svg>
<figcaption>16-bit ripple-carry adder. Each carry is ready 2 ns after the previous one; the times shown are when each carry is ready.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 640 642" width="640" role="img" aria-label="Gate-level 4-bit carry lookahead logic">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <polyline points="34,28 34,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="34" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₀</text>
  <polyline points="56,28 56,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="56" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₀</text>
  <polyline points="78,28 78,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="78" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">G₀</text>
  <polyline points="100,28 100,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₁</text>
  <polyline points="122,28 122,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="122" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">G₁</text>
  <polyline points="144,28 144,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="144" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₂</text>
  <polyline points="166,28 166,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="166" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">G₂</text>
  <polyline points="188,28 188,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="188" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P₃</text>
  <polyline points="210,28 210,624" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="210" y="20" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">G₃</text>
  <path d="M500,49.5 q15,14.0 0,28 q40,0 55,-14.0 q-15,-14.0 -55,-14.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="78" cy="52" r="2.6" fill="currentColor"/>
  <polyline points="78,52 486,52 486,57.5 506.1224489795918,57.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,62 h14 a13.0,13.0 0 0 1 0,26 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="56" cy="70" r="2.6" fill="currentColor"/>
  <polyline points="56,70 300,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="34" cy="80" r="2.6" fill="currentColor"/>
  <polyline points="34,80 300,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="327.0,75.0 486,75.0 486,67.5 506.88775510204084,67.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="555,63.5 590,63.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="598" y="68.5" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">C₁</text>
  <path d="M500,136.0 q15,19.0 0,38 q40,0 55,-19.0 q-15,-19.0 -55,-19.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="122" cy="124" r="2.6" fill="currentColor"/>
  <polyline points="122,124 486,124 486,144.0 504.9861495844875,144.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,134 h14 a13.0,13.0 0 0 1 0,26 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="142" r="2.6" fill="currentColor"/>
  <polyline points="100,142 300,142" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="78" cy="152" r="2.6" fill="currentColor"/>
  <polyline points="78,152 300,152" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="327.0,147.0 479,147.0 479,154.0 507.4792243767313,154.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,168 h14 a18.0,18.0 0 0 1 0,36 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="176" r="2.6" fill="currentColor"/>
  <polyline points="100,176 300,176" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="56" cy="186" r="2.6" fill="currentColor"/>
  <polyline points="56,186 300,186" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="34" cy="196" r="2.6" fill="currentColor"/>
  <polyline points="34,196 300,196" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="332.0,186.0 486,186.0 486,164.0 505.8171745152355,164.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="555,155.0 590,155.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="598" y="160.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">C₂</text>
  <path d="M500,271.5 q15,24.0 0,48 q40,0 55,-24.0 q-15,-24.0 -55,-24.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="166" cy="240" r="2.6" fill="currentColor"/>
  <polyline points="166,240 486,240 486,279.5 504.1666666666667,279.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,250 h14 a13.0,13.0 0 0 1 0,26 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="144" cy="258" r="2.6" fill="currentColor"/>
  <polyline points="144,258 300,258" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="122" cy="268" r="2.6" fill="currentColor"/>
  <polyline points="122,268 300,268" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="327.0,263.0 479,263.0 479,289.5 507.03125,289.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,284 h14 a18.0,18.0 0 0 1 0,36 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="144" cy="292" r="2.6" fill="currentColor"/>
  <polyline points="144,292 300,292" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="302" r="2.6" fill="currentColor"/>
  <polyline points="100,302 300,302" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="78" cy="312" r="2.6" fill="currentColor"/>
  <polyline points="78,312 300,312" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="332.0,302.0 479,302.0 479,299.5 507.2916666666667,299.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,328 h14 a23.0,23.0 0 0 1 0,46 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="144" cy="336" r="2.6" fill="currentColor"/>
  <polyline points="144,336 300,336" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="346" r="2.6" fill="currentColor"/>
  <polyline points="100,346 300,346" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="56" cy="356" r="2.6" fill="currentColor"/>
  <polyline points="56,356 300,356" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="34" cy="366" r="2.6" fill="currentColor"/>
  <polyline points="34,366 300,366" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="337.0,351.0 486,351.0 486,309.5 504.9479166666667,309.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="555,295.5 590,295.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="598" y="300.5" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">C₃</text>
  <path d="M500,466.0 q15,29.0 0,58 q40,0 55,-29.0 q-15,-29.0 -55,-29.0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="210" cy="410" r="2.6" fill="currentColor"/>
  <polyline points="210,410 486,410 486,474.0 503.56718192627824,474.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,420 h14 a13.0,13.0 0 0 1 0,26 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="188" cy="428" r="2.6" fill="currentColor"/>
  <polyline points="188,428 300,428" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="166" cy="438" r="2.6" fill="currentColor"/>
  <polyline points="166,438 300,438" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="327.0,433.0 479,433.0 479,484.0 506.4209274673008,484.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,454 h14 a18.0,18.0 0 0 1 0,36 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="188" cy="462" r="2.6" fill="currentColor"/>
  <polyline points="188,462 300,462" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="144" cy="472" r="2.6" fill="currentColor"/>
  <polyline points="144,472 300,472" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="122" cy="482" r="2.6" fill="currentColor"/>
  <polyline points="122,482 300,482" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="332.0,472.0 472,472.0 472,494.0 507.4910820451843,494.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,498 h14 a23.0,23.0 0 0 1 0,46 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="188" cy="506" r="2.6" fill="currentColor"/>
  <polyline points="188,506 300,506" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="144" cy="516" r="2.6" fill="currentColor"/>
  <polyline points="144,516 300,516" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="526" r="2.6" fill="currentColor"/>
  <polyline points="100,526 300,526" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="78" cy="536" r="2.6" fill="currentColor"/>
  <polyline points="78,536 300,536" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="337.0,521.0 479,521.0 479,504.0 506.7776456599287,504.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,552 h14 a28.0,28.0 0 0 1 0,56 h-14 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="188" cy="560" r="2.6" fill="currentColor"/>
  <polyline points="188,560 300,560" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="144" cy="570" r="2.6" fill="currentColor"/>
  <polyline points="144,570 300,570" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="100" cy="580" r="2.6" fill="currentColor"/>
  <polyline points="100,580 300,580" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="56" cy="590" r="2.6" fill="currentColor"/>
  <polyline points="56,590 300,590" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="34" cy="600" r="2.6" fill="currentColor"/>
  <polyline points="34,600 300,600" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="342.0,580.0 486,580.0 486,514.0 504.2806183115339,514.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="555,495.0 590,495.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="598" y="500.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">C₄</text>
</svg>
<figcaption>The 4-bit carry lookahead unit: one AND gate per product term and one OR gate per carry. Every carry is ready after the same two gate levels, but the gates get wider for higher bits ($C_4$ needs a 5-input OR and a 5-input AND), which is why lookahead is usually built in blocks of 4 bits.</figcaption>
</figure>

<div class="example">

A 4-bit carry-lookahead adder is built from AND, OR, NOT, NAND and NOR gates, implemented as two-level AND–OR logic. All inputs are also available in complemented form, and each gate has unit delay. What is the overall propagation delay?

</div>

<figure class="fig">
<svg viewBox="0 0 640 182" width="640" role="img" aria-label="Carry lookahead adder stages and gate levels">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="18" y="70" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">aᵢ</text>
  <text x="18" y="100" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">bᵢ</text>
  <polyline points="30,65 60,65" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="30,95 60,95" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="60" y="40" width="150" height="80" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135.0" y="76.0" text-anchor="middle" font-size="14" fill="currentColor">Pᵢ = aᵢ ⊕ bᵢ</text>
  <text x="135.0" y="94.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">Gᵢ = aᵢbᵢ</text>
  <rect x="260" y="40" width="160" height="80" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="340.0" y="76.0" text-anchor="middle" font-size="14" fill="currentColor">carry lookahead</text>
  <text x="340.0" y="94.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">Cᵢ from P, G, C₀</text>
  <rect x="470" y="40" width="120" height="80" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="530.0" y="85.0" text-anchor="middle" font-size="14" fill="currentColor">Sᵢ = Pᵢ ⊕ Cᵢ</text>
  <polyline points="210,80 260,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="235" y="72" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P, G</text>
  <polyline points="420,80 470,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="445" y="72" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Cᵢ</text>
  <polyline points="135,40 135,20 530,20 530,40" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="330" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Pᵢ</text>
  <polyline points="300,145 300,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="308" y="143" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">C₀</text>
  <path d="M60,152 v6 H210 v-6" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".6"/>
  <text x="135.0" y="174" text-anchor="middle" font-size="12" fill="currentColor" class="dim">levels 1–2</text>
  <path d="M260,152 v6 H420 v-6" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".6"/>
  <text x="340.0" y="174" text-anchor="middle" font-size="12" fill="currentColor" class="dim">levels 3–4</text>
  <path d="M470,152 v6 H590 v-6" stroke="currentColor" stroke-width="1.5" fill="none" opacity=".6"/>
  <text x="530.0" y="174" text-anchor="middle" font-size="12" fill="currentColor" class="dim">levels 5–6</text>
</svg>
<figcaption>Carry-lookahead adder: three stages, each two gate levels deep.</figcaption>
</figure>

- $G_i = a_i b_i$ takes 1 level, and $P_i = a_i \oplus b_i = a_i \bar b_i + \bar a_i b_i$ takes 2 levels (complemented inputs are available).
- The carries $C_i$ are two-level AND–OR of $P$, $G$, $C_0$: 2 more levels.
- $S_i = P_i \oplus C_i$ is another two-level XOR: 2 more levels.

$$\text{Delay} = 2 + 2 + 2 = 6 \text{ unit delays}$$

**Try it.** Compare the two adders on the same inputs. With the worst-case preset, the ripple-carry adder shows wrong sums until the carry has rippled through every stage (dashed means not settled yet). The lookahead adder settles at $t = 6$ for any $n$. Its view shows the three stages: $P_i, G_i$ are ready at $t = 2$, all carries at $t = 4$ and all sums at $t = 6$.

{{< fullscreen-iframe id="adder-timing" src="/interactive/adder_timing.html" height="700" title="Ripple-carry vs carry-lookahead timing" >}}

### Adder/Subtractor

For $A - B$ we can add $A$ and $-B$, and in two's complement $-B = \bar B + 1$. Each $B_i$ goes through an XOR with a control bit $K$: $B_i \oplus 0 = B_i$ and $B_i \oplus 1 = \bar B_i$. Feeding $K$ in as $C_0$ supplies the $+1$.

<figure class="fig">
<svg viewBox="0 0 660 245" width="660" role="img" aria-label="4-bit adder/subtractor with overflow detection">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <polyline points="640,45 100,45" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="648" y="50" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">K</text>
  <polyline points="630,45 630,140 580,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="630" cy="45" r="2.6" fill="currentColor"/>
  <text x="612" y="158" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₀ = K</text>
  <rect x="80" y="115" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="120.0" y="145.0" text-anchor="middle" font-size="14" fill="currentColor">FA</text>
  <polyline points="100,20 100,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="100" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₃</text>
  <text x="138" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₃</text>
  <polyline points="138,20 138,76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="138" cy="85" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M129,85 h18 M138,76 v18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="154,45 154,85 147,85" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="154" cy="45" r="2.6" fill="currentColor"/>
  <polyline points="138,94 138,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="120,165 120,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="120" y="205" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₃</text>
  <rect x="220" y="115" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="260.0" y="145.0" text-anchor="middle" font-size="14" fill="currentColor">FA</text>
  <polyline points="240,20 240,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="240" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₂</text>
  <text x="278" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₂</text>
  <polyline points="278,20 278,76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="278" cy="85" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M269,85 h18 M278,76 v18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="294,45 294,85 287,85" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="294" cy="45" r="2.6" fill="currentColor"/>
  <polyline points="278,94 278,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="260,165 260,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="260" y="205" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₂</text>
  <rect x="360" y="115" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="400.0" y="145.0" text-anchor="middle" font-size="14" fill="currentColor">FA</text>
  <polyline points="380,20 380,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="380" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₁</text>
  <text x="418" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₁</text>
  <polyline points="418,20 418,76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="418" cy="85" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M409,85 h18 M418,76 v18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="434,45 434,85 427,85" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="434" cy="45" r="2.6" fill="currentColor"/>
  <polyline points="418,94 418,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="400,165 400,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="400" y="205" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₁</text>
  <rect x="500" y="115" width="80" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540.0" y="145.0" text-anchor="middle" font-size="14" fill="currentColor">FA</text>
  <polyline points="520,20 520,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="520" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₀</text>
  <text x="558" y="15" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">B₀</text>
  <polyline points="558,20 558,76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="558" cy="85" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M549,85 h18 M558,76 v18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="574,45 574,85 567,85" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="574" cy="45" r="2.6" fill="currentColor"/>
  <polyline points="558,94 558,115" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="540,165 540,190" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="540" y="205" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">S₀</text>
  <polyline points="220,140 160,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="190" y="132" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₃</text>
  <polyline points="360,140 300,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="330" y="132" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₂</text>
  <polyline points="500,140 440,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="470" y="132" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₁</text>
  <polyline points="80,140 35,140 35,191" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="52" y="132" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">C₄</text>
  <polyline points="180,140 180,215 44,215" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="180" cy="140" r="2.6" fill="currentColor"/>
  <circle cx="35" cy="200" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M26,200 h18 M35,191 v18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="35,209 35,228" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="48" y="233" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">overflow = C₃ ⊕ C₄</text>
</svg>
<figcaption>4-bit adder/subtractor. $K = 0$ computes $A + B$, $K = 1$ computes $A - B$; overflow is $C_3 \oplus C_4$.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 560 300" width="560" role="img" aria-label="4 by 4 array multiplier">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="300" y="20" width="170" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="36.0" text-anchor="middle" font-size="14" fill="currentColor">a · b₀</text>
  <text x="385.0" y="54.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4 AND gates</text>
  <rect x="40" y="90" width="170" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="125.0" y="106.0" text-anchor="middle" font-size="14" fill="currentColor">a · b₁</text>
  <text x="125.0" y="124.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4 AND gates</text>
  <rect x="300" y="90" width="170" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="115.0" text-anchor="middle" font-size="14" fill="currentColor">4-bit adder</text>
  <polyline points="210,110 300,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="385,60 385,90" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="392" y="78" text-anchor="start" font-size="11" fill="currentColor" class="dim">upper 3 bits + carry</text>
  <rect x="40" y="160" width="170" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="125.0" y="176.0" text-anchor="middle" font-size="14" fill="currentColor">a · b₂</text>
  <text x="125.0" y="194.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4 AND gates</text>
  <rect x="300" y="160" width="170" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="185.0" text-anchor="middle" font-size="14" fill="currentColor">4-bit adder</text>
  <polyline points="210,180 300,180" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="385,130 385,160" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="392" y="148" text-anchor="start" font-size="11" fill="currentColor" class="dim">upper 3 bits + carry</text>
  <rect x="40" y="230" width="170" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="125.0" y="246.0" text-anchor="middle" font-size="14" fill="currentColor">a · b₃</text>
  <text x="125.0" y="264.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4 AND gates</text>
  <rect x="300" y="230" width="170" height="40" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="255.0" text-anchor="middle" font-size="14" fill="currentColor">4-bit adder</text>
  <polyline points="210,250 300,250" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="385,200 385,230" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="392" y="218" text-anchor="start" font-size="11" fill="currentColor" class="dim">upper 3 bits + carry</text>
  <polyline points="470,40 520,40" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="528" y="45" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">m₀</text>
  <polyline points="470,110 520,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="528" y="115" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">m₁</text>
  <polyline points="470,180 520,180" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="528" y="185" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">m₂</text>
  <polyline points="385,270 385,292" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="395" y="290" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">m₃ … m₇</text>
  <text x="125" y="60" text-anchor="middle" font-size="12" fill="currentColor" class="dim">a = a₃a₂a₁a₀</text>
</svg>
<figcaption>4 × 4 array multiplier: 16 AND gates and three 4-bit adders, i.e. $O(n^2)$ gates.</figcaption>
</figure>

Gate by gate, the same circuit looks like this (after Mano, Fig. 4.16 [[1]](#ref-1)):

<figure class="fig">
<svg viewBox="0 0 650 565" width="650" role="img" aria-label="Gate-level 4 by 4 array multiplier: four rows of AND gates and three 4-bit adders">
  <polyline points="20,40 616,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="12" y="44" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">b₀</text>
  <path d="M508,62 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="526,40 526,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="526" cy="40" r="2.4" fill="currentColor"/>
  <polyline points="514,48 514,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="511" y="57" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₃</text>
  <polyline points="520,86 520,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M538,62 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="556,40 556,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="556" cy="40" r="2.4" fill="currentColor"/>
  <polyline points="544,48 544,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="541" y="57" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₂</text>
  <polyline points="550,86 550,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M568,62 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="586,40 586,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="586" cy="40" r="2.4" fill="currentColor"/>
  <polyline points="574,48 574,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="571" y="57" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₁</text>
  <polyline points="580,86 580,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M598,62 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="616,40 616,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="616" cy="40" r="2.4" fill="currentColor"/>
  <polyline points="604,48 604,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="601" y="57" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₀</text>
  <polyline points="610,86 610,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="490,152 490,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="490" y="148" text-anchor="middle" font-size="11" fill="currentColor">0</text>
  <rect x="330" y="170" width="265" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="395" y="184" text-anchor="middle" font-size="10" fill="currentColor" class="dim">addend</text>
  <text x="535" y="184" text-anchor="middle" font-size="10" fill="currentColor" class="dim">augend</text>
  <text x="462" y="206" text-anchor="middle" font-size="12" fill="currentColor">4-bit adder</text>
  <polyline points="20,110 446,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="12" y="114" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">b₁</text>
  <path d="M338,132 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="356,110 356,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="356" cy="110" r="2.4" fill="currentColor"/>
  <polyline points="344,118 344,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="341" y="127" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₃</text>
  <polyline points="350,156 350,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M368,132 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="386,110 386,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="386" cy="110" r="2.4" fill="currentColor"/>
  <polyline points="374,118 374,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="371" y="127" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₂</text>
  <polyline points="380,156 380,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M398,132 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="416,110 416,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="416" cy="110" r="2.4" fill="currentColor"/>
  <polyline points="404,118 404,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="401" y="127" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₁</text>
  <polyline points="410,156 410,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M428,132 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="446,110 446,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="446" cy="110" r="2.4" fill="currentColor"/>
  <polyline points="434,118 434,132" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="431" y="127" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₀</text>
  <polyline points="440,156 440,170" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="410,220 410,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="440,220 440,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="470,220 470,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="500,220 500,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="530,220 530,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="250" y="310" width="265" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="315" y="324" text-anchor="middle" font-size="10" fill="currentColor" class="dim">addend</text>
  <text x="455" y="324" text-anchor="middle" font-size="10" fill="currentColor" class="dim">augend</text>
  <text x="382" y="346" text-anchor="middle" font-size="12" fill="currentColor">4-bit adder</text>
  <polyline points="20,250 366,250" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="12" y="254" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">b₂</text>
  <path d="M258,272 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="276,250 276,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="276" cy="250" r="2.4" fill="currentColor"/>
  <polyline points="264,258 264,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="261" y="267" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₃</text>
  <polyline points="270,296 270,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M288,272 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="306,250 306,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="306" cy="250" r="2.4" fill="currentColor"/>
  <polyline points="294,258 294,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="291" y="267" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₂</text>
  <polyline points="300,296 300,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M318,272 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="336,250 336,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="336" cy="250" r="2.4" fill="currentColor"/>
  <polyline points="324,258 324,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="321" y="267" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₁</text>
  <polyline points="330,296 330,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M348,272 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="366,250 366,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="366" cy="250" r="2.4" fill="currentColor"/>
  <polyline points="354,258 354,272" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="351" y="267" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₀</text>
  <polyline points="360,296 360,310" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="330,360 330,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="360,360 360,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="390,360 390,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="420,360 420,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="450,360 450,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="170" y="450" width="265" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="235" y="464" text-anchor="middle" font-size="10" fill="currentColor" class="dim">addend</text>
  <text x="375" y="464" text-anchor="middle" font-size="10" fill="currentColor" class="dim">augend</text>
  <text x="302" y="486" text-anchor="middle" font-size="12" fill="currentColor">4-bit adder</text>
  <polyline points="20,390 286,390" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="12" y="394" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">b₃</text>
  <path d="M178,412 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="196,390 196,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="196" cy="390" r="2.4" fill="currentColor"/>
  <polyline points="184,398 184,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="181" y="407" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₃</text>
  <polyline points="190,436 190,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M208,412 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="226,390 226,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="226" cy="390" r="2.4" fill="currentColor"/>
  <polyline points="214,398 214,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="211" y="407" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₂</text>
  <polyline points="220,436 220,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M238,412 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="256,390 256,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="256" cy="390" r="2.4" fill="currentColor"/>
  <polyline points="244,398 244,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="241" y="407" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₁</text>
  <polyline points="250,436 250,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M268,412 h24 v12 a12,12 0 0 1 -24,0 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="286,390 286,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="286" cy="390" r="2.4" fill="currentColor"/>
  <polyline points="274,398 274,412" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="271" y="407" text-anchor="end" font-size="10" fill="currentColor" font-style="italic" class="dim">a₀</text>
  <polyline points="280,436 280,450" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="250,500 250,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="280,500 280,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="310,500 310,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="340,500 340,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="370,500 370,540" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="250" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₇</text>
  <text x="280" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₆</text>
  <text x="310" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₅</text>
  <text x="340" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₄</text>
  <text x="370" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₃</text>
  <text x="450" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₂</text>
  <text x="530" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₁</text>
  <text x="610" y="556" text-anchor="middle" font-size="13" fill="currentColor" font-style="italic">m₀</text>
</svg>
<figcaption>The 4 × 4 array multiplier in full. Row $j$ ANDs $b_j$ with every bit of $a$. Each adder adds that row to the upper three bits and the carry of the sum above it, and its lowest sum bit drops out as a product bit. The top augend bit of the first adder is 0.</figcaption>
</figure>

### Booth's Algorithm

With the basic method, $01011101 \times 00111110$ needs one addition for each of the five 1s in the multiplier. If shifts are faster than additions, this is slow. Booth's idea is to rewrite a run of 1s as a difference:

$$00111110 = 01000000 - 00000010$$

so $01011101 \times 00111110 = 01011101 \times (01000000 - 00000010)$ needs only **one addition and one subtraction** (adding the two's complement), plus shifts.

<div class="definition">

*Booth encoding.* Scan the multiplier from right to left with an extra 0 appended to the right of the LSB. Each digit is (bit on the right) $-$ (current bit):

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

Instead of giving the exponent its own sign bit (which would allow both $+0$ and $-0$ as exponents), the stored 8-bit value $E$ stands for the exponent $E - 127$. The two extreme values are reserved for special numbers:

<figure class="fig">
<svg viewBox="0 0 580 118" width="580" role="img" aria-label="Meaning of the 8-bit biased exponent">
  <g fill="currentColor" font-size="12"><text x="14" y="22" text-anchor="end" font-style="italic">E</text><text x="14" y="70" text-anchor="end" font-style="italic">E−127</text></g>
  <rect x="20" y="30" width="50" height="26" fill="#f59e0b" fill-opacity=".18" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="45.0" y="22" text-anchor="middle" font-size="13" fill="currentColor">0</text>
  <text x="45.0" y="74" text-anchor="middle" font-size="13" fill="#f59e0b">zero /<tspan x='45.0' dy='14'>subnormal</tspan></text>
  <rect x="70" y="30" width="200" height="26" fill="#3b82f6" fill-opacity=".18" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="170.0" y="22" text-anchor="middle" font-size="13" fill="currentColor">1 … 126</text>
  <text x="170.0" y="74" text-anchor="middle" font-size="13" fill="#3b82f6">−126 … −1</text>
  <rect x="270" y="30" width="40" height="26" fill="#a855f7" fill-opacity=".18" stroke="#a855f7" stroke-width="1.5"/>
  <text x="290.0" y="22" text-anchor="middle" font-size="13" fill="currentColor">127</text>
  <text x="290.0" y="74" text-anchor="middle" font-size="13" fill="#a855f7">0</text>
  <rect x="310" y="30" width="200" height="26" fill="#22c55e" fill-opacity=".18" stroke="#22c55e" stroke-width="1.5"/>
  <text x="410.0" y="22" text-anchor="middle" font-size="13" fill="currentColor">128 … 254</text>
  <text x="410.0" y="74" text-anchor="middle" font-size="13" fill="#22c55e">+1 … +127</text>
  <rect x="510" y="30" width="50" height="26" fill="#ef4444" fill-opacity=".18" stroke="#ef4444" stroke-width="1.5"/>
  <text x="535.0" y="22" text-anchor="middle" font-size="13" fill="currentColor">255</text>
  <text x="535.0" y="74" text-anchor="middle" font-size="13" fill="#ef4444">∞ / NaN</text>
  <text x="290" y="112" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7" font-style="italic">stored exponent E (top) and the power of 2 it means (bottom); segment widths not to scale</text>
</svg>
<figcaption>What each stored exponent value means. Normal numbers use $E = 1 \ldots 254$, i.e. exponents $-126 \ldots +127$.</figcaption>
</figure>

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

The reserved exponents $E = 0$ and $E = 255$ encode zero, infinity and NaN:

<figure class="fig">
{{< bits bits="0 00000000 00000000000000000000000" name="+0" >}}
{{< bits bits="1 00000000 00000000000000000000000" name="−0" >}}
{{< bits bits="0 11111111 00000000000000000000000" name="+∞" >}}
{{< bits bits="1 11111111 00000000000000000000000" name="−∞" >}}
{{< bits bits="x 11111111 1xxxxxxxxxxxxxxxxxxxxxx" name="QNaN" >}}
{{< bits bits="x 11111111 0xxxxxxxxxxxxxxxxxxxxxx" name="SNaN" >}}
<figcaption>Special values ($x$ = any bit; for SNaN the significand must not be all 0s, or it would be $\infty$).</figcaption>
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

<figure class="fig">
<svg viewBox="0 0 600 150" width="600" role="img" aria-label="Spacing of values in a toy floating-point format">
  <rect x="526.2" y="62" width="60.8" height="20" fill="#ef4444" fill-opacity=".15"/>
  <text x="557.3" y="57" text-anchor="middle" font-size="12" fill="#ef4444">overflow</text>
  <line x1="20" y1="72" x2="587.0" y2="72" stroke="currentColor" stroke-width="1.2"/>
  <line x1="20" y1="60" x2="20" y2="84" stroke="currentColor" stroke-width="2"/>
  <line x1="24.2" y1="64" x2="24.2" y2="80" stroke="#f59e0b" stroke-width="1.6"/>
  <line x1="28.4" y1="64" x2="28.4" y2="80" stroke="#f59e0b" stroke-width="1.6"/>
  <line x1="32.7" y1="64" x2="32.7" y2="80" stroke="#f59e0b" stroke-width="1.6"/>
  <line x1="36.9" y1="64" x2="36.9" y2="80" stroke="#f59e0b" stroke-width="1.6"/>
  <line x1="41.1" y1="64" x2="41.1" y2="80" stroke="#f59e0b" stroke-width="1.6"/>
  <line x1="45.3" y1="64" x2="45.3" y2="80" stroke="#f59e0b" stroke-width="1.6"/>
  <line x1="49.5" y1="64" x2="49.5" y2="80" stroke="#f59e0b" stroke-width="1.6"/>
  <line x1="53.8" y1="64" x2="53.8" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="58.0" y1="64" x2="58.0" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="62.2" y1="64" x2="62.2" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="66.4" y1="64" x2="66.4" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="70.6" y1="64" x2="70.6" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="74.8" y1="64" x2="74.8" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="79.1" y1="64" x2="79.1" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="83.3" y1="64" x2="83.3" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="87.5" y1="64" x2="87.5" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="95.9" y1="64" x2="95.9" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="104.4" y1="64" x2="104.4" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="112.8" y1="64" x2="112.8" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="121.2" y1="64" x2="121.2" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="129.7" y1="64" x2="129.7" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="138.1" y1="64" x2="138.1" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="146.6" y1="64" x2="146.6" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="155.0" y1="64" x2="155.0" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="171.9" y1="64" x2="171.9" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="188.8" y1="64" x2="188.8" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="205.6" y1="64" x2="205.6" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="222.5" y1="64" x2="222.5" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="239.4" y1="64" x2="239.4" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="256.2" y1="64" x2="256.2" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="273.1" y1="64" x2="273.1" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="290.0" y1="64" x2="290.0" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="323.8" y1="64" x2="323.8" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="357.5" y1="64" x2="357.5" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="391.2" y1="64" x2="391.2" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="425.0" y1="64" x2="425.0" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="458.8" y1="64" x2="458.8" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="492.5" y1="64" x2="492.5" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <line x1="526.2" y1="64" x2="526.2" y2="80" stroke="#3b82f6" stroke-width="1.6"/>
  <text x="20.0" y="100" text-anchor="middle" font-size="13" fill="currentColor">0</text>
  <text x="53.8" y="100" text-anchor="middle" font-size="13" fill="currentColor">¼</text>
  <text x="87.5" y="100" text-anchor="middle" font-size="13" fill="currentColor">½</text>
  <text x="155.0" y="100" text-anchor="middle" font-size="13" fill="currentColor">1</text>
  <text x="290.0" y="100" text-anchor="middle" font-size="13" fill="currentColor">2</text>
  <text x="526.2" y="100" text-anchor="middle" font-size="13" fill="currentColor">3.75</text>
  <path d="M21.0,52 v-6 H52.8 v6" fill="none" stroke="#f59e0b" stroke-width="1.2"/>
  <polyline points="36.9,46 36.9,24" fill="none" stroke="#f59e0b" stroke-width="1"/>
  <text x="6" y="18" text-anchor="start" font-size="12" fill="#f59e0b">subnormals, gap 1/32</text>
  <path d="M54.8,52 v-6 H86.5 v6" fill="none" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="70.6" y="38" text-anchor="middle" font-size="12" fill="#3b82f6">gap 1/32</text>
  <path d="M88.5,52 v-6 H154.0 v6" fill="none" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="121.2" y="38" text-anchor="middle" font-size="12" fill="#3b82f6">gap 1/16</text>
  <path d="M156.0,52 v-6 H289.0 v6" fill="none" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="222.5" y="38" text-anchor="middle" font-size="12" fill="#3b82f6">gap 1/8</text>
  <path d="M291.0,52 v-6 H525.2 v6" fill="none" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="408.1" y="38" text-anchor="middle" font-size="12" fill="#3b82f6">gap 1/4</text>
  <text x="53.8" y="122" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">smallest normal</text>
  <text x="526.2" y="122" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">largest</text>
  <text x="300" y="144" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7" font-style="italic">toy format: 3 fraction bits, exponents −2 … 1 (positive half only)</text>
</svg>
<figcaption>Representable values in a toy format. Inside each power-of-2 interval (a *binade*) the values are evenly spaced, and the gap doubles from one binade to the next. The subnormals (amber) fill $[0, \tfrac14)$ with the same spacing as the first binade.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 420 90" width="420" role="img" aria-label="16-bit floating point layout">
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="10" y="28" width="30" height="32"/><rect x="40" y="28" width="170" height="32"/><rect x="210" y="28" width="200" height="32"/>
  </g>
  <g fill="currentColor" font-size="14">
    <text x="25" y="20" text-anchor="middle" font-size="11">15</text>
    <text x="44" y="20" font-size="11">14</text><text x="206" y="20" text-anchor="end" font-size="11">9</text>
    <text x="214" y="20" font-size="11">8</text><text x="406" y="20" text-anchor="end" font-size="11">0</text>
    <text x="25" y="49" text-anchor="middle" font-style="italic">s</text>
    <text x="125" y="49" text-anchor="middle" font-style="italic">e</text>
    <text x="310" y="49" text-anchor="middle" font-style="italic">m</text>
    <text x="25" y="80" text-anchor="middle" font-size="12">1 bit</text>
    <text x="125" y="80" text-anchor="middle" font-size="12">6 bits</text>
    <text x="310" y="80" text-anchor="middle" font-size="12">9 bits</text>
  </g>
</svg>
<figcaption>A 16-bit floating-point format.</figcaption>
</figure>

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

The simplest storage element is two NAND gates, each feeding its output back into the other:

<figure class="fig">
<svg viewBox="0 0 320 175" width="320" role="img" aria-label="SR latch from two cross-coupled NAND gates">
  <path d="M150,20 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="194.0" cy="40.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M150,110 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="194.0" cy="130.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="198.0,40.0 280,40.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="288" y="45.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q</text>
  <polyline points="198.0,130.0 280,130.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="288" y="135.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q̄</text>
  <circle cx="212.0" cy="40.0" r="2.6" fill="currentColor"/>
  <circle cx="222.0" cy="130.0" r="2.6" fill="currentColor"/>
  <polyline points="212.0,40.0 212.0,70.0 135,103.33333333333333 135,123.33333333333333 150,123.33333333333333" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="222.0,130.0 222.0,100.0 128,66.66666666666667 128,46.66666666666667 150,46.66666666666667" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="38.333333333333336" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">S̄</text>
  <polyline points="30,33.333333333333336 150,33.333333333333336" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="141.66666666666666" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">R̄</text>
  <polyline points="30,136.66666666666666 150,136.66666666666666" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>SR latch from two cross-coupled NAND gates. Its inputs are active-low.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 470 175" width="470" role="img" aria-label="Clocked SR latch from NAND gates">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <path d="M150,20 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="194.0" cy="40.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M150,110 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="194.0" cy="130.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,20 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="344.0" cy="40.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,110 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="344.0" cy="130.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="348.0,40.0 430,40.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="438" y="45.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q</text>
  <polyline points="348.0,130.0 430,130.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="438" y="135.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q̄</text>
  <circle cx="362.0" cy="40.0" r="2.6" fill="currentColor"/>
  <circle cx="372.0" cy="130.0" r="2.6" fill="currentColor"/>
  <polyline points="362.0,40.0 362.0,70.0 285,103.33333333333333 285,123.33333333333333 300,123.33333333333333" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="372.0,130.0 372.0,100.0 278,66.66666666666667 278,46.66666666666667 300,46.66666666666667" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="38.333333333333336" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">S</text>
  <polyline points="26,33.333333333333336 150,33.333333333333336" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="141.66666666666666" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">R</text>
  <polyline points="26,136.66666666666666 150,136.66666666666666" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="18" y="90" text-anchor="middle" font-size="12" fill="currentColor">CLK</text>
  <polyline points="36,85 115,85" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="115" cy="85" r="2.6" fill="currentColor"/>
  <polyline points="115,46.66666666666667 115,123.33333333333333" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="115,46.66666666666667 150,46.66666666666667" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="115,123.33333333333333 150,123.33333333333333" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="198.0,40.0 255,40.0 255,33.333333333333336 300,33.333333333333336" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="198.0,130.0 255,130.0 255,136.66666666666666 300,136.66666666666666" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>Clocked SR latch. With CLK = 1: $S = 1$ sets $Q = 1$, $R = 1$ resets $Q = 0$, and $S = R = 0$ holds.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 470 175" width="470" role="img" aria-label="Gated D latch from NAND gates">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <path d="M150,20 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="194.0" cy="40.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M150,110 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="194.0" cy="130.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,20 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="344.0" cy="40.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,110 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="344.0" cy="130.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="348.0,40.0 430,40.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="438" y="45.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q</text>
  <polyline points="348.0,130.0 430,130.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="438" y="135.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q̄</text>
  <circle cx="362.0" cy="40.0" r="2.6" fill="currentColor"/>
  <circle cx="372.0" cy="130.0" r="2.6" fill="currentColor"/>
  <polyline points="362.0,40.0 362.0,70.0 285,103.33333333333333 285,123.33333333333333 300,123.33333333333333" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="372.0,130.0 372.0,100.0 278,66.66666666666667 278,46.66666666666667 300,46.66666666666667" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="38.333333333333336" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">D</text>
  <polyline points="26,33.333333333333336 150,33.333333333333336" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="60" cy="33.333333333333336" r="2.6" fill="currentColor"/>
  <polyline points="60,33.333333333333336 60,136.66666666666666 80,136.66666666666666" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M80,127.66666666666666 L98,136.66666666666666 L80,145.66666666666666 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="102" cy="136.66666666666666" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="106,136.66666666666666 150,136.66666666666666" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="90" text-anchor="middle" font-size="12" fill="currentColor">EN</text>
  <polyline points="32,85 115,85" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="115" cy="85" r="2.6" fill="currentColor"/>
  <polyline points="115,46.66666666666667 115,123.33333333333333" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="115,46.66666666666667 150,46.66666666666667" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="115,123.33333333333333 150,123.33333333333333" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="198.0,40.0 255,40.0 255,33.333333333333336 300,33.333333333333336" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="198.0,130.0 255,130.0 255,136.66666666666666 300,136.66666666666666" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>Gated D latch: two input NANDs steer $D$ and $\bar D$ into a cross-coupled NAND latch.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 480 200" width="480" role="img" aria-label="JK latch: clocked SR latch with feedback from Q and Q-bar">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <path d="M150,14 h20 a30.0,30.0 0 0 1 0,60 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="204.0" cy="44.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M150,120 h20 a30.0,30.0 0 0 1 0,60 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="204.0" cy="150.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,24 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="344.0" cy="44.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M300,130 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="344.0" cy="150.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="348.0,44.0 440,44.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="448" y="49.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q</text>
  <polyline points="348.0,150.0 440,150.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="448" y="155.0" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q̄</text>
  <circle cx="362.0" cy="44.0" r="2.6" fill="currentColor"/>
  <circle cx="372.0" cy="150.0" r="2.6" fill="currentColor"/>
  <polyline points="362.0,44.0 362.0,74.0 285,123.33333333333334 285,143.33333333333334 300,143.33333333333334" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="372.0,150.0 372.0,120.0 278,70.66666666666667 278,50.66666666666667 300,50.66666666666667" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="49.0" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">J</text>
  <polyline points="26,44.0 150,44.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="155.0" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">K</text>
  <polyline points="26,150.0 150,150.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="18" y="102" text-anchor="middle" font-size="12" fill="currentColor">CLK</text>
  <polyline points="36,97 115,97" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="115" cy="97" r="2.6" fill="currentColor"/>
  <polyline points="115,59.0 115,135.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="115,59.0 150,59.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="115,135.0 150,135.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="208.0,44.0 255,44.0 255,37.333333333333336 300,37.333333333333336" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="208.0,150.0 255,150.0 255,156.66666666666666 300,156.66666666666666" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="410" cy="150.0" r="2.6" fill="currentColor"/>
  <polyline points="410,150.0 410,5 130,5 130,29.0 150,29.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="420" cy="44.0" r="2.6" fill="currentColor"/>
  <polyline points="420,44.0 420,194 130,194 130,165.0 150,165.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="272" y="16" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">Q̄</text>
  <text x="272" y="190" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">Q</text>
</svg>
<figcaption>JK latch: a clocked SR latch with $\bar Q$ fed back into the $J$ gate and $Q$ into the $K$ gate.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 600 104" width="600" role="img" aria-label="Race-around: Q toggles repeatedly while CLK is high">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="58" y="33.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">CLK</text>
  <polyline points="70.0,38 156.7,38 156.7,18 243.3,18 243.3,38 330.0,38 330.0,18 416.7,18 416.7,38 503.3,38 503.3,18 590.0,18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="67.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q</text>
  <polyline points="70.0,72 161.0,72 161.0,52 174.0,52 174.0,72 187.0,72 187.0,52 200.0,52 200.0,72 213.0,72 213.0,52 226.0,52 226.0,72 239.0,72 239.0,52 330.0,52 330.0,72 343.0,72 343.0,52 356.0,52 356.0,72 369.0,72 369.0,52 382.0,52 382.0,72 395.0,72 395.0,52 408.0,52 408.0,72 512.0,72 512.0,52 525.0,52 525.0,72 538.0,72 538.0,52 551.0,52 551.0,72 564.0,72 564.0,52 577.0,52 577.0,72 590.0,72" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="100" text-anchor="middle" font-size="11" fill="currentColor" class="dim">J = K = 1: while CLK = 1, Q keeps toggling after every gate delay</text>
</svg>
<figcaption>Race-around in a level-triggered JK latch.</figcaption>
</figure>

### Master–Slave JK Flip-Flop

We can make it edge-triggered by making it a *master–slave* JK flip-flop. The master is enabled while CLK = 1 and the slave while CLK = 0, and the feedback comes from the **slave**, which does not change while the master is listening.

<figure class="fig">
<svg viewBox="0 0 560 200" width="560" role="img" aria-label="Master-slave JK flip-flop">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="110" y="30" width="130" height="100" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="175.0" y="76.0" text-anchor="middle" font-size="14" fill="currentColor">Master</text>
  <text x="175.0" y="94.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">gated JK latch</text>
  <rect x="320" y="30" width="130" height="100" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="385.0" y="76.0" text-anchor="middle" font-size="14" fill="currentColor">Slave</text>
  <text x="385.0" y="94.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">gated SR latch</text>
  <text x="20" y="55" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">J</text>
  <polyline points="30,50 110,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="20" y="115" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">K</text>
  <polyline points="30,110 110,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="22" y="85" text-anchor="middle" font-size="12" fill="currentColor">CLK</text>
  <polyline points="42,80 110,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <circle cx="70" cy="80" r="2.6" fill="currentColor"/>
  <polyline points="70,80 70,160 150,160" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M150,151 L168,160 L150,169 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="172" cy="160" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="176,160 290,160 290,80 320,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="250" y="175" text-anchor="middle" font-size="11" fill="currentColor">CLK̄</text>
  <polyline points="240,50 320,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="280" y="44" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Qₘ</text>
  <polyline points="240,110 320,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="280" y="104" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q̄ₘ</text>
  <polyline points="450,50 530,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="538" y="55" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q</text>
  <polyline points="450,110 530,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="538" y="115" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Q̄</text>
  <circle cx="500" cy="110" r="2.6" fill="currentColor"/>
  <polyline points="500,110 500,10 175,10 175,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="190" y="22" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">Q̄</text>
  <circle cx="510" cy="50" r="2.6" fill="currentColor"/>
  <polyline points="510,50 510,192 175,192 175,130" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="190" y="188" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">Q</text>
</svg>
<figcaption>Master–slave JK flip-flop: the master is clocked by CLK, the slave by CLK̄, and the feedback comes from the slave's outputs.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 600 138" width="600" role="img" aria-label="Master-slave JK timing">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="210.5" y1="6" x2="210.5" y2="116" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="337.0" y1="6" x2="337.0" y2="116" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="463.5" y1="6" x2="463.5" y2="116" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <text x="72" y="33.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">CLK</text>
  <polyline points="84.0,38 147.2,38 147.2,18 210.5,18 210.5,38 273.8,38 273.8,18 337.0,18 337.0,38 400.2,38 400.2,18 463.5,18 463.5,38 526.8,38 526.8,18 590.0,18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72" y="67.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">master Q</text>
  <polyline points="84.0,72 147.2,72 147.2,52 273.8,52 273.8,72 400.2,72 400.2,52 526.8,52 526.8,72 590.0,72" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="72" y="101.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">slave Q</text>
  <polyline points="84.0,106 210.5,106 210.5,86 337.0,86 337.0,106 463.5,106 463.5,86 590.0,86" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="134" text-anchor="middle" font-size="11" fill="currentColor" class="dim">the master follows on CLK = 1, the slave copies it on the falling edge (dashed): negative-edge triggered</text>
</svg>
<figcaption>With $J = K = 1$ the output toggles exactly once per clock cycle.</figcaption>
</figure>

The output changes only when the clock falls, so it works like a **negative-edge-triggered** flip-flop.

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

<figure class="fig">
<svg viewBox="0 0 580 262" width="580" role="img" aria-label="Parallel-in parallel-out register with parallel load">
  <defs><marker id="arr-pipo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="110" y="10" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">I₃</text>
  <polyline points="110,14 110,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="100" y="50" width="44" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="110" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">1</text>
  <text x="134" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="122" y="79" text-anchor="middle" font-size="9" fill="currentColor">MUX</text>
  <polyline points="92,40 92,67 100,67" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="92" cy="40" r="2.6" fill="currentColor"/>
  <polyline points="122,84 122,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="100" y="110" width="70" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="122" y="125" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">D</text>
  <text x="164" y="129" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <path d="M100,144 L109,150 L100,156" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="135" y="166" text-anchor="middle" font-size="8" fill="currentColor" class="dim">CLR</text>
  <polyline points="92,200 92,150 100,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="92" cy="200" r="2.6" fill="currentColor"/>
  <polyline points="135,170 135,214" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="135" cy="214" r="2.6" fill="currentColor"/>
  <polyline points="170,124 186,124" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="186" cy="124" r="2.6" fill="currentColor"/>
  <polyline points="186,124 186,24 134,24 134,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <polyline points="186,124 186,238" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <text x="186" y="254" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q₃</text>
  <text x="230" y="10" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">I₂</text>
  <polyline points="230,14 230,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="220" y="50" width="44" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="230" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">1</text>
  <text x="254" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="242" y="79" text-anchor="middle" font-size="9" fill="currentColor">MUX</text>
  <polyline points="212,40 212,67 220,67" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="212" cy="40" r="2.6" fill="currentColor"/>
  <polyline points="242,84 242,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="220" y="110" width="70" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="242" y="125" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">D</text>
  <text x="284" y="129" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <path d="M220,144 L229,150 L220,156" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="255" y="166" text-anchor="middle" font-size="8" fill="currentColor" class="dim">CLR</text>
  <polyline points="212,200 212,150 220,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="212" cy="200" r="2.6" fill="currentColor"/>
  <polyline points="255,170 255,214" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="255" cy="214" r="2.6" fill="currentColor"/>
  <polyline points="290,124 306,124" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="306" cy="124" r="2.6" fill="currentColor"/>
  <polyline points="306,124 306,24 254,24 254,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <polyline points="306,124 306,238" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <text x="306" y="254" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q₂</text>
  <text x="350" y="10" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">I₁</text>
  <polyline points="350,14 350,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="340" y="50" width="44" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="350" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">1</text>
  <text x="374" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="362" y="79" text-anchor="middle" font-size="9" fill="currentColor">MUX</text>
  <polyline points="332,40 332,67 340,67" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="332" cy="40" r="2.6" fill="currentColor"/>
  <polyline points="362,84 362,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="340" y="110" width="70" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="362" y="125" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">D</text>
  <text x="404" y="129" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <path d="M340,144 L349,150 L340,156" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="375" y="166" text-anchor="middle" font-size="8" fill="currentColor" class="dim">CLR</text>
  <polyline points="332,200 332,150 340,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="332" cy="200" r="2.6" fill="currentColor"/>
  <polyline points="375,170 375,214" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="375" cy="214" r="2.6" fill="currentColor"/>
  <polyline points="410,124 426,124" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="426" cy="124" r="2.6" fill="currentColor"/>
  <polyline points="426,124 426,24 374,24 374,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <polyline points="426,124 426,238" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <text x="426" y="254" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q₁</text>
  <text x="470" y="10" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">I₀</text>
  <polyline points="470,14 470,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="460" y="50" width="44" height="34" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="470" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">1</text>
  <text x="494" y="62" text-anchor="middle" font-size="9" fill="currentColor" class="dim">0</text>
  <text x="482" y="79" text-anchor="middle" font-size="9" fill="currentColor">MUX</text>
  <polyline points="452,40 452,67 460,67" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="452" cy="40" r="2.6" fill="currentColor"/>
  <polyline points="482,84 482,110" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <rect x="460" y="110" width="70" height="60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="482" y="125" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">D</text>
  <text x="524" y="129" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <path d="M460,144 L469,150 L460,156" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="495" y="166" text-anchor="middle" font-size="8" fill="currentColor" class="dim">CLR</text>
  <polyline points="452,200 452,150 460,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="452" cy="200" r="2.6" fill="currentColor"/>
  <polyline points="495,170 495,214" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="495" cy="214" r="2.6" fill="currentColor"/>
  <polyline points="530,124 546,124" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="546" cy="124" r="2.6" fill="currentColor"/>
  <polyline points="546,124 546,24 494,24 494,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <polyline points="546,124 546,238" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-pipo)"/>
  <text x="546" y="254" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q₀</text>
  <text x="8" y="44" text-anchor="start" font-size="11" fill="currentColor">LOAD</text>
  <polyline points="52,40 452,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="8" y="204" text-anchor="start" font-size="11" fill="currentColor">CLK</text>
  <polyline points="52,200 452,200" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="8" y="218" text-anchor="start" font-size="11" fill="currentColor">CLEAR</text>
  <polyline points="52,214 495,214" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>Parallel-in parallel-out (PIPO) register with parallel load (after Mano [[1]](#ref-1)). With LOAD = 1 each multiplexer passes $I_j$, so all four bits are loaded on the clock edge; with LOAD = 0 it feeds $Q_j$ back, so the register holds. CLEAR resets every flip-flop to 0.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 560 130" width="560" role="img" aria-label="Serial-in serial-out shift register">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <polyline points="20,120 520,120" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="14" y="116" text-anchor="start" font-size="11" fill="currentColor">CLK</text>
  <text x="20" y="37" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">in</text>
  <polyline points="40,32 80,32" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="80" y="15" width="80" height="70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="88" y="37" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M80,44.0 L89,50.0 L80,56.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="152" y="37" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="152" y="77" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="124.0" y="55.0" text-anchor="middle" font-size="13" fill="currentColor"></text>
  <circle cx="65" cy="120" r="2.6" fill="currentColor"/>
  <polyline points="65,120 65,50.0 80,50.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="200" y="15" width="80" height="70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="208" y="37" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M200,44.0 L209,50.0 L200,56.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="272" y="37" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="272" y="77" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="244.0" y="55.0" text-anchor="middle" font-size="13" fill="currentColor"></text>
  <circle cx="185" cy="120" r="2.6" fill="currentColor"/>
  <polyline points="185,120 185,50.0 200,50.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="160,32 200,32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="320" y="15" width="80" height="70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="328" y="37" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M320,44.0 L329,50.0 L320,56.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="392" y="37" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="392" y="77" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="364.0" y="55.0" text-anchor="middle" font-size="13" fill="currentColor"></text>
  <circle cx="305" cy="120" r="2.6" fill="currentColor"/>
  <polyline points="305,120 305,50.0 320,50.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="280,32 320,32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <rect x="440" y="15" width="80" height="70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="448" y="37" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M440,44.0 L449,50.0 L440,56.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="512" y="37" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="512" y="77" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="484.0" y="55.0" text-anchor="middle" font-size="13" fill="currentColor"></text>
  <circle cx="425" cy="120" r="2.6" fill="currentColor"/>
  <polyline points="425,120 425,50.0 440,50.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="400,32 440,32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="520,32 550,32" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="540" y="24" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">out</text>
</svg>
<figcaption>Serial-in serial-out (SISO) shift register: one bit moves one place per clock.</figcaption>
</figure>

## Counters

### Ripple Counter

We can build counters from JK flip-flops with $J = K = 1$ (equivalently T flip-flops with $T = 1$), so each one toggles on every falling edge of its clock. In a *ripple counter* only the first flip-flop is driven by the clock; each later flip-flop is clocked by the output of the one before it.

<figure class="fig">
<svg viewBox="0 0 560 170" width="560" role="img" aria-label="3-bit ripple counter from JK flip-flops">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <polyline points="40,14 520,14" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30" y="19" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <polyline points="40,158 520,158" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="30" y="163" text-anchor="end" font-size="14" fill="currentColor">1</text>
  <rect x="80" y="45" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="88" y="67" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">J</text>
  <text x="88" y="113" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">K</text>
  <path d="M80,77.0 L89,83.0 L80,89.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="76" cy="83.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="156" y="67" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="156" y="113" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="126.0" y="88.0" text-anchor="middle" font-size="13" fill="currentColor">FFA</text>
  <circle cx="58" cy="14" r="2.6" fill="currentColor"/>
  <polyline points="58,14 58,62 80,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="50" cy="158" r="2.6" fill="currentColor"/>
  <polyline points="50,158 50,108 80,108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="14" y="88.0" text-anchor="start" font-size="12" fill="currentColor">CLK</text>
  <polyline points="46,83.0 40,83.0 40,83.0 72,83.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="164,62 182,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="174" y="56" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <rect x="250" y="45" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="258" y="67" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">J</text>
  <text x="258" y="113" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">K</text>
  <path d="M250,77.0 L259,83.0 L250,89.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="246" cy="83.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="326" y="67" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="326" y="113" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="296.0" y="88.0" text-anchor="middle" font-size="13" fill="currentColor">FFB</text>
  <circle cx="228" cy="14" r="2.6" fill="currentColor"/>
  <polyline points="228,14 228,62 250,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="220" cy="158" r="2.6" fill="currentColor"/>
  <polyline points="220,158 220,108 250,108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="182,62 200,62 200,83.0 242,83.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="334,62 352,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="344" y="56" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">B</tspan></text>
  <rect x="420" y="45" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="428" y="67" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">J</text>
  <text x="428" y="113" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">K</text>
  <path d="M420,77.0 L429,83.0 L420,89.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="416" cy="83.0" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="496" y="67" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="496" y="113" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="466.0" y="88.0" text-anchor="middle" font-size="13" fill="currentColor">FFC</text>
  <circle cx="398" cy="14" r="2.6" fill="currentColor"/>
  <polyline points="398,14 398,62 420,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="390" cy="158" r="2.6" fill="currentColor"/>
  <polyline points="390,158 390,108 420,108" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="352,62 370,62 370,83.0 412,83.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="504,62 522,62" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="514" y="56" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan></text>
</svg>
<figcaption>3-bit ripple counter (negative-edge-triggered JK flip-flops with $J = K = 1$).</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 600 192" width="600" role="img" aria-label="Ripple counter timing">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="100.6" y1="6" x2="100.6" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="161.8" y1="6" x2="161.8" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="222.9" y1="6" x2="222.9" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="284.1" y1="6" x2="284.1" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="345.3" y1="6" x2="345.3" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="406.5" y1="6" x2="406.5" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="467.6" y1="6" x2="467.6" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="528.8" y1="6" x2="528.8" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <text x="58" y="33.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">CLK</text>
  <polyline points="70.0,18 100.6,18 100.6,38 131.2,38 131.2,18 161.8,18 161.8,38 192.4,38 192.4,18 222.9,18 222.9,38 253.5,38 253.5,18 284.1,18 284.1,38 314.7,38 314.7,18 345.3,18 345.3,38 375.9,38 375.9,18 406.5,18 406.5,38 437.1,38 437.1,18 467.6,18 467.6,38 498.2,38 498.2,18 528.8,18 528.8,38 559.4,38 559.4,18 590.0,18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="67.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <polyline points="70.0,72 105.2,72 105.2,52 166.4,52 166.4,72 227.5,72 227.5,52 288.7,52 288.7,72 349.9,72 349.9,52 411.1,52 411.1,72 472.2,72 472.2,52 533.4,52 533.4,72 590.0,72" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="101.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">B</tspan></text>
  <polyline points="70.0,106 170.9,106 170.9,86 293.3,86 293.3,106 415.6,106 415.6,86 538.0,86 538.0,106 590.0,106" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="135.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan></text>
  <polyline points="70.0,140 297.9,140 297.9,120 542.6,120 542.6,140 590.0,140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="186" text-anchor="middle" font-size="11" fill="currentColor" class="dim">each flip-flop toggles on the falling edge of the one before it, a little later each time (the ripple)</text>
  <text x="58" y="162" text-anchor="end" font-size="11" fill="currentColor" class="dim" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan>Q<tspan baseline-shift="sub" font-size="75%">B</tspan>Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <text x="85.3" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="85.3" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="85.3" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="85.3" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">000</text>
  <text x="131.2" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="131.2" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="131.2" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="131.2" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">001</text>
  <text x="192.4" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="192.4" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="192.4" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="192.4" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">010</text>
  <text x="253.5" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="253.5" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="253.5" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="253.5" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">011</text>
  <text x="314.7" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="314.7" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="314.7" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="314.7" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">100</text>
  <text x="375.9" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="375.9" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="375.9" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="375.9" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">101</text>
  <text x="437.1" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="437.1" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="437.1" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="437.1" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">110</text>
  <text x="498.2" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="498.2" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="498.2" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="498.2" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">111</text>
  <text x="559.4" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="559.4" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="559.4" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="559.4" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">000</text>
</svg>
<figcaption>$Q_C Q_B Q_A$ counts $0 \to 1 \to 2 \to \cdots \to 7 \to 0$. Each stage toggles slightly after the stage before it, which is why it is called a ripple counter.</figcaption>
</figure>

### Mod-$n$ Counter by Resetting

We can stop this sequence early using extra logic. For $0 \to 1 \to 2 \to 3 \to 0$, clear every flip-flop as soon as the count reaches 4 $= Q_C Q_B Q_A = 100$:

<figure class="fig">
<svg viewBox="0 0 420 100" width="420" role="img" aria-label="Reset logic: clear all flip-flops when the count reaches 4">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <path d="M130,10 h20 a40.0,40.0 0 0 1 0,80 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="70,30.0 130,30.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="62" y="35.0" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan></text>
  <polyline points="70,50.0 130,50.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="62" y="55.0" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">Q̄<tspan baseline-shift="sub" font-size="75%">B</tspan></text>
  <polyline points="70,70.0 130,70.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="62" y="75.0" text-anchor="end" font-size="13" fill="currentColor" font-style="italic">Q̄ₐ</text>
  <polyline points="190.0,50.0 250,50.0" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="258" y="55.0" text-anchor="start" font-size="13" fill="currentColor">CLR of all flip-flops</text>
</svg>
<figcaption>Asynchronous reset: state 100 lasts only for an instant before everything is cleared to 000.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 560 330" width="560" role="img" aria-label="State diagram of the synchronous 0, 1, 3, 5 counter">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <ellipse cx="280" cy="150" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="280" y="155" text-anchor="middle" font-size="14" fill="currentColor">000</text>
  <ellipse cx="420" cy="215" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="420" y="220" text-anchor="middle" font-size="14" fill="currentColor">001</text>
  <ellipse cx="280" cy="285" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="280" y="290" text-anchor="middle" font-size="14" fill="currentColor">011</text>
  <ellipse cx="140" cy="215" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="140" y="220" text-anchor="middle" font-size="14" fill="currentColor">101</text>
  <ellipse cx="90" cy="70" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <text x="90" y="75" text-anchor="middle" font-size="14" fill="currentColor">111</text>
  <ellipse cx="210" cy="45" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <text x="210" y="50" text-anchor="middle" font-size="14" fill="currentColor">110</text>
  <ellipse cx="350" cy="45" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <text x="350" y="50" text-anchor="middle" font-size="14" fill="currentColor">100</text>
  <ellipse cx="470" cy="70" rx="38" ry="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>
  <text x="470" y="75" text-anchor="middle" font-size="14" fill="currentColor">010</text>
  <polyline points="308.5,163.2 388.8,200.5" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="392.5,228.8 310.2,269.9" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="252.5,271.2 170.2,230.1" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="168.5,201.8 248.8,164.5" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="119.7,82.5 247.6,136.3" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="222.6,63.9 265.8,128.6" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="337.4,63.9 294.2,128.6" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="440.3,82.5 312.4,136.3" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="280" y="325" text-anchor="middle" font-size="11" fill="currentColor" class="dim">dashed: unused states, sent to 000 so the counter can never get stuck</text>
</svg>
<figcaption>Self-correcting design: every unused state goes to 000 on the next clock.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 540 170" width="540" role="img" aria-label="3-bit ring counter from D flip-flops">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="70" y="40" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="78" y="62" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M70,72.0 L79,78.0 L70,84.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="146" y="62" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="146" y="108" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="116.0" y="83.0" text-anchor="middle" font-size="13" fill="currentColor">FFC</text>
  <rect x="230" y="40" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="238" y="62" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M230,72.0 L239,78.0 L230,84.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="306" y="62" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="306" y="108" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="276.0" y="83.0" text-anchor="middle" font-size="13" fill="currentColor">FFB</text>
  <rect x="390" y="40" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="398" y="62" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M390,72.0 L399,78.0 L390,84.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="466" y="62" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="466" y="108" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="436.0" y="83.0" text-anchor="middle" font-size="13" fill="currentColor">FFA</text>
  <polyline points="52,150 500,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="14" y="155" text-anchor="start" font-size="12" fill="currentColor">CLK</text>
  <circle cx="50" cy="150" r="2.6" fill="currentColor"/>
  <polyline points="50,150 50,78.0 70,78.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="210" cy="150" r="2.6" fill="currentColor"/>
  <polyline points="210,150 210,78.0 230,78.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="370" cy="150" r="2.6" fill="currentColor"/>
  <polyline points="370,150 370,78.0 390,78.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="154,57 179,57 179,57 230,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="314,57 339,57 339,57 390,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="474,57 499,57 499,12 50,12 50,57 70,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="506" y="30" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <text x="160" y="51" text-anchor="start" font-size="11" fill="currentColor" font-style="italic" class="dim">Q<tspan baseline-shift="sub" font-size="75%">C</tspan></text>
  <text x="320" y="51" text-anchor="start" font-size="11" fill="currentColor" font-style="italic" class="dim">Q<tspan baseline-shift="sub" font-size="75%">B</tspan></text>
  <text x="480" y="51" text-anchor="start" font-size="11" fill="currentColor" font-style="italic" class="dim">Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
</svg>
<figcaption>3-bit ring counter from D flip-flops.</figcaption>
</figure>

Initialize with $Q_C Q_B Q_A = 100$. Then $Q_B^+ = Q_C$, $Q_A^+ = Q_B$ and $Q_C^+ = Q_A$, so the single 1 circulates: $100 \to 010 \to 001 \to 100$.

<figure class="fig">
<svg viewBox="0 0 600 192" width="600" role="img" aria-label="Ring counter timing">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="122.0" y1="6" x2="122.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="174.0" y1="6" x2="174.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="226.0" y1="6" x2="226.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="278.0" y1="6" x2="278.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="330.0" y1="6" x2="330.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="382.0" y1="6" x2="382.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="434.0" y1="6" x2="434.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="486.0" y1="6" x2="486.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="538.0" y1="6" x2="538.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="590.0" y1="6" x2="590.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <text x="58" y="33.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">CLK</text>
  <polyline points="70.0,38 96.0,38 96.0,18 122.0,18 122.0,38 148.0,38 148.0,18 174.0,18 174.0,38 200.0,38 200.0,18 226.0,18 226.0,38 252.0,38 252.0,18 278.0,18 278.0,38 304.0,38 304.0,18 330.0,18 330.0,38 356.0,38 356.0,18 382.0,18 382.0,38 408.0,38 408.0,18 434.0,18 434.0,38 460.0,38 460.0,18 486.0,18 486.0,38 512.0,38 512.0,18 538.0,18 538.0,38 564.0,38 564.0,18 590.0,18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="67.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan></text>
  <polyline points="70.0,52 122.0,52 122.0,72 226.0,72 226.0,52 278.0,52 278.0,72 382.0,72 382.0,52 434.0,52 434.0,72 538.0,72 538.0,52 590.0,52" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="101.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">B</tspan></text>
  <polyline points="70.0,106 122.0,106 122.0,86 174.0,86 174.0,106 278.0,106 278.0,86 330.0,86 330.0,106 434.0,106 434.0,86 486.0,86 486.0,106 590.0,106" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="135.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <polyline points="70.0,140 174.0,140 174.0,120 226.0,120 226.0,140 330.0,140 330.0,120 382.0,120 382.0,140 486.0,140 486.0,120 538.0,120 538.0,140 590.0,140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="186" text-anchor="middle" font-size="11" fill="currentColor" class="dim">a single 1 circulates: 3 states, mod-3</text>
  <text x="58" y="162" text-anchor="end" font-size="11" fill="currentColor" class="dim" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan>Q<tspan baseline-shift="sub" font-size="75%">B</tspan>Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <text x="96.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="96.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="96.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="96.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">100</text>
  <text x="148.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="148.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="148.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="148.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">010</text>
  <text x="200.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="200.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="200.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="200.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">001</text>
  <text x="252.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="252.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="252.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="252.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">100</text>
  <text x="304.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="304.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="304.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="304.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">010</text>
  <text x="356.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="356.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="356.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="356.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">001</text>
  <text x="408.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="408.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="408.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="408.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">100</text>
  <text x="460.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="460.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="460.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="460.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">010</text>
  <text x="512.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="512.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="512.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="512.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">001</text>
  <text x="564.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="564.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="564.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="564.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">100</text>
</svg>
<figcaption>3 distinct states, so this is a mod-3 counter ($n$ flip-flops give $n$ states).</figcaption>
</figure>

We can also make a 4-bit ring counter by connecting a 2-to-4 decoder to a 2-bit counter:

<figure class="fig">
<svg viewBox="0 0 520 120" width="520" role="img" aria-label="4-bit ring counter from a 2-bit counter and a 2 to 4 decoder">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="20" y="55" text-anchor="start" font-size="12" fill="currentColor">CLK</text>
  <polyline points="50,50 110,50" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="110" y="25" width="120" height="50" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="170.0" y="55.0" text-anchor="middle" font-size="14" fill="currentColor">2-bit counter</text>
  <polyline points="230,40 300,40" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="230,60 300,60" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <rect x="300" y="10" width="90" height="80" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="345.0" y="46.0" text-anchor="middle" font-size="14" fill="currentColor">2 × 4</text>
  <text x="345.0" y="64.0" text-anchor="middle" font-size="11" fill="currentColor" class="dim">decoder</text>
  <polyline points="390,22 450,22" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="458" y="26" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D₀</text>
  <polyline points="390,41 450,41" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="458" y="45" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D₁</text>
  <polyline points="390,60 450,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="458" y="64" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D₂</text>
  <polyline points="390,79 450,79" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="458" y="83" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D₃</text>
  <text x="260" y="110" text-anchor="middle" font-size="11" fill="currentColor" class="dim">exactly one output is 1, and it moves one place every clock</text>
</svg>
<figcaption>Ring counter from a counter and a decoder.</figcaption>
</figure>

### Johnson Counter

A *Johnson* (twisted-ring) counter feeds back the **complement** of the last output: $Q_B^+ = Q_C$, $Q_A^+ = Q_B$, $Q_C^+ = \bar Q_A$.

<figure class="fig">
<svg viewBox="0 0 540 170" width="540" role="img" aria-label="3-bit Johnson counter from D flip-flops">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="70" y="40" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="78" y="62" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M70,72.0 L79,78.0 L70,84.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="146" y="62" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="146" y="108" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="116.0" y="83.0" text-anchor="middle" font-size="13" fill="currentColor">FFC</text>
  <rect x="230" y="40" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="238" y="62" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M230,72.0 L239,78.0 L230,84.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="306" y="62" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="306" y="108" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="276.0" y="83.0" text-anchor="middle" font-size="13" fill="currentColor">FFB</text>
  <rect x="390" y="40" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="398" y="62" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M390,72.0 L399,78.0 L390,84.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="466" y="62" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="466" y="108" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="436.0" y="83.0" text-anchor="middle" font-size="13" fill="currentColor">FFA</text>
  <polyline points="52,150 500,150" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="14" y="155" text-anchor="start" font-size="12" fill="currentColor">CLK</text>
  <circle cx="50" cy="150" r="2.6" fill="currentColor"/>
  <polyline points="50,150 50,78.0 70,78.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="210" cy="150" r="2.6" fill="currentColor"/>
  <polyline points="210,150 210,78.0 230,78.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="370" cy="150" r="2.6" fill="currentColor"/>
  <polyline points="370,150 370,78.0 390,78.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="154,57 179,57 179,57 230,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="314,57 339,57 339,57 390,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="474,103 499,103 499,12 50,12 50,57 70,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="506" y="30" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">Q̄<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <text x="160" y="51" text-anchor="start" font-size="11" fill="currentColor" font-style="italic" class="dim">Q<tspan baseline-shift="sub" font-size="75%">C</tspan></text>
  <text x="320" y="51" text-anchor="start" font-size="11" fill="currentColor" font-style="italic" class="dim">Q<tspan baseline-shift="sub" font-size="75%">B</tspan></text>
  <text x="480" y="51" text-anchor="start" font-size="11" fill="currentColor" font-style="italic" class="dim">Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
</svg>
<figcaption>3-bit Johnson counter: $\bar Q_A$ is fed back to the first flip-flop.</figcaption>
</figure>

Initialize $Q_C Q_B Q_A = 000$: the sequence is $000 \to 100 \to 110 \to 111 \to 011 \to 001 \to 000$.

<figure class="fig">
<svg viewBox="0 0 600 192" width="600" role="img" aria-label="Johnson counter timing">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="110.0" y1="6" x2="110.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="150.0" y1="6" x2="150.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="190.0" y1="6" x2="190.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="230.0" y1="6" x2="230.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="270.0" y1="6" x2="270.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="310.0" y1="6" x2="310.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="350.0" y1="6" x2="350.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="390.0" y1="6" x2="390.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="430.0" y1="6" x2="430.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="470.0" y1="6" x2="470.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="510.0" y1="6" x2="510.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="550.0" y1="6" x2="550.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="590.0" y1="6" x2="590.0" y2="150" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <text x="58" y="33.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">CLK</text>
  <polyline points="70.0,38 90.0,38 90.0,18 110.0,18 110.0,38 130.0,38 130.0,18 150.0,18 150.0,38 170.0,38 170.0,18 190.0,18 190.0,38 210.0,38 210.0,18 230.0,18 230.0,38 250.0,38 250.0,18 270.0,18 270.0,38 290.0,38 290.0,18 310.0,18 310.0,38 330.0,38 330.0,18 350.0,18 350.0,38 370.0,38 370.0,18 390.0,18 390.0,38 410.0,38 410.0,18 430.0,18 430.0,38 450.0,38 450.0,18 470.0,18 470.0,38 490.0,38 490.0,18 510.0,18 510.0,38 530.0,38 530.0,18 550.0,18 550.0,38 570.0,38 570.0,18 590.0,18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="67.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan></text>
  <polyline points="70.0,72 110.0,72 110.0,52 230.0,52 230.0,72 350.0,72 350.0,52 470.0,52 470.0,72 590.0,72" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="101.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">B</tspan></text>
  <polyline points="70.0,106 150.0,106 150.0,86 270.0,86 270.0,106 390.0,106 390.0,86 510.0,86 510.0,106 590.0,106" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="135.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <polyline points="70.0,140 190.0,140 190.0,120 310.0,120 310.0,140 430.0,140 430.0,120 550.0,120 550.0,140 590.0,140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="300.0" y="186" text-anchor="middle" font-size="11" fill="currentColor" class="dim">three square waves, each shifted by one clock: usable as a multi-phase clock</text>
  <text x="58" y="162" text-anchor="end" font-size="11" fill="currentColor" class="dim" font-style="italic">Q<tspan baseline-shift="sub" font-size="75%">C</tspan>Q<tspan baseline-shift="sub" font-size="75%">B</tspan>Q<tspan baseline-shift="sub" font-size="75%">A</tspan></text>
  <text x="90.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="90.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="90.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="90.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">000</text>
  <text x="130.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="130.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="130.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="130.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">100</text>
  <text x="170.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="170.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="170.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="170.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">110</text>
  <text x="210.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="210.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="210.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="210.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">111</text>
  <text x="250.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="250.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="250.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="250.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">011</text>
  <text x="290.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="290.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="290.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="290.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">001</text>
  <text x="330.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="330.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="330.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="330.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">000</text>
  <text x="370.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="370.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="370.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="370.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">100</text>
  <text x="410.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="410.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="410.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="410.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">110</text>
  <text x="450.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="450.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="450.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="450.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">111</text>
  <text x="490.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="490.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="490.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="490.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">011</text>
  <text x="530.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">1</text>
  <text x="530.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="530.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="530.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">001</text>
  <text x="570.0" y="134.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="570.0" y="100.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="570.0" y="66.0" text-anchor="middle" font-size="10" fill="currentColor" class="dim">0</text>
  <text x="570.0" y="162" text-anchor="middle" font-size="11" fill="currentColor" font-family="Source Code Pro, monospace">000</text>
</svg>
<figcaption>$n$ flip-flops give $2n$ states, so 3 flip-flops make a mod-6 counter. The outputs are phase-shifted square waves, so it can be used as a multi-phase clock.</figcaption>
</figure>

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
2. Reduce the number of states if possible: merge *equivalent* states, i.e. states that give the same output for every input and go to equivalent next states. This is the same procedure as minimizing a DFA; see Linz [[4]](#ref-4), §2.4.
3. Give each state a binary code. $k$ states need $\lceil \log_2 k \rceil$ flip-flops.
4. Write the state table: present state and input give the next state and output.
5. Choose the flip-flop type and find its inputs with the excitation table.
6. Simplify the input and output equations with K-maps and draw the circuit.

<div class="example">

Design a circuit whose output is 1 while it has seen three or more consecutive 1s on its input $x$.

</div>

As a Moore machine it needs four states: $S_0$ (no 1s yet), $S_1$ (one 1), $S_2$ (two) and $S_3$ (three or more, output 1). A 0 always sends it back to $S_0$.

<figure class="fig">
<svg viewBox="0 0 440 275" width="440" role="img" aria-label="Moore state diagram of a detector for three or more consecutive 1s">
  <defs><marker id="arr-fsm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <ellipse cx="110" cy="60" rx="34" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="110" y="65" text-anchor="middle" font-size="13" fill="currentColor">S₀/0</text>
  <ellipse cx="330" cy="60" rx="34" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330" y="65" text-anchor="middle" font-size="13" fill="currentColor">S₁/0</text>
  <ellipse cx="330" cy="200" rx="34" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="330" y="205" text-anchor="middle" font-size="13" fill="currentColor">S₂/0</text>
  <ellipse cx="110" cy="200" rx="34" ry="20" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="110" y="205" text-anchor="middle" font-size="13" fill="currentColor">S₃/1</text>
  <path d="M144,53 L296,53" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="220" y="46" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">1</text>
  <path d="M296,67 L144,67" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="220" y="84" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">0</text>
  <path d="M330,80 L330,180" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="340" y="134" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">1</text>
  <path d="M307,185 L134,75" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="236" y="124" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">0</text>
  <path d="M296,200 L144,200" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="220" y="193" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">1</text>
  <path d="M110,180 L110,80" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="100" y="134" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">0</text>
  <path d="M98,41 C80,4 140,4 122,41" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="110" y="12" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">0</text>
  <path d="M98,219 C80,256 140,256 122,219" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr-fsm)"/>
  <text x="110" y="266" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">1</text>
</svg>
<figcaption>Moore state diagram of the detector. Each state shows its output; each arrow shows the input $x$.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 590 190" width="590" role="img" aria-label="T flip-flop counter for 0, 2, 3, 1">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="220" y="70" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="228" y="92" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">T</text>
  <path d="M220,102.0 L229,108.0 L220,114.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="296" y="92" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="296" y="138" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="266.0" y="113.0" text-anchor="middle" font-size="13" fill="currentColor">FF₂</text>
  <rect x="430" y="70" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="438" y="92" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">T</text>
  <path d="M430,102.0 L439,108.0 L430,114.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="506" y="92" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="506" y="138" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="476.0" y="113.0" text-anchor="middle" font-size="13" fill="currentColor">FF₁</text>
  <polyline points="304,87 314,87 314,12 100,12" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="92" y="16" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q₂</text>
  <polyline points="514,87 540,87 540,26 112,26" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="548" y="92" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">Q₁</text>
  <circle cx="100" cy="12" r="2.6" fill="currentColor"/>
  <circle cx="112" cy="26" r="2.6" fill="currentColor"/>
  <circle cx="322" cy="12" r="2.6" fill="currentColor"/>
  <circle cx="330" cy="26" r="2.6" fill="currentColor"/>
  <path d="M130,60 q15,20 0,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M137,60 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="196" cy="80" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="100,12 100,70 134,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="112,26 112,90 134,90" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="200,80 208,80 208,87 220,87" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M340,60 q15,20 0,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M347,60 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="322,12 322,70 344,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="330,26 330,90 344,90" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="402,80 415,80 415,87 430,87" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="168" y="54" text-anchor="middle" font-size="11" fill="currentColor" class="dim">T₂ = Q₁ ⊙ Q₂</text>
  <text x="378" y="54" text-anchor="middle" font-size="11" fill="currentColor" class="dim">T₁ = Q₁ ⊕ Q₂</text>
  <polyline points="50,175 420,175" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="14" y="179" text-anchor="start" font-size="11" fill="currentColor">CLK</text>
  <circle cx="200" cy="175" r="2.6" fill="currentColor"/>
  <polyline points="200,175 200,108.0 220,108.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="410" cy="175" r="2.6" fill="currentColor"/>
  <polyline points="410,175 410,108.0 430,108.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>The $0 \to 2 \to 3 \to 1$ counter: an XNOR drives $T_2$ and an XOR drives $T_1$.</figcaption>
</figure>

<div class="example">

Consider the following circuit with a positive-edge-triggered D flip-flop. What is the output sequence on $Y$?

</div>

<figure class="fig">
<svg viewBox="0 0 500 195" width="500" role="img" aria-label="D flip-flop circuit with D = AX + Q-bar X-bar">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="16" y="35" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">A</text>
  <polyline points="26,30 120,30" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="16" y="65" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">X</text>
  <polyline points="26,60 100,60 100,50 120,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="70" cy="60" r="2.6" fill="currentColor"/>
  <path d="M120,20 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="70,60 70,110 80,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M80,101 L98,110 L80,119 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="102" cy="110" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="106,110 130,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M130,100 h20 a20.0,20.0 0 0 1 0,40 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M230,50 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="160.0,40.0 200,40.0 200,60 236,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="178" y="34" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">AX</text>
  <polyline points="170.0,120.0 210,120.0 210,80 236,80" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="186" y="140" text-anchor="middle" font-size="11" fill="currentColor" font-style="italic" class="dim">Q̄X̄</text>
  <rect x="330" y="40" width="84" height="76" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="338" y="62" text-anchor="start" font-size="12" fill="currentColor" font-style="italic">D</text>
  <path d="M330,72.0 L339,78.0 L330,84.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="406" y="62" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <text x="406" y="108" text-anchor="end" font-size="12" fill="currentColor" font-style="italic">Q̄</text>
  <text x="376.0" y="83.0" text-anchor="middle" font-size="13" fill="currentColor"></text>
  <polyline points="285,70 310,70 310,57 330,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="322,180 322,78.0 330,78.0" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="322" y="192" text-anchor="middle" font-size="11" fill="currentColor">CLK</text>
  <polyline points="414,57 470,57" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="478" y="62" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">Y</text>
  <polyline points="414,103 440,103 440,165 110,165 110,130 130,130" stroke="currentColor" stroke-width="1.5" fill="none"/>
</svg>
<figcaption>$D = AX + \bar Q \bar X$.</figcaption>
</figure>

$$D = AX + \bar Q \bar X$$

The value of $X$ just before each positive edge decides what is stored:

- $X = 1$: $D = A$, so the flip-flop **loads $A$**.
- $X = 0$: $D = \bar Q$, so the flip-flop **toggles**.

So on each clock edge $k$, read $X$: if it is 1, $Y$ becomes the current $A_k$; if it is 0, $Y$ becomes the complement of its previous value. For example, with $X = 1, 1, 0, 1, 1$ on edges 1–5, the output is $Y = A_0, A_1, \bar A_1, A_3, A_4$.

<div class="example">

The circuit below uses XOR gates and non-inverting buffers with delays $\delta_1 = 2$ ns and $\delta_2 = 4$ ns; the XOR gates have zero delay. The logic is stable at 0 at time 0. If $A$ rises at $t = 1$ ns, how many transitions (changes of logic level) happen at $B$ from 0 to 10 ns?

</div>

<figure class="fig">
<svg viewBox="0 0 540 150" width="540" role="img" aria-label="XOR gates with delay buffers">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <text x="16" y="55" text-anchor="middle" font-size="14" fill="currentColor" font-style="italic">A</text>
  <polyline points="26,50 204,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="60" cy="50" r="2.6" fill="currentColor"/>
  <polyline points="60,50 60,110 76,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M76,102 L92,110 L76,118 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="92,110 102,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M102,102 L118,110 L102,118 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="118,110 160,110 160,70 204,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="100" y="136" text-anchor="middle" font-size="11" fill="currentColor" class="dim">δ₁ = 2 ns</text>
  <text x="170" y="104" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">P</text>
  <path d="M200,40 q15,20 0,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M207,40 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="262,60 340,60 340,50 384,50" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="285" cy="60" r="2.6" fill="currentColor"/>
  <text x="272" y="54" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">Q</text>
  <polyline points="285,60 285,110 296,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M296,102 L312,110 L296,118 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="312,110 322,110" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M322,102 L338,110 L322,118 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="338,110 365,110 365,70 384,70" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="320" y="136" text-anchor="middle" font-size="11" fill="currentColor" class="dim">δ₂ = 4 ns</text>
  <text x="375" y="104" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">R</text>
  <path d="M380,40 q15,20 0,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <path d="M387,40 q15,20 0,40 q40,0 55,-20 q-15,-20 -55,-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="442,60 500,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="508" y="65" text-anchor="start" font-size="14" fill="currentColor" font-style="italic">B</text>
</svg>
<figcaption>$Q = A \oplus P$ with $P$ = $A$ delayed by 2 ns, and $B = Q \oplus R$ with $R$ = $Q$ delayed by 4 ns.</figcaption>
</figure>

<figure class="fig">
<svg viewBox="0 0 600 190" width="600" role="img" aria-label="Timing of the XOR and buffer circuit">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <line x1="117.3" y1="6" x2="117.3" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="164.5" y1="6" x2="164.5" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="211.8" y1="6" x2="211.8" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="259.1" y1="6" x2="259.1" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="306.4" y1="6" x2="306.4" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="353.6" y1="6" x2="353.6" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="400.9" y1="6" x2="400.9" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="448.2" y1="6" x2="448.2" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="495.5" y1="6" x2="495.5" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <line x1="542.7" y1="6" x2="542.7" y2="186" stroke="currentColor" stroke-width="1.5" fill="none" stroke-width="1" stroke-dasharray="3 3" opacity=".35"/>
  <text x="58" y="33.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">A</text>
  <polyline points="70.0,38 117.3,38 117.3,18 590.0,18" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="67.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">P</text>
  <polyline points="70.0,72 211.8,72 211.8,52 590.0,52" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="101.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">Q</text>
  <polyline points="70.0,106 117.3,106 117.3,86 211.8,86 211.8,106 590.0,106" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="135.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">R</text>
  <polyline points="70.0,140 306.4,140 306.4,120 400.9,120 400.9,140 590.0,140" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="58" y="169.0" text-anchor="end" font-size="14" fill="currentColor" font-style="italic">B</text>
  <polyline points="70.0,174 117.3,174 117.3,154 211.8,154 211.8,174 306.4,174 306.4,154 400.9,154 400.9,174 590.0,174" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="70.0" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">0</text>
  <text x="117.3" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">1</text>
  <text x="164.5" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">2</text>
  <text x="211.8" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">3</text>
  <text x="259.1" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">4</text>
  <text x="306.4" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">5</text>
  <text x="353.6" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">6</text>
  <text x="400.9" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">7</text>
  <text x="448.2" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">8</text>
  <text x="495.5" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">9</text>
  <text x="542.7" y="184" text-anchor="middle" font-size="11" fill="currentColor" class="dim">10</text>
</svg>
<figcaption>$Q$ is a 2 ns pulse (while $A$ and $P$ differ), $R$ is that pulse 4 ns later, and $B$ is high whenever exactly one of them is.</figcaption>
</figure>

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

<figure class="fig">
<svg viewBox="0 0 470 210" width="470" role="img" aria-label="4-bit counter with Clear driven by A1 and A3">
  <defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
  <rect x="150" y="90" width="180" height="60" rx="4" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <text x="240.0" y="125.0" text-anchor="middle" font-size="14" fill="currentColor">4-bit counter</text>
  <polyline points="170,90 170,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="170" y="22" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₄</text>
  <polyline points="210,90 210,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="210" y="22" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₃</text>
  <polyline points="250,90 250,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="250" y="22" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₂</text>
  <polyline points="290,90 290,30" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="290" y="22" text-anchor="middle" font-size="12" fill="currentColor" font-style="italic">A₁</text>
  <path d="M60,20 h20 a30.0,30.0 0 0 1 0,60 h-20 z" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="210" cy="40" r="2.6" fill="currentColor"/>
  <polyline points="210,40 60,40" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <circle cx="290" cy="60" r="2.6" fill="currentColor"/>
  <polyline points="290,60 60,60" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <polyline points="110.0,50.0 115,50.0 115,120 150,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="122" y="136" text-anchor="start" font-size="11" fill="currentColor">Clear</text>
  <polyline points="390,100 330,100" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="398" y="104" text-anchor="start" font-size="11" fill="currentColor">Count = 1</text>
  <polyline points="390,120 330,120" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="398" y="124" text-anchor="start" font-size="11" fill="currentColor">Load = 0</text>
  <polyline points="390,140 330,140" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="398" y="144" text-anchor="start" font-size="11" fill="currentColor">CLK</text>
  <polyline points="175,185 175,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="215,185 215,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="255,185 255,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <polyline points="295,185 295,150" stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#arr)"/>
  <text x="235" y="202" text-anchor="middle" font-size="11" fill="currentColor" class="dim">parallel inputs (unused, Load = 0)</text>
</svg>
<figcaption>The counter with Count = 1, Load = 0 and Clear = $A_3 A_1$.</figcaption>
</figure>

Counting up from $A_4 A_3 A_2 A_1 = 0000$: 0001, 0010, 0011, 0100, then 0101, where $A_3 = A_1 = 1$. Since the delay is negligible, the counter is cleared immediately and we never see this state. The sequence is

$$0 \to 1 \to 2 \to 3 \to 4 \to 0 \quad \text{(a mod-5 counter)}$$

## References

1. <span id="ref-1"></span>Mano, M. Morris, and Michael D. Ciletti. *Digital Design: With an Introduction to the Verilog HDL*, 5th ed. Pearson, 2013.

2. <span id="ref-2"></span>Mano, M. Morris. *Digital Logic and Computer Design*. Pearson India, 2017.

3. <span id="ref-3"></span>Rajaraman, V. *“IEEE Standard for Floating Point Numbers.”* *Resonance*, 21(1), 11–30, 2016. [https://www.ias.ac.in/public/Volumes/reso/021/01/0011-0030.pdf](https://www.ias.ac.in/public/Volumes/reso/021/01/0011-0030.pdf).

4. <span id="ref-4"></span>Linz, Peter. *An Introduction to Formal Languages and Automata*, 6th ed. Jones & Bartlett Learning, 2017.
