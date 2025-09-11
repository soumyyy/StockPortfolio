// Enhanced script to create PWA icons with black background and "portfolio" text
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Create icons directory
const iconsDir = join(process.cwd(), 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

// Create a simple SVG icon with black background and cursive "portfolio" text
const createIconSVG = (size) => {
  const fontSize = Math.max(size * 0.18, 12); // Larger font size for better visibility
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Simple black background -->
  <rect width="${size}" height="${size}" fill="#0A0A0A" rx="${size * 0.1}"/>
  
  <!-- Cursive "portfolio" text -->
  <text x="50%" y="50%" 
        font-family="cursive, 'Brush Script MT', 'Lucida Handwriting', serif" 
        font-size="${fontSize}" 
        font-weight="400" 
        fill="#ffffff" 
        text-anchor="middle" 
        dominant-baseline="middle"
        letter-spacing="1px">portfolio</text>
</svg>
`;
};

// Icon sizes needed for PWA
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

console.log('Creating simple PWA icons with cursive text...');

iconSizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  
  writeFileSync(join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

// Create favicon
writeFileSync(join(iconsDir, 'favicon-16x16.svg'), createIconSVG(16));
writeFileSync(join(iconsDir, 'favicon-32x32.svg'), createIconSVG(32));

// Create Apple touch icons
const appleSizes = [
  { size: 180, name: 'touch-icon-iphone-retina' },
  { size: 167, name: 'touch-icon-ipad-retina' },
  { size: 152, name: 'touch-icon-ipad' },
  { size: 120, name: 'touch-icon-iphone' }
];

appleSizes.forEach(({ size, name }) => {
  const svg = createIconSVG(size);
  writeFileSync(join(iconsDir, `${name}.svg`), svg);
  console.log(`Created ${name}.svg`);
});

// Create splash screens for iOS
const splashSizes = [
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732' },
  { width: 1668, height: 2224, name: 'apple-splash-1668-2224' },
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048' },
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436' },
  { width: 1242, height: 2208, name: 'apple-splash-1242-2208' },
  { width: 750, height: 1334, name: 'apple-splash-750-1334' },
  { width: 640, height: 1136, name: 'apple-splash-640-1136' }
];

splashSizes.forEach(({ width, height, name }) => {
  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Simple black background -->
  <rect width="${width}" height="${height}" fill="#0A0A0A"/>
  
  <!-- Centered icon -->
  <g transform="translate(${width/2 - 120}, ${height/2 - 120})">
    <rect width="240" height="240" fill="#0A0A0A" rx="24" stroke="#333" stroke-width="2"/>
    
    <!-- Cursive Portfolio text -->
    <text x="120" y="140" font-family="cursive, 'Brush Script MT', 'Lucida Handwriting', serif" 
          font-size="36" font-weight="400" fill="#ffffff" text-anchor="middle">portfolio</text>
  </g>
</svg>
`;
  writeFileSync(join(iconsDir, `${name}.svg`), svg);
  console.log(`Created ${name}.svg`);
});

console.log('✅ Simple icon generation complete!');
console.log('Created simple icons with black background and cursive "portfolio" text');
console.log('Note: For production, convert SVG files to PNG using a tool like Inkscape or online converters');
