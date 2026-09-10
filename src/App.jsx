import useGameStore from './store/useGameStore';
import MainMenu from './screens/MainMenu';
import GameScreen from './screens/GameScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  return screen === 'menu' ? <MainMenu /> : <GameScreen />;
}
