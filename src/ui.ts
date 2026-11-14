import type { Html, HtmlBuilder } from 'foldkit/html'

import { Message } from './message'
import type { Model } from './model'

const bg = 'bg-[#0b0e14] text-[#c9d1d9]'
const border = 'border-[#1f2733]'
const panel = 'bg-[#11151d]'
const dim = 'text-[#7d8b9e]'
const quiet = 'text-[#6b7889]'

const lineClass = (text: string): string =>
  text.startsWith('+')
    ? 'bg-[#0f2a1d] text-[#8fe0ad]'
    : text.startsWith('-')
      ? 'bg-[#2d1417] text-[#f0a19b]'
      : text.startsWith('@@')
        ? 'bg-[#131a24] text-[#8fa3bd]'
        : text.startsWith('#') || text.startsWith('diff --git')
          ? 'text-[#7d8b9e]'
          : 'text-[#9aa7b8]'

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

const card = (title: string, body: Html, h: HtmlBuilder<Message>) =>
  h.div([h.Class('absolute inset-0 grid place-items-center bg-[#0b0e14]/92 p-5 text-center')], [
    h.div([h.Class('max-w-xs')], [
      h.h2([h.Class('text-[13.5px] font-semibold text-[#e6edf3]')], [title]),
      body,
    ]),
  ])

const primary = (label: string, message: Message, h: HtmlBuilder<Message>) =>
  h.button(
    [
      h.OnClick(message),
      h.Class('mt-3 rounded-md bg-[#1f6f3a] px-3 py-1.5 text-[12px] font-semibold text-[#eaf7ee]'),
    ],
    [label],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const selected = model.commits.filter(commit => model.selectedShas.includes(commit.sha))
  const added = model.files.reduce((sum, file) => sum + file.added, 0)
  const removed = model.files.reduce((sum, file) => sum + file.removed, 0)
  const allTicked = model.commits.length > 0 && selected.length === model.commits.length

  return h.div([h.Class(`${bg} flex h-screen flex-col font-sans antialiased`)], [
    // ---- top bar ---------------------------------------------------------
    h.div(
      [h.Class(`flex flex-wrap items-center gap-2 border-b ${border} ${panel} px-3 py-2`)],
      [
        h.span([h.Class('font-mono text-[12px] font-bold text-[#e6edf3]')], ['kwdiff']),
        h.span([h.Class('font-mono text-[12px] text-[#556176]')], ['/']),
        h.span([h.Class('truncate font-mono text-[12px] text-[#e6edf3]')], [
          model.repo?.name ?? 'no repository',
        ]),
        h.select(
          [
            h.Attribute('aria-label', 'Branch filter'),
            h.Value(model.branch ?? ''),
            h.OnInput(value => Message.SelectedBranch({ branch: value === '' ? null : value })),
            h.Class(
              'rounded border border-[#2b3543] bg-[#0b0e14] px-1.5 py-1 font-mono text-[11px] text-[#c9d1d9]',
            ),
          ],
          [
            h.option([h.Attribute('value', '')], ['All refs']),
            ...model.refs.map(ref => h.option([h.Attribute('value', ref.name)], [ref.name])),
          ],
        ),
        h.div([h.Class('relative min-w-[160px] flex-1')], [
          h.input([
            h.Attribute('id', 'kw-search'),
            h.Attribute('type', 'text'),
            h.Attribute('placeholder', 'search commit messages…'),
            h.Attribute('spellcheck', 'false'),
            h.Value(model.keyword),
            h.OnInput(value => Message.ChangedKeyword({ value })),
            h.Class(
              'w-full rounded border border-[#2b3543] bg-[#0b0e14] px-2.5 py-1.5 font-mono text-[12px] text-[#e6edf3] outline-none placeholder:text-[#6b7889] focus:border-[#3fb950]',
            ),
          ]),
        ]),
        h.button(
          [
            h.OnClick(Message.ToggledCode()),
            h.Attribute('aria-pressed', model.code ? 'true' : 'false'),
            h.Class(
              `rounded border px-1.5 py-1 font-mono text-[11px] ${
                model.code
                  ? 'border-[#3fb950] text-[#3fb950]'
                  : 'border-[#2b3543] text-[#7d8b9e] hover:text-[#c9d1d9]'
              }`,
            ),
          ],
          ['-a code'],
        ),
        h.span([h.Class('font-mono text-[11px] text-[#7d8b9e]')], [
          `${selected.length}/${model.commits.length}`,
        ]),
        h.span([h.Class('hidden font-mono text-[11px] sm:inline')], [
          `${model.files.length} files `,
          h.span([h.Class('text-[#3fb950]')], [`+${added}`]),
          ' ',
          h.span([h.Class('text-[#f85149]')], [`−${removed}`]),
        ]),
      ],
    ),

    // ---- three panes -----------------------------------------------------
    h.div(
      [h.Class('relative grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,214px)_minmax(0,1fr)]')],
      [
        // commits
        h.section([h.Class(`flex min-h-0 flex-col border-b ${border} lg:border-b-0 lg:border-r`)], [
          h.div([h.Class(`flex items-center gap-2 border-b ${border} px-3 py-1.5`)], [
            h.span([h.Class(`font-mono text-[10.5px] ${dim}`)], ['Commits']),
            model.searching ? h.span([h.Class(`font-mono text-[10px] ${quiet}`)], ['searching…']) : h.span([]),
            h.button(
              [
                h.OnClick(Message.ToggledAll({ on: !allTicked })),
                h.Class(
                  'ml-auto rounded border border-[#2b3543] px-1.5 py-0.5 font-mono text-[10.5px] text-[#9aa7b8] hover:border-[#3fb950] hover:text-[#3fb950]',
                ),
              ],
              ['all / none'],
            ),
          ]),
          h.ul(
            [h.Class('max-h-[34vh] overflow-auto py-1 lg:max-h-none')],
            [
              ...model.commits.map((commit, index) => {
                const on = model.selectedShas.includes(commit.sha)
                return h.li([], [
                  h.button(
                    [
                      h.Attribute('role', 'checkbox'),
                      h.Attribute('aria-checked', on ? 'true' : 'false'),
                      h.OnClick(Message.ToggledCommit({ sha: commit.sha })),
                      h.Class(
                        `flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-[#161b22] ${
                          index === model.cursor ? 'bg-[#161b22]' : ''
                        } ${on ? '' : 'opacity-80'}`,
                      ),
                    ],
                    [
                      tick(on, h),
                      h.span([h.Class('flex min-w-0 flex-col gap-1')], [
                        h.span([h.Class('truncate text-[12px] leading-4 text-[#e6edf3]')], [commit.subject]),
                        h.span([h.Class('flex items-center gap-1.5 font-mono text-[10.5px] text-[#7d8b9e]')], [
                          commit.sha,
                          commit.date,
                        ]),
                      ]),
                    ],
                  ),
                ])
              }),
              ...(model.commits.length === 0 && model.keyword !== '' && !model.searching && model.error === null
                ? [
                    h.li([h.Class('px-3 py-4 text-[11.5px] leading-5 text-[#7d8b9e]')], [
                      model.branch === null
                        ? `No commit message contains “${model.keyword}”. Case-insensitive; every ref is searched.`
                        : `No match on ${model.branch}.`,
                      ...(model.branch === null
                        ? []
                        : [
                            h.button(
                              [
                                h.OnClick(Message.SelectedBranch({ branch: null })),
                                h.Class('mt-2 rounded border border-[#2b3543] px-2 py-1 font-mono text-[10.5px] text-[#9aa7b8]'),
                              ],
                              ['Search all refs'],
                            ),
                          ]),
                    ]),
                  ]
                : []),
            ],
          ),
        ]),

        // files
        h.section([h.Class(`flex min-h-0 flex-col border-b ${border} lg:border-b-0 lg:border-r`)], [
          h.div([h.Class(`border-b ${border} px-3 py-1.5`)], [
            h.span([h.Class(`font-mono text-[10.5px] ${dim}`)], [`Files · ${model.files.length}`]),
          ]),
          h.ul(
            [h.Class('max-h-[26vh] overflow-auto py-1 lg:max-h-none')],
            model.files.map((file, index) =>
              h.li([], [
                h.button(
                  [
                    h.OnClick(Message.SelectedFile({ index })),
                    h.Class(
                      `flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[11.5px] ${
                        index === model.fileIndex
                          ? 'bg-[#1a2432] text-[#e6edf3]'
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
              model.files[model.fileIndex]?.path ?? 'no file',
            ]),
          ]),
          model.patch === null
            ? h.p([h.Class(`px-4 py-10 text-center font-mono text-[11.5px] ${quiet}`)], [
                model.selectedShas.length === 0
                  ? 'Tick a commit to see its patch.'
                  : 'Loading patch…',
              ])
            : h.pre(
                [h.Class('max-h-[46vh] overflow-auto py-1.5 font-mono text-[11.5px] leading-[1.6] lg:max-h-none')],
                model.patch
                  .split('\n')
                  .map(text => h.div([h.Class(`whitespace-pre px-3 ${lineClass(text)}`)], [text])),
              ),
        ]),

        // states over the panes
        model.repo === null
          ? card(
              'Nothing open yet',
              h.div([], [
                h.p([h.Class(`mt-1 text-[11.5px] ${dim}`)], ['Pick a repository; the last one comes back on launch.']),
                primary('Open repository…', Message.PickedRepo({ path: 'C:\\work\\acme-api' }), h),
              ]),
              h,
            )
          : model.error !== null
            ? card(
                model.error.kind === 'git-missing' ? 'git is not on PATH' : 'Could not open that repository',
                h.div([], [
                  h.p([h.Class(`mt-1 text-[11.5px] ${dim}`)], [model.error.message]),
                  primary('Choose another folder…', Message.PickedRepo({ path: 'C:\\work\\acme-api' }), h),
                ]),
                h,
              )
            : h.span([]),
      ],
    ),

    // ---- status bar ------------------------------------------------------
    h.div(
      [h.Class(`hidden items-center gap-3 border-t ${border} ${panel} px-3 py-1 font-mono text-[10.5px] ${dim} sm:flex`)],
      [
        h.span([], [model.repo?.root ?? 'no repository']),
        h.span([h.Class('ml-auto')], [
          `${selected.length} selected · ${model.files.length} files · `,
          h.span([h.Class('text-[#3fb950]')], [`+${added}`]),
          ' ',
          h.span([h.Class('text-[#f85149]')], [`−${removed}`]),
        ]),
        h.span([h.Class('text-[#2b3543]')], ['|']),
        h.span([], ['effect 4.1.4 · foldkit 0.170']),
      ],
    ),
  ])
}
