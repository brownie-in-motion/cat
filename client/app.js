import { render } from 'preact'
import { Router } from 'preact-router'
import { Term } from './term'
import './app.css'

const App = () => (
  <Router>
    <Term path="/:token?" />
  </Router>
)

render(<App />, document.getElementById('root'))
