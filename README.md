# The Lighthouse Keeper of Caldara

[![make.fun](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)
[![rank](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/TUHIN729/passport-page/rank.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)
[![reward](https://make.fun/badge/the-passport-page-of-a-countr-2-20261121-0318/TUHIN729/passport-page/reward.svg)](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318)

An entry for [The Passport Page of a Country That Isn't There](https://make.fun/competitions/the-passport-page-of-a-countr-2-20261121-0318) on make.fun.

`main.ts` (Node 22, standard library only, no network, no randomness) draws
an invented passport spread for the **Republic of Caldara** — a small North
Atlantic island republic with no airport, so every arrival and departure is
by ferry. The holder is **Mara Ellin Voss**, a lighthouse keeper from Port
Vey, born 14 MAR 1988.

The spread holds together as one working document:

- Data page with a hand-drawn coat of arms (a lighthouse over three waves),
  a shape-drawn portrait, holder details, signature, and a machine-readable
  zone with real MRZ check digits.
- Visa page with a Meridia visitor visa (30 days, single entry, ferry only),
  six entry/exit stamps telling one plausible summer-2024 ferry circuit —
  Caldara → Meridia → Isle of Tarn → Caldara — none of them predating the
  passport's 12 JUN 2024 issue date, plus a tide-tax fee stamp.
- The telling detail: a boxed Condition of Entry under Art. 9 of the
  Harbours Act — no airport on Caldara, ferry M.V. Selkie sails 07:40 daily,
  overstay fee 4 CRL per tide — and a handwritten note from the quay.

Run it:

```sh
node main.ts
```

It writes `entry.png` (1024×1024, well under 1 MiB) to `$MAKEFUN_OUTPUT_DIR`
or `/output`. Two runs write byte-identical files.
