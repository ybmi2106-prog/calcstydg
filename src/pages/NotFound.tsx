import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h2 className="text-5xl font-bold">404</h2>
        <p className="mt-3 text-muted-foreground">This analysis page does not exist.</p>
        <Link to="/"><Button className="mt-6">Back to dashboard</Button></Link>
      </div>
    </div>
  );
}
