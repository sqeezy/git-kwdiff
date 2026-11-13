import { Runtime } from 'foldkit'

import { init, subscriptions, update } from './app'
import { view } from './main'
import { Model } from './model'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  subscriptions,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application)
