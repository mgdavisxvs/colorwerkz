/**
 * Color Transfer API Integration Tests
 */

import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { expect } from 'chai';

// Assuming app is exported from main server file
// import app from '../../server/app';

describe('Color Transfer API v2', () => {
  const testImagePath = path.join(__dirname, '..', 'fixtures', 'test_image.jpg');

  before(async () => {
    // Create test fixtures directory if it doesn't exist
    const fixturesDir = path.join(__dirname, '..', 'fixtures');
    await fs.mkdir(fixturesDir, { recursive: true });

    // Create a simple test image if it doesn't exist
    // (In production, you'd have actual test images)
    if (!(await fs.access(testImagePath).then(() => true).catch(() => false))) {
      console.log('Warning: Test image not found. Some tests may be skipped.');
    }
  });

  describe('POST /api/v2/color-transfer', () => {
    it('should transfer color using production method', async function() {
      this.timeout(30000); // Allow 30s for processing

      // Skip if test image doesn't exist
      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', testImagePath)
        .field('method', 'production')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('success');
      expect(response.body.data).to.have.property('image');
      expect(response.body.data).to.have.property('delta_e');
      expect(response.body.data).to.have.property('processing_time');
      expect(response.body.data).to.have.property('manufacturing_ready');
      expect(response.body.data.method_used).to.equal('pytorch');

      // Check manufacturing readiness (Delta E should be < 2.0 for production method)
      if (response.body.data.manufacturing_ready) {
        expect(response.body.data.delta_e).to.be.lessThan(2.0);
      }
    });

    it('should reject missing image', async () => {
      const response = await request(app)
        .post('/api/v2/color-transfer')
        .field('method', 'production')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(400);
      expect(response.body.status).to.equal('error');
      expect(response.body.error.code).to.equal('MISSING_FILE');
    });

    it('should reject invalid target colors', async function() {
      this.timeout(10000);

      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', testImagePath)
        .field('method', 'production')
        .field('target_colors', JSON.stringify({
          drawer: 'INVALID_RAL',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(400);
      expect(response.body.status).to.equal('error');
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should reject invalid method', async function() {
      this.timeout(10000);

      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', testImagePath)
        .field('method', 'invalid_method')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(400);
      expect(response.body.status).to.equal('error');
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('should accept method aliases', async function() {
      this.timeout(30000);

      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      // Test 'accurate' alias for 'production'
      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', testImagePath)
        .field('method', 'accurate')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(200);
      expect(response.body.data.method_used).to.equal('pytorch');
    });

    it('should process with opencv method (fast but inaccurate)', async function() {
      this.timeout(15000);

      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', testImagePath)
        .field('method', 'opencv')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(200);
      expect(response.body.data.method_used).to.equal('opencv');

      // OpenCV should be fast but inaccurate
      expect(response.body.data.processing_time).to.be.lessThan(500); // Should be < 500ms
      expect(response.body.data.manufacturing_ready).to.be.false; // Never manufacturing ready
    });
  });

  describe('POST /api/v2/color-transfer/batch', () => {
    it('should process batch of images', async function() {
      this.timeout(60000);

      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      const response = await request(app)
        .post('/api/v2/color-transfer/batch')
        .attach('images', testImagePath)
        .attach('images', testImagePath) // Use same image twice for testing
        .attach('images', testImagePath)
        .field('method', 'production')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(200);
      expect(response.body.data.results).to.have.lengthOf(3);
      expect(response.body.data.summary).to.have.property('total', 3);
      expect(response.body.data.summary).to.have.property('successful');
      expect(response.body.data.summary).to.have.property('failed');
      expect(response.body.data.summary).to.have.property('mean_delta_e');
    });

    it('should reject too many images', async function() {
      this.timeout(10000);

      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      const req = request(app).post('/api/v2/color-transfer/batch');

      // Attach 51 images (over the limit of 50)
      for (let i = 0; i < 51; i++) {
        req.attach('images', testImagePath);
      }

      const response = await req
        .field('method', 'production')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v2/color-transfer/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v2/color-transfer/health');

      expect(response.status).to.equal(200);
      expect(response.body.data).to.have.property('status');
      expect(response.body.data).to.have.property('methods');
      expect(response.body.data.methods).to.have.property('pytorch');
      expect(response.body.data.methods).to.have.property('opencv');
      expect(response.body.data.methods).to.have.property('i2i');
    });
  });

  describe('GET /api/v2/color-transfer/methods', () => {
    it('should list available methods', async () => {
      const response = await request(app)
        .get('/api/v2/color-transfer/methods');

      expect(response.status).to.equal(200);
      expect(response.body.data.methods).to.be.an('array');
      expect(response.body.data.methods.length).to.be.greaterThan(0);

      // Check production method exists and is recommended
      const productionMethod = response.body.data.methods.find(
        (m: any) => m.name === 'production'
      );

      expect(productionMethod).to.exist;
      expect(productionMethod.manufacturing_ready).to.be.true;
      expect(productionMethod.recommended).to.be.true;

      // Check opencv method has warnings
      const opencvMethod = response.body.data.methods.find(
        (m: any) => m.name === 'opencv'
      );

      expect(opencvMethod).to.exist;
      expect(opencvMethod.manufacturing_ready).to.be.false;
      expect(opencvMethod.warnings).to.be.an('array');
      expect(opencvMethod.warnings.length).to.be.greaterThan(0);
    });
  });

  describe('Response Format', () => {
    it('should return standardized success response', async function() {
      this.timeout(30000);

      try {
        await fs.access(testImagePath);
      } catch (error) {
        this.skip();
        return;
      }

      const response = await request(app)
        .post('/api/v2/color-transfer')
        .attach('image', testImagePath)
        .field('method', 'production')
        .field('target_colors', JSON.stringify({
          drawer: 'RAL 5015',
          frame: 'RAL 7016'
        }));

      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body).to.have.property('metadata');
      expect(response.body.metadata).to.have.property('timestamp');
      expect(response.body.metadata).to.have.property('apiVersion', 'v2');
    });

    it('should return standardized error response on failure', async () => {
      const response = await request(app)
        .post('/api/v2/color-transfer')
        .field('method', 'production');

      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('error');
      expect(response.body.error).to.have.property('code');
      expect(response.body.error).to.have.property('message');
      expect(response.body).to.have.property('metadata');
      expect(response.body.metadata).to.have.property('timestamp');
    });
  });
});

describe('Deprecation Warnings (v1 endpoints)', () => {
  it('should return deprecation headers for v1 endpoints', async function() {
    this.timeout(30000);

    const testImagePath = path.join(__dirname, '..', 'fixtures', 'test_image.jpg');

    try {
      await fs.access(testImagePath);
    } catch (error) {
      this.skip();
      return;
    }

    const response = await request(app)
      .post('/api/color-transfer')
      .attach('image', testImagePath)
      .field('frameColor', 'RAL 7016')
      .field('drawerColor', 'RAL 5015');

    // Should have deprecation headers
    expect(response.headers).to.have.property('x-api-deprecated', 'true');
    expect(response.headers).to.have.property('x-api-sunset-date');
    expect(response.headers['warning']).to.match(/deprecated/i);
  });

  it('v1 and v2 should return equivalent results', async function() {
    this.timeout(60000);

    const testImagePath = path.join(__dirname, '..', 'fixtures', 'test_image.jpg');

    try {
      await fs.access(testImagePath);
    } catch (error) {
      this.skip();
      return;
    }

    const targetColors = {
      frame: 'RAL 7016',
      drawer: 'RAL 5015'
    };

    // Call v1 endpoint
    const v1Response = await request(app)
      .post('/api/pytorch-enhanced/process')
      .attach('image', testImagePath)
      .field('frameColor', targetColors.frame)
      .field('drawerColor', targetColors.drawer);

    // Call v2 endpoint
    const v2Response = await request(app)
      .post('/api/v2/color-transfer')
      .attach('image', testImagePath)
      .field('method', 'pytorch')
      .field('target_colors', JSON.stringify(targetColors));

    // Both should succeed
    expect(v1Response.status).to.equal(200);
    expect(v2Response.status).to.equal(200);

    // Delta E should be similar (within 10% tolerance)
    const v1DeltaE = v1Response.body.data?.delta_e || v1Response.body.delta_e;
    const v2DeltaE = v2Response.body.data.delta_e;

    if (v1DeltaE && v2DeltaE) {
      const tolerance = Math.max(v1DeltaE, v2DeltaE) * 0.1;
      expect(Math.abs(v1DeltaE - v2DeltaE)).to.be.lessThan(tolerance);
    }
  });
});
