import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './style.css';
class Boundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?<main className="fatal"><h1>Graphics interrupted</h1><p>Try reloading with hardware acceleration enabled.</p><button onClick={()=>location.reload()}>Reload headquarters</button></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);
