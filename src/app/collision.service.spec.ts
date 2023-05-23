import { TestBed } from '@angular/core/testing';

import { CollisionService } from './collision.service';

describe('CollisionService', () => {
  let service: CollisionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollisionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
