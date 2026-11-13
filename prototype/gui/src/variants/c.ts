// Variant C — "Review flow": three steps, one column, big type, one action at a
// time. The shape of a thing you do once in a while and should not need a
// manual for.
import type { Html, HtmlBuilder } from 'foldkit/html'

import { diffLines, filesOf, isSelected, matching, selectedCommits, totals } from '../lib'
import { Message } from '../message'
import type { Model } from '../model'

const ink = 'text-[#141326]'
const muted = 'text-[#6b6880]'
const quiet = 'text-[#7a7599]'
const accent = 'bg-[#4f46e5]'
const ring = 'border-[#e4e2f0]'

const diffLineClass = (kind: string): string => {
  switch (kind) {
    case 'add':
      return 'bg-[#eefaf1] text-[#146b3a]'
    case 'del':
      return 'bg-[#fdeef0] text-[#a12f3f]'
    case 'hunk':
      return 'bg-[#f6f5fb] text-[#6b6880]'
    default:
      return 'text-[#3f3d52]'
  }
}

const stepLabel = (step: number, title: string, current: number, h: HtmlBuilder<Message>) => {
  const here = step === current
  return h.button(
    [
      h.OnClick(Message.MovedStep({ step })),
      h.Class('flex items-center gap-2'),
      h.Attribute('aria-current', here ? 'step' : 'false'),
    ],
    [
      h.span(
        [
          h.Class(
            `grid size-6 place-items-center rounded-full font-mono text-[11px] ${
              here ? 'bg-[#ecebfb] text-[#4f46e5] ring-1 ring-[#c7c3f2]' : 'bg-[#f4f3fa] text-[#6b6880]'
            }`,
          ),
        ],
        [`${step}`],
      ),
      h.span([h.Class(`hidden text-[12px] sm:inline ${here ? 'font-medium text-[#4f46e5]' : 'text-[#6b6880]'}`)], [
        title,
      ]),
    ],
  )
}

export const VariantC = (model: Model, h: HtmlBuilder<Message>): Html => {
  const found = matching(model.keyword)
  const chosen = selectedCommits(model)
  const files = filesOf(chosen)
  const sum = totals(model)

  const action =
    model.step === 1
      ? { label: `Choose from ${found.length} commits`, to: 2, enabled: found.length > 0 }
      : model.step === 2
        ? { label: `Review ${chosen.length} commits`, to: 3, enabled: chosen.length > 0 }
        : { label: 'Start over', to: 1, enabled: true }

  return h.div([h.Class(`min-h-screen bg-white font-sans antialiased ${ink}`)], [
    // ---- header ----------------------------------------------------------
    h.div([h.Class(`flex items-center gap-3 border-b ${ring} px-5 py-3`)], [
      h.span(
        [h.Class(`grid size-7 place-items-center rounded-md ${accent} font-mono text-[12px] font-bold text-white`)],
        ['±'],
      ),
      h.span([h.Class('text-[14px] font-semibold')], ['git-kwdiff']),
      h.span([h.Class('ml-auto')], [
        h.div([h.Class('flex items-center gap-3')], [
          stepLabel(1, 'Search', model.step, h),
          h.span([h.Class('h-px w-4 bg-[#e4e2f0]')]),
          stepLabel(2, 'Choose', model.step, h),
          h.span([h.Class('h-px w-4 bg-[#e4e2f0]')]),
          stepLabel(3, 'Review', model.step, h),
        ]),
      ]),
    ]),

    h.div([h.Class('mx-auto w-full max-w-xl px-5 pb-40 pt-8')], [
      // ---- step 1 --------------------------------------------------------
      model.step === 1
        ? h.div([h.Class('flex flex-col gap-6')], [
            h.div([], [
              h.p([h.Class(`font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${quiet}`)], [
                'step 1 · search',
              ]),
              h.h1([h.Class('mt-2 text-[30px] font-semibold leading-[1.15] tracking-tight')], [
                'Which commits',
                h.br([]),
                'belong in the patch?',
              ]),
              h.p([h.Class(`mt-3 max-w-sm text-[13px] leading-5 ${muted}`)], [
                'Searches every branch, including histories that share no ancestor. Nothing is checked out.',
              ]),
            ]),
            h.input([
              h.Attribute('type', 'text'),
              h.Attribute('placeholder', 'ABC-123'),
              h.Attribute('spellcheck', 'false'),
              h.Value(model.keyword),
              h.OnInput(value => Message.ChangedKeyword({ value })),
              h.Class(
                'w-full rounded-xl border-2 border-[#141326] px-4 py-3.5 font-mono text-[18px] outline-none placeholder:text-[#b5b1cc] focus:border-[#4f46e5]',
              ),
            ]),
            h.div([h.Class('flex flex-wrap items-center gap-2')], [
              h.span([h.Class(`text-[11px] ${muted}`)], ['try']),
              ...['ABC-123', 'retry', 'cache', 'chore'].map(word =>
                h.button(
                  [
                    h.OnClick(Message.ChangedKeyword({ value: word })),
                    h.Class(
                      `rounded-full border ${ring} px-2.5 py-1 font-mono text-[11px] text-[#4f46e5] hover:border-[#4f46e5]`,
                    ),
                  ],
                  [word],
                ),
              ),
            ]),
            h.div([h.Class(`rounded-xl border ${ring} bg-[#fbfaff] p-4`)], [
              h.div([h.Class('flex flex-wrap items-baseline justify-between gap-1')], [
                h.span([h.Class('font-mono text-[11px] font-medium text-[#4f46e5]')], [
                  `${found.length} commits match`,
                ]),
                h.span([h.Class(`font-mono text-[10.5px] ${quiet}`)], ['across 2 unrelated roots']),
              ]),
              h.ul([h.Class('mt-2 flex flex-col gap-1')], [
                ...found.slice(0, 3).map(commit =>
                  h.li([h.Class('truncate text-[12px] leading-5 text-[#3f3d52]')], [
                    h.span([h.Class(`font-mono text-[10.5px] ${quiet}`)], [`${commit.sha}  `]),
                    commit.subject,
                  ]),
                ),
                ...(found.length > 3
                  ? [h.li([h.Class(`text-[11px] ${quiet}`)], [`and ${found.length - 3} more…`])]
                  : []),
              ]),
            ]),
          ])
        : h.div([]),

      // ---- step 2 --------------------------------------------------------
      model.step === 2
        ? h.div([h.Class('flex flex-col gap-5')], [
            h.div([h.Class('flex items-start justify-between gap-3')], [
              h.div([], [
                h.p([h.Class(`font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${quiet}`)], [
                  'step 2 · choose',
                ]),
                h.h1([h.Class('mt-2 text-[26px] font-semibold leading-tight tracking-tight')], [
                  'Tick what belongs in.',
                ]),
              ]),
              h.button(
                [
                  h.OnClick(Message.MovedStep({ step: 1 })),
                  h.Class(
                    `whitespace-nowrap rounded-full border ${ring} px-3 py-1.5 text-[11px] ${muted} hover:border-[#141326]`,
                  ),
                ],
                ['← search'],
              ),
            ]),
            h.p([h.Class(`text-[12px] ${muted}`)], [
              `${chosen.length} of ${found.length} selected · the patch is built in commit order`,
            ]),
            h.ul([h.Class('flex flex-col gap-2')], [
              ...found.map(commit => {
                const on = isSelected(model, commit.sha)
                return h.li([], [
                  h.button(
                    [
                      h.Attribute('role', 'checkbox'),
                      h.Attribute('aria-checked', on ? 'true' : 'false'),
                      h.OnClick(Message.ToggledCommit({ sha: commit.sha })),
                      h.Class(
                        `flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                          on ? 'border-[#4f46e5] bg-[#f7f6ff]' : `${ring} bg-white hover:border-[#c9c6db]`
                        }`,
                      ),
                    ],
                    [
                      h.span(
                        [
                          h.Attribute('aria-hidden', 'true'),
                          h.Class(
                            `mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                              on ? 'border-[#4f46e5] bg-[#4f46e5] text-white' : 'border-[#d5d2e6] text-transparent'
                            }`,
                          ),
                        ],
                        ['✓'],
                      ),
                      h.span([h.Class('flex min-w-0 flex-col gap-1')], [
                        h.span([h.Class('text-[13.5px] font-medium leading-snug')], [commit.subject]),
                        h.span(
                          [h.Class(`flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-[#6b6880]`)],
                          [
                            h.span(
                              [
                                h.Class(
                                  `rounded-full px-1.5 ${
                                    commit.root === 'legacy'
                                      ? 'bg-[#fdf3dd] text-[#8a5f0f]'
                                      : 'bg-[#eaf7ee] text-[#1f6f3a]'
                                  }`,
                                ),
                              ],
                              [commit.root],
                            ),
                            commit.sha,
                            h.span([h.Class('text-[#c9c6db]')], ['·']),
                            commit.author,
                            h.span([h.Class('text-[#c9c6db]')], ['·']),
                            commit.date,
                          ],
                        ),
                      ]),
                    ],
                  ),
                ])
              }),
            ]),
            h.p([h.Class(`text-[11px] leading-4 ${muted}`)], [
              'The legacy commits come from a 2019 SVN import and share no ancestor with main. They still diff together.',
            ]),
          ])
        : h.div([]),

      // ---- step 3 --------------------------------------------------------
      model.step === 3
        ? h.div([h.Class('flex flex-col gap-5')], [
            h.div([h.Class('flex items-start justify-between gap-3')], [
              h.div([], [
                h.p([h.Class(`font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${quiet}`)], [
                  'step 3 · review',
                ]),
                h.h1([h.Class('mt-2 text-[26px] font-semibold leading-tight tracking-tight')], [
                  'One patch, every root.',
                ]),
              ]),
              h.button(
                [
                  h.OnClick(Message.MovedStep({ step: 2 })),
                  h.Class(
                    `whitespace-nowrap rounded-full border ${ring} px-3 py-1.5 text-[11px] ${muted} hover:border-[#141326]`,
                  ),
                ],
                ['← commits'],
              ),
            ]),
            h.div([h.Class('flex flex-wrap items-center gap-3 font-mono text-[11px]')], [
              h.span([h.Class(muted)], [`${sum.commits} commits`]),
              h.span([h.Class('text-[#d5d2e6]')], ['·']),
              h.span([h.Class(muted)], [`${sum.files} files`]),
              h.span([h.Class('text-[#d5d2e6]')], ['·']),
              h.span([h.Class('text-[#146b3a]')], [`+${sum.added}`]),
              h.span([h.Class('text-[#a12f3f]')], [`−${sum.removed}`]),
            ]),
            h.div([h.Class(`overflow-hidden rounded-xl border ${ring}`)], [
              ...files.flatMap((file, index) => {
                const open = model.fileIndex === index
                return [
                  h.button(
                    [
                      h.OnClick(Message.SelectedFile({ index })),
                      h.Class(
                        `flex w-full items-center gap-2 border-b ${ring} px-4 py-2.5 text-left last:border-0 ${
                          open ? 'bg-[#f7f6ff]' : 'bg-white hover:bg-[#fbfaff]'
                        }`,
                      ),
                    ],
                    [
                      h.span([h.Class('font-mono text-[11.5px] text-[#3f3d52]')], [file.path]),
                      file.isNew
                        ? h.span(
                            [h.Class('rounded bg-[#eaf7ee] px-1 font-mono text-[10px] text-[#1f6f3a]')],
                            ['new'],
                          )
                        : h.span([]),
                      h.span([h.Class('ml-auto font-mono text-[10.5px] text-[#146b3a]')], [`+${file.added}`]),
                      h.span([h.Class('font-mono text-[10.5px] text-[#a12f3f]')], [`−${file.removed}`]),
                      h.span([h.Class(`font-mono text-[10.5px] ${quiet}`)], [open ? '▾' : '▸']),
                    ],
                  ),
                  ...(open
                    ? [
                        h.pre(
                          [h.Class('overflow-auto bg-[#fcfbff] py-1 font-mono text-[11px] leading-[1.6]')],
                          diffLines(file.patch).map(entry =>
                            h.div([h.Class(`whitespace-pre px-4 ${diffLineClass(entry.kind)}`)], [entry.text]),
                          ),
                        ),
                      ]
                    : []),
                ]
              }),
            ]),
          ])
        : h.div([]),
    ]),

    // ---- the one action --------------------------------------------------
    h.div(
      [
        h.Class(
          'fixed inset-x-0 bottom-14 z-30 border-t border-[#e4e2f0] bg-white/95 px-5 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur',
        ),
      ],
      [
        h.div([h.Class('mx-auto flex max-w-xl items-center gap-4')], [
          h.div([h.Class('flex flex-col')], [
            h.span([h.Class('font-mono text-[11px] text-[#3f3d52]')], [
              `${chosen.length} commits · ${sum.files} files`,
            ]),
            h.span([h.Class(`font-mono text-[10.5px] ${quiet}`)], [
              `+${sum.added} −${sum.removed} · ${found.length} matched`,
            ]),
          ]),
          h.button(
            [
              h.OnClick(Message.MovedStep({ step: action.to })),
              h.Attribute('data-kw', 'next-step'),
              h.Attribute('data-enabled', action.enabled ? 'true' : 'false'),
              h.Class(
                `ml-auto rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-white ${
                  action.enabled ? `${accent} hover:bg-[#4338ca]` : 'bg-[#c9c6db]'
                }`,
              ),
            ],
            [action.label],
          ),
        ]),
      ],
    ),
  ])
}
