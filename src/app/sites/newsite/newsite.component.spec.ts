import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsiteComponent } from './newsite.component';

describe('NewsiteComponent', () => {
  let component: NewsiteComponent;
  let fixture: ComponentFixture<NewsiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewsiteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewsiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
