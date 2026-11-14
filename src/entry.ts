import { Runtime } from 'foldkit'

import { init, subscriptions, update } from './app'
import { Model } from './model'
import { view } from './ui'

// makeElement: the window owns no document — no <head>, no canonical, no
// Foldkit crash view. The Tauri shell sets the OS title.
const application = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
})

Runtime.run(application)
