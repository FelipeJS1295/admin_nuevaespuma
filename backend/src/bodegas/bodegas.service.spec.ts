import { Test, TestingModule } from '@nestjs/testing';
import { BodegasService } from './bodegas.service';

describe('BodegasService', () => {
  let service: BodegasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BodegasService],
    }).compile();

    service = module.get<BodegasService>(BodegasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
