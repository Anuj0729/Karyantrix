const request = require('supertest');
const { app } = require('../server');
const { createUserWithToken } = require('./helpers');
const { Category, ServiceCatalog, Service } = require('../models');

describe('Categories', () => {
  test('admin can create a category, and it shows up in the public listing', async () => {
    const { token } = await createUserWithToken({ role: 'admin' });

    const create = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gardening', slug: 'gardening', description: 'Lawn & garden care' });
    expect(create.status).toBe(201);

    const list = await request(app).get('/api/categories');
    expect(list.status).toBe(200);
    expect(list.body.categories.some((c) => c.slug === 'gardening')).toBe(true);
  });

  test('non-admin cannot create a category', async () => {
    const { token } = await createUserWithToken({ role: 'customer' });
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gardening', slug: 'gardening' });
    expect(res.status).toBe(403);
  });

  test('unauthenticated request cannot create a category', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'X', slug: 'x' });
    expect(res.status).toBe(401);
  });

  test('getting an unknown category by slug 404s', async () => {
    const res = await request(app).get('/api/categories/does-not-exist');
    expect(res.status).toBe(404);
  });

  test('deactivating a category cascades to its catalog services and provider listings, and reactivating restores them', async () => {
    const { token: adminToken } = await createUserWithToken({ role: 'admin' });
    const { user: provider, token: providerToken } = await createUserWithToken({ role: 'provider' });

    const category = await Category.create({ name: 'Plumbing Cascade', slug: 'plumbing-cascade' });
    const catalogEntry = await ServiceCatalog.create({ category: category.id, name: 'Tap Repair' });
    const otherCatalogEntry = await ServiceCatalog.create({ category: category.id, name: 'Pipe Fitting' });
    // Deactivated independently of the category, before the category itself
    // is switched off - this one should stay off even after the category is
    // reactivated.
    otherCatalogEntry.is_active = false;
    await otherCatalogEntry.save();

    const service = await Service.create({
      provider: provider.id,
      category: category.id,
      catalog_service: catalogEntry.id,
      title: 'Tap Repair',
      price: 500,
    });

    const deactivate = await request(app)
      .put(`/api/admin/categories/${category.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: false });
    expect(deactivate.status).toBe(200);

    const catalogAfterDeactivate = await ServiceCatalog.findById(catalogEntry.id);
    expect(catalogAfterDeactivate.is_active).toBe(false);
    expect(catalogAfterDeactivate.deactivated_by_category).toBe(true);

    const serviceAfterDeactivate = await Service.findById(service.id);
    expect(serviceAfterDeactivate.is_active).toBe(false);
    expect(serviceAfterDeactivate.deactivated_by_category).toBe(true);

    // A provider can't route around the cascade by reactivating their own
    // listing while the category is still off.
    const reactivateWhileOff = await request(app)
      .put(`/api/services/${service.id}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ is_active: true });
    expect(reactivateWhileOff.status).toBe(400);

    const activate = await request(app)
      .put(`/api/admin/categories/${category.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_active: true });
    expect(activate.status).toBe(200);

    const catalogAfterActivate = await ServiceCatalog.findById(catalogEntry.id);
    expect(catalogAfterActivate.is_active).toBe(true);
    expect(catalogAfterActivate.deactivated_by_category).toBe(false);

    const serviceAfterActivate = await Service.findById(service.id);
    expect(serviceAfterActivate.is_active).toBe(true);

    // Was deactivated on its own before the category cascade ever touched
    // it, so it should remain off.
    const otherCatalogAfterActivate = await ServiceCatalog.findById(otherCatalogEntry.id);
    expect(otherCatalogAfterActivate.is_active).toBe(false);
  });
});
