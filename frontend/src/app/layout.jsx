import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'FoodLoop — Circuits courts alimentaires',
  description: 'Marketplace connectant producteurs locaux et consommateurs urbains',
};

export default function RootLayout({ children }) {
  return (
      <html lang="fr">
      <body>
      <Navbar />
      <main>{children}</main>
      </body>
      </html>
  );
}