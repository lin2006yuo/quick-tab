import React from 'react';
import { Tab, CommandDefinition, CommandType } from './types';
import { Tag, XCircle, VolumeX } from 'lucide-react';

// Helper to generate mock data
const generateTabs = (): Tab[] => [
  {
    id: 1,
    title: "Google Gemini API - Developer Guide",
    url: "https://ai.google.dev/gemini-api/docs",
    favIconUrl: "https://www.google.com/favicon.ico",
    isActive: true,
    tags: []
  },
  {
    id: 2,
    title: "React - The Library for Web and Native User Interfaces",
    url: "https://react.dev/",
    favIconUrl: "https://react.dev/favicon.ico",
    isActive: false,
    tags: ["Docs", "Frontend", "Library"]
  },
  {
    id: 3,
    title: "Tailwind CSS - Rapidly build modern websites without ever leaving your HTML",
    url: "https://tailwindcss.com/docs/utility-first",
    favIconUrl: "https://tailwindcss.com/favicon.ico",
    isActive: false,
    tags: ["CSS", "Framework", "Utility", "Design System", "Reference"]
  },
  {
    id: 4,
    title: "JIRA - PROJ-1234: Implement new authentication flow for the mobile application [High Priority]",
    url: "https://company.atlassian.net/browse/PROJ-1234",
    favIconUrl: "", 
    isActive: false,
    tags: ["Work", "Jira", "Urgent", "Backend", "Sprint 42"]
  },
  {
    id: 5,
    title: "GitHub - facebook/react: The library for web and native user interfaces",
    url: "https://github.com/facebook/react",
    favIconUrl: "https://github.com/favicon.ico",
    isActive: false,
    tags: ["Open Source", "Code", "Facebook"]
  },
  {
    id: 6,
    title: "🎧 lofi hip hop radio - beats to relax/study to",
    url: "https://youtube.com/watch?v=jfKfPfyJRdk",
    favIconUrl: "https://youtube.com/favicon.ico",
    isActive: false,
    tags: ["Music", "Background", "Chill"]
  },
  {
    id: 7,
    title: "Stack Overflow - How do I center a div? - Stack Overflow",
    url: "https://stackoverflow.com/questions/1234/how-do-i-center-a-div",
    favIconUrl: "https://stackoverflow.com/favicon.ico",
    isActive: false,
    tags: ["Dev", "Help", "CSS", "Layout", "Flexbox", "Grid"]
  },
  {
    id: 8,
    title: "A very very very very very very very very very very very very very long title that should definitely truncate properly in the ui without breaking the layout",
    url: "https://example.com",
    favIconUrl: "",
    isActive: false,
    tags: ["Testing", "Edge Case"]
  },
  {
    id: 9,
    title: "Tab with many tags",
    url: "https://example.com/tags",
    favIconUrl: "",
    isActive: false,
    tags: ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5", "Tag6", "Tag7", "Tag8", "Tag9", "Tag10", "Tag11", "Tag12"]
  },
  {
    id: 10,
    title: "Tab with long tags",
    url: "https://example.com/longtags",
    favIconUrl: "",
    isActive: false,
    tags: ["Super Long Tag Name For Testing Layout", "Another Extremely Long Tag To Check Overflow"]
  },
  {
    id: 11,
    title: "Docker Hub",
    url: "https://hub.docker.com",
    favIconUrl: "", 
    isActive: false,
    tags: ["DevOps", "Containers"]
  },
  {
    id: 12,
    title: "Figma - Design System v2.0",
    url: "https://figma.com/file/123456",
    favIconUrl: "https://static.figma.com/app/icon/1/favicon.ico",
    isActive: false,
    tags: ["Design", "Work", "Shared"]
  },
  {
    id: 13,
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    favIconUrl: "https://developer.mozilla.org/favicon.ico",
    isActive: false,
    tags: ["Reference"]
  },
  {
    id: 14,
    title: "Vercel Dashboard",
    url: "https://vercel.com/dashboard",
    favIconUrl: "https://assets.vercel.com/image/upload/q_auto/front/favicon/vercel/57x57.png",
    isActive: false,
    tags: ["Deployment", "Hosting"]
  },
  {
    id: 15,
    title: "Notion - Personal Home",
    url: "https://notion.so",
    favIconUrl: "https://www.notion.so/images/favicon.ico",
    isActive: false,
    tags: ["Personal", "Notes", "Planning"]
  }
];

export const INITIAL_TABS = generateTabs();

export const AVAILABLE_COMMANDS: CommandDefinition[] = [
  {
    id: CommandType.MARK,
    trigger: 'mark',
    label: 'Mark Tab',
    description: 'Add a tag to the current tab',
    icon: <Tag className="w-4 h-4" />
  },
  {
    id: CommandType.CLOSE,
    trigger: 'close',
    label: 'Close Tab',
    description: 'Close the current tab (Demo)',
    icon: <XCircle className="w-4 h-4" />
  },
  {
    id: CommandType.MUTE,
    trigger: 'mute',
    label: 'Mute Tab',
    description: 'Mute audio on current tab (Demo)',
    icon: <VolumeX className="w-4 h-4" />
  }
];