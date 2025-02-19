import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignToProjectDialogComponent } from './assign-to-project-dialog.component';

describe('AssignToProjectDialogComponent', () => {
  let component: AssignToProjectDialogComponent;
  let fixture: ComponentFixture<AssignToProjectDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignToProjectDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignToProjectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
