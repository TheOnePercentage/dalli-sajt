with open('js/app.js', 'r') as f:
    content = f.read()

# Remove the extra }); before the initialization IIFE
content = content.replace(
    '});\n\n// Initialize FeaturedTabs on DOM ready',
    '// Initialize FeaturedTabs on DOM ready'
)

with open('js/app.js', 'w') as f:
    f.write(content)

print('Fixed')