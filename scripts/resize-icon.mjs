// Script to resize portfolio icon to all required PWA sizes
import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const iconsDir = join(process.cwd(), 'public', 'icons');
const inputImage = join(iconsDir, 'image.png');

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

// Check if input image exists
if (!existsSync(inputImage)) {
  console.error('❌ Error: image.png not found in public/icons/');
  console.log('Please make sure your portfolio image is saved as public/icons/image.png');
  process.exit(1);
}

// Required icon sizes for PWA
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// Favicon sizes
const faviconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' }
];

console.log('🎨 Portfolio Icon Resizer');
console.log('========================');
console.log(`📁 Input: ${inputImage}`);
console.log('📝 Note: Images will be resized to fit within bounds without cropping');
console.log('🎯 Black background will be added to maintain square aspect ratio');
console.log('');

async function resizeIcons() {
  try {
    // Get image metadata
    const metadata = await sharp(inputImage).metadata();
    console.log(`📊 Original image: ${metadata.width}x${metadata.height} (${metadata.format})`);
    console.log('');

    // Resize main icons
    console.log('🔄 Resizing main icons...');
    for (const { size, name } of iconSizes) {
      const outputPath = join(iconsDir, name);
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain', // This ensures no cropping - image fits within bounds
          background: { r: 10, g: 10, b: 10, alpha: 1 }, // Black background for padding
          position: 'center' // Center the image within the square
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Created ${name} (${size}x${size})`);
    }

    // Resize favicons
    console.log('');
    console.log('🔄 Resizing favicons...');
    for (const { size, name } of faviconSizes) {
      const outputPath = join(iconsDir, name);
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain', // This ensures no cropping - image fits within bounds
          background: { r: 10, g: 10, b: 10, alpha: 1 }, // Black background for padding
          position: 'center' // Center the image within the square
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Created ${name} (${size}x${size})`);
    }

    console.log('');
    console.log('🎉 All icons created successfully!');
    console.log('');
    console.log('📋 Created files:');
    [...iconSizes, ...faviconSizes].forEach(({ name }) => {
      console.log(`   • ${name}`);
    });
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Run: npm run build');
    console.log('2. Test "Add to Home Screen" on your mobile device');
    console.log('3. Your portfolio icon should now appear!');

  } catch (error) {
    console.error('❌ Error resizing icons:', error.message);
    process.exit(1);
  }
}

// Run the resize function
resizeIcons();
