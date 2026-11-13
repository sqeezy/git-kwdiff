// PROTOTYPE shell: which variant renders, the floating switcher, and the raw
// state inspector (so the model is visible while you flip variants).
import type { Document, HtmlBuilder } from 'foldkit/html'

import { variantName } from './app'
import { Message } from './message'
import type { Model } from './model'
import { totals } from './lib'
import { VariantA } from './variants/a'
import { VariantB } from './variants/b'
import { VariantC } from './variants/c'

const ORDER = ['A', 'B', 'C'] as const

const next = (variant: Model['variant'], step: number) => {
  const index = ORDER.indexOf(variant)
  return ORDER[(index + step + ORDER.length) % ORDER.length] ?? 'A'
}

const switcher = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [
      h.Class(
        'fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-[#11131a] px-1.5 py-1.5 font-mono text-[11px] text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.55)]',
      ),
    ],
    [
      h.span([h.Class('ml-1 mr-1 rounded-full bg-[#f5c451] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#3a2c05]')], [
        'PROTO',
      ]),
      h.button(
        [
          h.OnClick(Message.ToggledState()),
          h.Attribute('data-kw', 'state'),
          h.Attribute('aria-pressed', model.showState ? 'true' : 'false'),
          h.Class('rounded-full px-2.5 py-1.5 text-white/70 hover:bg-white/10 hover:text-white'),
        ],
        ['state'],
      ),
      h.button(
        [
          h.OnClick(Message.SelectedVariant({ variant: next(model.variant, -1) })),
          h.Attribute('aria-label', 'Previous variant'),
          h.Class('rounded-full px-2.5 py-1.5 text-white/80 hover:bg-white/10 hover:text-white'),
        ],
        ['←'],
      ),
      h.button(
        [
          h.OnClick(Message.SelectedVariant({ variant: next(model.variant, 1) })),
          h.Attribute('aria-label', 'Next variant'),
          h.Attribute('data-kw', 'next'),
          h.Class('rounded-full px-2.5 py-1.5 text-white/80 hover:bg-white/10 hover:text-white'),
        ],
        ['→'],
      ),
      h.span([h.Class('min-w-[7.5rem] px-1 text-center')], [
        `${model.variant} · ${variantName[model.variant]}`,
      ]),
    ],
  )

const statePanel = (model: Model, h: HtmlBuilder<Message>) => {
  if (!model.showState) return h.span([])
  const sum = totals(model)
  return h.pre(
    [
      h.Class(
        'fixed bottom-20 left-1/2 z-50 max-h-64 w-[min(92vw,30rem)] -translate-x-1/2 overflow-auto rounded-xl border border-white/10 bg-[#0b0d12]/95 p-3 font-mono text-[10px] leading-[1.5] text-[#8fe0ad] shadow-2xl',
      ),
    ],
    [JSON.stringify({ ...model, derived: sum }, null, 1)],
  )
}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `git-kwdiff · ${model.variant} ${variantName[model.variant]}`,
  body: h.div(
    [],
    [
      model.variant === 'A' ? VariantA(model, h) : h.span([]),
      model.variant === 'B' ? VariantB(model, h) : h.span([]),
      model.variant === 'C' ? VariantC(model, h) : h.span([]),
      switcher(model, h),
      statePanel(model, h),
    ],
  ),
})
