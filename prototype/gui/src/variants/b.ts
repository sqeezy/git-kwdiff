// Variant B — "Review IDE": three panes (commits, files, diff), dark, keyboard
// first. The shape of a client you already live in, not a page you visit.
import type { Html, HtmlBuilder } from 'foldkit/html'

import { diffLines, fileAt, filesOf, grouped, isSelected, matching, selectedCommits, totals } from '../lib'
import { Message } from '../message'
import type { Model } from '../model'

const bg = 'bg-[#0b0e14] text-[#c9d1d9]'
const border = 'border-[#1f2733]'
const panel = 'bg-[#11151d]'
const selected = 'bg-[#1a2432]'
const dim = 'text-[#7d8b9e]'

const diffLineClass = (kind: string): string => {
  switch (kind) {
    case 'add':
      return 'bg-[#0f2a1d] text-[#8fe0ad]'
    case 'del':
      return 'bg-[#2d1417] text-[#f0a19b]'
    case 'hunk':
      return 'bg-[#131a24] text-[#8fa3bd]'
    default:
      return 'text-[#9aa7b8]'
  }
}

const tick = (on: boolean, h: HtmlBuilder<Message>) =>
  h.span(
    [
      h.Attribute('aria-hidden', 'true'),
      h.Class(
        `grid size-4 shrink-0 place-items-center rounded-[4px] border font-mono text-[10px] ${
          on ? 'border-[#3fb950] bg-[#1f6f3a] text-white' : 'border-[#3a4453] text-transparent'
        }`,
      ),
    ],
    ['✓'],
  )

export const VariantB = (model: Model, h: HtmlBuilder<Message>): Html => {
  const found = matching(model.keyword)
  const chosen = selectedCommits(model)
  const files = filesOf(chosen)
  const active = fileAt(model)
  const sum = totals(model)
  const allShown = found.length > 0 && found.every(commit => isSelected(model, commit.sha))

  return h.div([h.Class(`${bg} flex min-h-screen flex-col pb-12 font-sans antialiased`)], [
    // ---- top bar ---------------------------------------------------------
    h.div([h.Class(`flex flex-wrap items-center gap-3 border-b ${border} ${panel} px-3 py-2`)], [
      h.span([h.Class('font-mono text-[12px] font-bold text-[#e6edf3]')], ['git-kwdiff']),
      h.span([h.Class('font-mono text-[12px] text-[#556176]')], ['/']),
      h.span([h.Class('font-mono text-[12px] text-[#e6edf3]')], ['acme-api']),
      h.span(
        [
          h.Class(
            `rounded border ${border} bg-[#161b22] px-1.5 py-0.5 font-mono text-[10.5px] ${dim}`,
          ),
        ],
        ['main + svn/legacy'],
      ),
      h.div([h.Class('relative min-w-[180px] flex-1')], [
        h.input([
          h.Attribute('type', 'text'),
          h.Attribute('placeholder', 'search messages…'),
          h.Attribute('spellcheck', 'false'),
          h.Value(model.keyword),
          h.OnInput(value => Message.ChangedKeyword({ value })),
          h.Class(
            'w-full rounded border border-[#2b3543] bg-[#0b0e14] px-2.5 py-1.5 font-mono text-[12px] text-[#e6edf3] outline-none placeholder:text-[#6b7889] focus:border-[#3fb950]',
          ),
        ]),
      ]),
      h.span([h.Class('font-mono text-[11px] text-[#7d8b9e]')], [`${chosen.length}/${found.length}`]),
      h.span([h.Class('hidden font-mono text-[11px] sm:inline')], [
        `${sum.files} files `,
        h.span([h.Class('text-[#3fb950]')], [`+${sum.added}`]),
        ' ',
        h.span([h.Class('text-[#f85149]')], [`−${sum.removed}`]),
      ]),
    ]),

    // ---- three panes -----------------------------------------------------
    h.div(
      [
        h.Class(
          'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,214px)_minmax(0,1fr)]',
        ),
      ],
      [
        // commits
        h.section([h.Class(`flex min-h-0 flex-col border-b ${border} lg:border-b-0 lg:border-r`)], [
          h.div([h.Class(`flex items-center gap-2 border-b ${border} px-3 py-1.5`)], [
            h.span([h.Class(`font-mono text-[10.5px] ${dim}`)], ['Commits']),
            h.button(
              [
                h.OnClick(Message.ToggledAll({ on: !allShown })),
                h.Class(
                  'ml-auto rounded border border-[#2b3543] px-1.5 py-0.5 font-mono text-[10.5px] text-[#9aa7b8] hover:border-[#3fb950] hover:text-[#3fb950]',
                ),
              ],
              ['all / none'],
            ),
          ]),
          h.ul(
            [h.Class('max-h-[34vh] overflow-auto py-1 lg:max-h-none')],
            grouped(found).flatMap(({ commit, startsRoot }) => {
              const on = isSelected(model, commit.sha)
              const row = h.li([], [
                h.button(
                  [
                    h.Attribute('role', 'checkbox'),
                    h.Attribute('aria-checked', on ? 'true' : 'false'),
                    h.OnClick(Message.ToggledCommit({ sha: commit.sha })),
                    h.Class(
                      `flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-[#161b22] ${
                        on ? '' : 'opacity-70'
                      }`,
                    ),
                  ],
                  [
                    tick(on, h),
                    h.span([h.Class('flex min-w-0 flex-col gap-1')], [
                      h.span([h.Class('truncate text-[12px] leading-4 text-[#e6edf3]')], [commit.subject]),
                      h.span([h.Class('flex items-center gap-1.5 font-mono text-[10.5px] text-[#7d8b9e]')], [
                        commit.sha,
                        h.span(
                          [
                            h.Class(
                              `rounded px-1 ${
                                commit.root === 'legacy'
                                  ? 'bg-[#3a2f12] text-[#e0bd63]'
                                  : 'bg-[#14311f] text-[#6cc98a]'
                              }`,
                            ),
                          ],
                          [commit.root],
                        ),
                        commit.date.slice(2),
                      ]),
                    ]),
                  ],
                ),
              ])
              return startsRoot
                ? [
                    h.li(
                      [
                        h.Class(
                          'mt-1 flex items-center gap-2 border-y border-[#1f2733] bg-[#0e1219] px-2.5 py-1',
                        ),
                      ],
                      [
                        h.span([h.Class('font-mono text-[10px] uppercase tracking-[0.1em] text-[#6b7889]')], [
                          'No merge base',
                        ]),
                        h.span([h.Class('h-px flex-1 bg-[#1f2733]')]),
                      ],
                    ),
                    row,
                  ]
                : [row]
            }),
          ),
        ]),

        // files
        h.section([h.Class(`flex min-h-0 flex-col border-b ${border} lg:border-b-0 lg:border-r`)], [
          h.div([h.Class(`border-b ${border} px-3 py-1.5`)], [
            h.span([h.Class(`font-mono text-[10.5px] ${dim}`)], [`Files · ${files.length}`]),
          ]),
          h.ul(
            [h.Class('max-h-[26vh] overflow-auto py-1 lg:max-h-none')],
            files.map((file, index) =>
              h.li([], [
                h.button(
                  [
                    h.OnClick(Message.SelectedFile({ index })),
                    h.Class(
                      `flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[11.5px] ${
                        active?.path === file.path
                          ? `${selected} text-[#e6edf3]`
                          : 'text-[#9aa7b8] hover:bg-[#161b22]'
                      }`,
                    ),
                  ],
                  [
                    h.span([h.Class('truncate')], [file.path.replace(/^src\//, '')]),
                    h.span([h.Class('ml-auto shrink-0 text-[10.5px] text-[#3fb950]')], [`+${file.added}`]),
                    h.span([h.Class('shrink-0 text-[10.5px] text-[#f85149]')], [`−${file.removed}`]),
                  ],
                ),
              ]),
            ),
          ),
        ]),

        // diff
        h.section([h.Class('flex min-h-0 flex-col')], [
          h.div([h.Class(`flex items-center gap-2 border-b ${border} ${panel} px-3 py-1.5`)], [
            h.span([h.Class('truncate font-mono text-[11.5px] text-[#e6edf3]')], [
              active === undefined ? 'no file' : active.path,
            ]),
            active !== undefined && active.isNew
              ? h.span([h.Class('rounded bg-[#14311f] px-1 font-mono text-[10px] text-[#6cc98a]')], ['new'])
              : h.span([]),
            h.span([h.Class('ml-auto font-mono text-[10.5px] text-[#6b7889]')], ['⌘C copy']),
          ]),
          active === undefined
            ? h.p([h.Class('px-4 py-10 text-center font-mono text-[11.5px] text-[#6b7889]')], [
                'select a commit to see its patch',
              ])
            : h.pre(
                [
                  h.Class(
                    'max-h-[46vh] overflow-auto py-1.5 font-mono text-[11.5px] leading-[1.6] lg:max-h-none',
                  ),
                ],
                diffLines(active.patch).map(entry =>
                  h.div([h.Class(`whitespace-pre px-3 ${diffLineClass(entry.kind)}`)], [entry.text]),
                ),
              ),
        ]),
      ],
    ),

    // ---- status bar ------------------------------------------------------
    h.div(
      [
        h.Class(
          `hidden items-center gap-3 border-t ${border} ${panel} px-3 py-1 font-mono text-[10.5px] ${dim} sm:flex`,
        ),
      ],
      [
        h.span([], ['git kwdiff -n "ABC-123"']),
        h.span([h.Class('ml-auto')], [
          `${sum.commits} commits · ${sum.files} files · `,
          h.span([h.Class('text-[#3fb950]')], [`+${sum.added}`]),
          ' ',
          h.span([h.Class('text-[#f85149]')], [`−${sum.removed}`]),
        ]),
        h.span([h.Class('text-[#2b3543]')], ['|']),
        h.span([], ['effect 4.1.4 · foldkit 0.170']),
      ],
    ),
  ])
}
