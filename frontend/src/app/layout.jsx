import './globals.css';

export const metadata = {
  title: 'FoodLoop — Circuits courts alimentaires',
  description: 'Marketplace connectant producteurs locaux et consommateurs urbains',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
