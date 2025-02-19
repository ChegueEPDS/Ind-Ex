import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertTableComponent } from './cert-table.component';

describe('CertTableComponent', () => {
  let component: CertTableComponent;
  let fixture: ComponentFixture<CertTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CertTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
