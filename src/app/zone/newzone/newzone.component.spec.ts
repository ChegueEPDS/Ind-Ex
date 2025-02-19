import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewzoneComponent } from './newzone.component';

describe('NewprojectComponent', () => {
  let component: NewzoneComponent;
  let fixture: ComponentFixture<NewzoneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewzoneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewzoneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
