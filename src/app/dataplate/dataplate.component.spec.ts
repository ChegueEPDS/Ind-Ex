import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataplateComponent } from './dataplate.component';

describe('DataplateComponent', () => {
  let component: DataplateComponent;
  let fixture: ComponentFixture<DataplateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataplateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
