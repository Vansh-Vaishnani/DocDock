import sys

file_path = r'c:\Users\vansh\OneDrive\Desktop\DocDock\DocDock\apps\api\src\modules\review\review.routes.ts'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_line = "router.get('/reviews/me', authenticate, requireRole(['doctor']), controller.listMyReviews.bind(controller));\n"
result = []

for i, line in enumerate(lines):
    result.append(line)
    if 'listDoctorReviews' in line:
        result.append(new_line)

with open(file_path, 'w') as f:
    f.writelines(result)

print("Route added successfully")
