import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZonedetailesComponent } from './zonedetailes.component';

describe('ZonedetailesComponent', () => {
  let component: ZonedetailesComponent;
  let fixture: ComponentFixture<ZonedetailesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZonedetailesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZonedetailesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
