import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlateReaderComponent } from './plate-reader.component';

describe('PlateReaderComponent', () => {
  let component: PlateReaderComponent;
  let fixture: ComponentFixture<PlateReaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlateReaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlateReaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
