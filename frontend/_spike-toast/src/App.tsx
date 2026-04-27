/**
 * App entry — emitted by /gabe-mockup spike toast --system.
 *
 * Wraps the demo in ToastProvider + mounts ToastContainer once at the App root
 * so any descendant calling useToast() can dispatch into the visible queue.
 */
import { ToastProvider } from "./components/Toast/ToastProvider";
import { ToastContainer } from "./components/Toast/ToastContainer";
import ToastDemo from "./demo/ToastDemo";

export default function App() {
  return (
    <ToastProvider>
      <ToastDemo />
      <ToastContainer />
    </ToastProvider>
  );
}
