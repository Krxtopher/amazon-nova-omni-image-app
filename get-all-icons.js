import * as LucideIcons from 'lucide-react';
import { writeFileSync } from 'fs';

// Get all available icon names, filtering out duplicates (Icon suffix versions)
const iconNames = Object.keys(LucideIcons).filter(key => {
    const value = LucideIcons[key];
    return value && typeof value === 'object' && value.$$typeof && !key.endsWith('Icon');
});

console.log(`Found ${iconNames.length} unique icons`);

// Create a comprehensive list with descriptions for the most relevant icons
const iconDescriptions = {
    // Art & Design
    'Palette': 'Color palette - art, painting, design, creativity, colors',
    'Brush': 'Paint brush - painting, art, drawing, creativity, design',
    'Pen': 'Writing pen - writing, drawing, design, creativity, calligraphy',
    'PenTool': 'Design pen tool - vector design, illustration, precision drawing',
    'Paintbrush': 'Paint brush - painting, art, artistic creation, design',
    'Image': 'Picture/image - photography, visual art, graphics, media',
    'Camera': 'Camera - photography, visual capture, art, media',
    'Aperture': 'Camera aperture - photography, focus, precision, technical',
    'Focus': 'Focus/target - precision, attention, clarity, concentration',
    'Crop': 'Crop tool - editing, framing, composition, refinement',
    'Edit': 'Edit/modify - creation, modification, design, customization',
    'Scissors': 'Cutting tool - crafting, precision, editing, creation',
    'Ruler': 'Measuring ruler - precision, technical drawing, accuracy',
    'Compass': 'Drawing compass - geometry, precision, technical design',
    'Drafting': 'Technical drawing - engineering, precision, blueprints',

    // Creative & Abstract
    'Sparkles': 'Magic sparkles - creativity, inspiration, magic, wonder',
    'Wand2': 'Magic wand - creativity, transformation, magic, inspiration',
    'Zap': 'Lightning bolt - energy, power, inspiration, dynamic',
    'Flame': 'Fire flame - passion, energy, creativity, intensity',
    'Heart': 'Heart symbol - love, passion, emotion, care',
    'Diamond': 'Diamond gem - luxury, precision, brilliance, quality',
    'Star': 'Star shape - excellence, achievement, inspiration, guidance',
    'Crown': 'Royal crown - excellence, mastery, achievement, premium',
    'Gem': 'Precious gem - value, quality, refinement, luxury',
    'Trophy': 'Achievement trophy - success, excellence, mastery, recognition',
    'Award': 'Award medal - recognition, achievement, excellence, honor',
    'Target': 'Bullseye target - precision, focus, goals, accuracy',
    'Lightbulb': 'Light bulb - ideas, creativity, innovation, inspiration',
    'Eye': 'Eye symbol - vision, perception, awareness, observation',
    'Feather': 'Feather - lightness, elegance, writing, creativity',

    // Nature & Organic
    'Flower': 'Flower bloom - nature, beauty, growth, organic',
    'Flower2': 'Stylized flower - nature, decoration, beauty, organic',
    'Tree': 'Tree - nature, growth, organic, environmental',
    'Leaf': 'Single leaf - nature, organic, growth, environmental',
    'Sun': 'Sun symbol - energy, warmth, positivity, natural',
    'Moon': 'Moon symbol - mystery, night, cycles, celestial',
    'Cloud': 'Cloud shape - sky, atmosphere, dreamy, soft',
    'Mountain': 'Mountain peak - strength, achievement, natural, majestic',
    'Waves': 'Water waves - flow, movement, natural, dynamic',
    'Butterfly': 'Butterfly - transformation, beauty, delicate, natural',
    'Bird': 'Bird - freedom, flight, natural, graceful',
    'Fish': 'Fish - aquatic, flow, natural, organic',
    'Cat': 'Cat - elegance, independence, grace, mysterious',
    'Dog': 'Dog - loyalty, companionship, friendly, energetic',

    // Tools & Technical
    'Wrench': 'Wrench tool - mechanical, technical, precision, industrial',
    'Hammer': 'Hammer tool - construction, creation, strength, building',
    'Gear': 'Mechanical gear - engineering, precision, technical, systematic',
    'Settings': 'Settings/configuration - technical, customization, control',
    'Cog': 'Cog wheel - mechanical, technical, precision, engineering',
    'Screwdriver': 'Screwdriver - precision, technical, mechanical, detailed',
    'Drill': 'Drill tool - precision, technical, construction, detailed',
    'Saw': 'Saw tool - cutting, precision, craftsmanship, technical',

    // Technology & Digital
    'Monitor': 'Computer monitor - digital, technology, modern, screen',
    'Smartphone': 'Mobile phone - modern, digital, communication, portable',
    'Tablet': 'Tablet device - digital, modern, touch, portable',
    'Laptop': 'Laptop computer - digital, modern, portable, technology',
    'Headphones': 'Headphones - audio, music, sound, listening',
    'Mic': 'Microphone - audio, voice, recording, communication',
    'Radio': 'Radio device - communication, broadcast, audio, vintage',
    'Wifi': 'WiFi signal - connectivity, wireless, modern, digital',
    'Bluetooth': 'Bluetooth - wireless, connectivity, modern, pairing',
    'Code': 'Code brackets - programming, technical, digital, development',
    'Terminal': 'Command terminal - technical, programming, advanced, system',
    'Database': 'Database - data, storage, technical, systematic',
    'Server': 'Server - technology, hosting, technical, infrastructure',
    'Cloud': 'Cloud computing - modern, digital, storage, connectivity',

    // Music & Audio
    'Music': 'Musical note - music, audio, rhythm, creative',
    'Volume2': 'Volume/sound - audio, music, sound, listening',
    'Play': 'Play button - media, audio, video, entertainment',
    'Pause': 'Pause button - media, control, audio, video',
    'SkipForward': 'Skip forward - media, progression, audio, video',
    'Repeat': 'Repeat/loop - cycles, music, audio, continuous',
    'Guitar': 'Guitar instrument - music, strings, creative, artistic',
    'Piano': 'Piano keys - music, classical, creative, artistic',
    'Drum': 'Drum - rhythm, music, percussion, energetic',
    'Headphones': 'Audio headphones - music, listening, sound, audio',

    // Shapes & Geometry
    'Circle': 'Circle shape - unity, completeness, geometric, simple',
    'Square': 'Square shape - stability, structure, geometric, balanced',
    'Triangle': 'Triangle shape - dynamic, direction, geometric, pointed',
    'Hexagon': 'Hexagon shape - complex, geometric, structured, technical',
    'Pentagon': 'Pentagon shape - geometric, structured, angular, complex',
    'Octagon': 'Octagon shape - geometric, stop, structured, angular',

    // Objects & Items
    'Book': 'Book - knowledge, learning, literature, education',
    'BookOpen': 'Open book - reading, knowledge, learning, education',
    'Key': 'Key - access, security, unlock, important',
    'Lock': 'Lock - security, protection, privacy, closed',
    'Gift': 'Gift box - present, surprise, giving, celebration',
    'Medal': 'Medal - achievement, recognition, success, honor',
    'Flag': 'Flag - identity, representation, achievement, marking',
    'Bell': 'Bell - notification, attention, sound, alert',
    'Clock': 'Clock - time, schedule, precision, timing',
    'Calendar': 'Calendar - dates, planning, organization, time',
    'Map': 'Map - navigation, location, geography, exploration',
    'Compass': 'Navigation compass - direction, guidance, exploration',
    'Anchor': 'Ship anchor - stability, maritime, grounding, strength',
    'Plane': 'Airplane - travel, speed, elevation, journey',
    'Car': 'Automobile - transportation, modern, mobility, speed',
    'Bike': 'Bicycle - eco-friendly, health, simple, efficient',
    'Train': 'Train - transportation, journey, systematic, powerful',
    'Rocket': 'Rocket - innovation, speed, launch, ambitious',
    'Ship': 'Ship - maritime, journey, exploration, adventure',

    // Emotions & Expressions
    'Smile': 'Smiling face - happiness, positive, friendly, joy',
    'Frown': 'Frowning face - sadness, negative, concern, serious',
    'Meh': 'Neutral face - indifferent, balanced, calm, neutral',
    'Laugh': 'Laughing - joy, humor, happiness, lighthearted',
    'ThumbsUp': 'Thumbs up - approval, positive, success, agreement',
    'ThumbsDown': 'Thumbs down - disapproval, negative, rejection',

    // Food & Organic
    'Apple': 'Apple fruit - health, natural, fresh, organic',
    'Coffee': 'Coffee cup - energy, warmth, comfort, routine',
    'Wine': 'Wine glass - sophistication, celebration, relaxation',
    'Cake': 'Cake - celebration, sweetness, joy, special occasions',
    'Pizza': 'Pizza slice - casual, comfort, sharing, enjoyment',
    'Bread': 'Bread loaf - basic, nourishment, traditional, comfort',
    'Carrot': 'Carrot - health, natural, organic, nutrition',
    'Fish': 'Fish - aquatic, protein, natural, healthy',
    'Beef': 'Beef/meat - protein, strength, hearty, traditional',

    // Weather & Elements
    'Sun': 'Sunshine - warmth, energy, positive, bright',
    'CloudRain': 'Rain cloud - weather, atmosphere, mood, natural',
    'Snow': 'Snowflake - cold, winter, unique, delicate',
    'Wind': 'Wind - movement, air, natural, dynamic',
    'Lightning': 'Lightning bolt - power, energy, dramatic, natural',
    'Rainbow': 'Rainbow - color, hope, beauty, natural phenomenon',

    // Business & Professional
    'Briefcase': 'Briefcase - business, professional, work, formal',
    'Building': 'Building - business, structure, professional, urban',
    'Bank': 'Bank building - finance, business, institutional, formal',
    'Factory': 'Factory - industrial, production, manufacturing, systematic',
    'Store': 'Store/shop - retail, business, commercial, service',
    'Office': 'Office building - professional, business, corporate, formal',

    // Communication & Social
    'MessageCircle': 'Message bubble - communication, chat, social, conversation',
    'Mail': 'Email/mail - communication, message, contact, formal',
    'Phone': 'Telephone - communication, contact, conversation, connection',
    'Users': 'Multiple users - community, social, group, collaboration',
    'User': 'Single user - individual, person, profile, identity',
    'Globe': 'World globe - global, international, comprehensive, universal',
    'Share': 'Share symbol - distribution, social, spreading, connection',
    'Link': 'Link/connection - networking, connection, relationship, joining'
};

// Filter to only include icons that exist and have descriptions
const validIcons = iconNames.filter(name => iconDescriptions[name]);
const missingIcons = iconNames.filter(name => !iconDescriptions[name]);

console.log(`Described ${validIcons.length} icons out of ${iconNames.length} total`);
console.log(`Missing descriptions for ${missingIcons.length} icons`);

// Create the output with descriptions
let output = `# Lucide React Icons for Persona Generation\n\n`;
output += `Total available icons: ${iconNames.length}\n`;
output += `Icons with descriptions: ${validIcons.length}\n\n`;

validIcons.sort().forEach(iconName => {
    output += `${iconName}: ${iconDescriptions[iconName]}\n`;
});

writeFileSync('persona-icons-with-descriptions.txt', output);
console.log('Icon descriptions written to persona-icons-with-descriptions.txt');