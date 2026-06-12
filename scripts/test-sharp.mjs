import sharp from 'sharp';

async function test() {
  try {
    console.log('Testing sharp module loading...');
    // Create a 100x100 transparent image buffer to test sharp processing
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .webp()
    .toBuffer();
    
    console.log('Sharp processed a test image successfully! Buffer length:', buffer.length);
    console.log('Sharp is working perfectly on this machine.');
  } catch (error) {
    console.error('Sharp Error:', error);
  }
}

test();
