import { useState } from 'react'
import Home from './screens/Home'
import Households from './screens/Households'
import Guests from './screens/Guests'
import AddHousehold from './screens/AddHousehold'
import PlanEvent from './screens/PlanEvent'
import EventHistory from './screens/EventHistory'
import Billet from './screens/Billet'
import './index.css'

const NAV = [
  { id: 'home',       label: 'Home',       icon: '⌂' },
  { id: 'households', label: 'Households', icon: '🏡' },
  { id: 'guests',     label: 'Guests',     icon: '👥' },
  { id: 'events',     label: 'Events',     icon: '📅' },
  { id: 'billet',     label: 'Billet',     icon: '🏘' },
  { id: 'add',        label: 'Add',        icon: '+' },
]

export default function App() {
  const [screen, setScreen] = useState('home')

  const screens = {
    home:       <Home onPlanEvent={() => setScreen('plan')} />,
    households: <Households />,
    guests:     <Guests />,
    events:     <EventHistory />,
    billet:     <Billet />,
    add:        <AddHousehold onDone={() => setScreen('households')} />,
    plan:       <PlanEvent onBack={() => setScreen('home')} />,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FB', paddingBottom: 72 }}>
      {screens[screen] || screens.home}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: '#0F2942', display: 'flex', alignItems: 'stretch',
        boxShadow: '0 -2px 24px rgba(0,0,0,0.25)', zIndex: 100,
      }}>
        {NAV.map(item => {
          const active = screen === item.id
          const isAdd  = item.id === 'add'
          return (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{
              flex: 1, border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              color: active ? '#E8A838' : 'rgba(255,255,255,0.45)',
              transition: 'color 0.2s', position: 'relative',
            }}>
              {active && <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 2, background: '#E8A838', borderRadius: '0 0 2px 2px' }} />}
              <span style={{ fontSize: isAdd ? 24 : 19, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
