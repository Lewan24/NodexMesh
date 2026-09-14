import { Project } from '@/entities/project/types';
import { DEMO_USER_ID } from '@/entities/user/mockUsers';

export const nodexMeshDemoProject: Project = {
  "id": "2ca245a9-e30c-48f1-bac6-2bb4e18b1898",
  "ownerId": DEMO_USER_ID,
  "name": "NodexMesh",
  "color": "#059669",
  "items": [
    {
      "title": "Preview DEMO",
      "color": "#059669",
      "id": "1a9f34d4-20d8-4882-bcc7-932af45f5ae6",
      "type": "frame",
      "x": 444,
      "y": 1760,
      "zIndex": 0,
      "width": 1336,
      "height": 720,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Plans for Upcoming Work",
      "color": "#FF6B8A",
      "id": "2648a469-86a3-417c-bbc9-989298ce3559",
      "type": "frame",
      "x": 1872,
      "y": 1088,
      "zIndex": 0,
      "width": 1852,
      "height": 644,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh Application Overview",
      "opacity": 0.3,
      "color": "#97B6E7",
      "typography": {
        "fontSize": 14,
        "textAlign": "left"
      },
      "id": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "type": "frame",
      "x": 444,
      "y": 252,
      "zIndex": 0,
      "width": 1336,
      "height": 1268,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh TODO now",
      "columns": [
        {
          "id": "8b3d6549-e14d-476d-aad8-922068ab44ca",
          "title": "Nice to do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "6b8e061f-713d-47e9-80e6-1a6e7f51a0ad",
              "text": "Implement keyboard moving, editing etc. also in blocks like mindmap or diagram",
              "done": false
            },
            {
              "id": "ab0274fa-5623-4e77-ba4a-3e7534e61638",
              "text": "Implement MindMapBlock",
              "done": true
            },
            {
              "id": "c8a8147b-cfe4-4040-bbf2-2a51f85deb33",
              "text": "Make in timeline tasks show and dissappear when moving to the left or right",
              "done": true
            },
            {
              "id": "a972df58-4930-443b-9cfd-6d69d54ef87c",
              "text": "Implement IconBlock",
              "done": true
            },
            {
              "id": "b0aedfdf-67bf-4751-bc79-317c7af2a0e9",
              "text": "Add column expansion to match the Kanban width",
              "done": true
            },
            {
              "id": "57e666fe-7791-40ba-842a-b6992654a3bd",
              "text": "Check and add appropriate cursors where needed (buttons, etc.)",
              "done": true
            },
            {
              "id": "5156f5e8-08ec-4ab8-9a75-8fc47f7f5659",
              "text": "Implement copy style and paste style on items like color or typography and font size",
              "done": true
            },
            {
              "id": "e3e48ebf-5c64-4a00-befb-a50db244ec85",
              "text": "Change default theme colors to better ones",
              "done": true
            },
            {
              "id": "4b80bc94-79a3-4226-ac13-3f94e400fab1",
              "text": "Implement arrows flexibility",
              "done": true
            },
            {
              "id": "519c95c5-372c-4edb-a2db-e63d6026be5a",
              "text": "Increase the default item width",
              "done": true
            },
            {
              "id": "6718dd7a-b374-4916-987e-d74ab5ef9698",
              "text": "Change the dark mode background to a grayer shade",
              "done": true
            },
            {
              "id": "6fcc9a9f-f416-4d50-8f3b-c3405939eae2",
              "text": "Check that appropriate animations are used everywhere and add them where needed",
              "done": true
            },
            {
              "id": "a816b10c-6ca4-422c-838e-eeba3d6108e4",
              "text": "Add changing colors in kanban columns",
              "done": true
            },
            {
              "id": "a368e5f1-e46e-490b-83b0-7471c2e90210",
              "text": "Implement multi selected drawing to change color and width for all of them",
              "done": true
            },
            {
              "id": "d6a3ec18-204a-4be0-b857-29936aa127d9",
              "text": "Add more funny and nice hand writting fonts",
              "done": true
            },
            {
              "id": "e9bce169-e6b5-43dc-baee-a505649d824f",
              "text": "Change new items to be more squares instead of rounded",
              "done": true
            },
            {
              "id": "a8a3a9ad-812e-4bd4-be43-8b181a4b4821",
              "text": "Add a new Divider item",
              "done": true
            }
          ],
          "width": 362
        },
        {
          "id": "89e56718-5017-4952-8298-66d3014b51da",
          "title": "Important",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "c635a071-de2e-48e8-95f7-cbe9ce37f384",
              "text": "Implement zooming in mind map block",
              "done": true
            },
            {
              "id": "8ed7dfa9-d125-4657-abf4-d24354182427",
              "text": "Add moving around mindmap with mouse instead of just scrolls",
              "done": true
            },
            {
              "id": "fca946c4-2327-4b8a-856e-9f678e5c1a8b",
              "text": "Fix and adjust mindmap",
              "done": true
            },
            {
              "id": "f3971a27-e462-40a0-91a4-72cb48ccf836",
              "text": "Implement go to items on enter while highlighting them from searchbox",
              "done": true
            },
            {
              "id": "6c5aa8ef-ae88-41eb-aa1b-87f61b3e4bb5",
              "text": "Implement button for drawings to make them smooth",
              "done": true
            },
            {
              "id": "5d6785aa-745c-4660-95fe-b7c56abf05c6",
              "text": "Implement new way to update demo projekt",
              "done": true
            },
            {
              "id": "55f0cf9b-300b-47a0-9511-da88494af183",
              "text": "Implement horizontal layout for diagram",
              "done": true
            },
            {
              "id": "663f74da-32fb-4903-a9d0-be484f2ee714",
              "text": "Change the float numbers like x, y, pressure etc to make it smaller and upgrade the efficiency",
              "done": true
            },
            {
              "id": "e501c9ea-d551-456f-90d6-a76be1b5070c",
              "text": "One click on arrow to cleate siblin items dont work on mobile device",
              "done": true
            },
            {
              "id": "571013af-7b7d-4263-8101-eccd8e1367a6",
              "text": "Check all the code and files and make them better readable for humans",
              "done": true
            },
            {
              "id": "8c0c1fe0-460b-4ea0-9839-3918e155be66",
              "text": "Implement column resizing of tasks in timeline",
              "done": true
            },
            {
              "id": "2918631c-0d6e-4ade-ae43-f29c550c3578",
              "text": "Implement reordering fields in database block",
              "done": true
            },
            {
              "id": "b728ce44-8b8d-46d7-9255-97570b9cdb3a",
              "text": "Fix Database diagram preview, not working properly connections",
              "done": true
            },
            {
              "id": "27f26fee-6079-4ccc-b654-763d16843cb0",
              "text": "Change editbar colors to accents and make them theme related",
              "done": true
            },
            {
              "id": "63812cab-d9f8-400a-8587-0f1b7c5fcd79",
              "text": "Fix task height in checklists",
              "done": true
            },
            {
              "id": "36957d1f-36eb-4923-82e8-803b209a6343",
              "text": "Implement DbDiagramBlock",
              "done": true
            },
            {
              "id": "a2e4a384-1d80-4247-abef-16c55c97a6c7",
              "text": "Implement manual cleaning projects trash",
              "done": true
            },
            {
              "id": "ae2989ed-4791-4d26-87b6-e0fbdfb55589",
              "text": "Update readme",
              "done": true
            },
            {
              "id": "2609c67b-d8db-4a87-8cb8-243a40c00907",
              "text": "Add auto-fit to checklists",
              "done": true
            },
            {
              "id": "115c5853-6434-4e99-a7ed-afd716439577",
              "text": "Add vertical text alignment to item alignment options",
              "done": true
            },
            {
              "id": "2dee4133-dda8-443f-9198-059effca02be",
              "text": "Adjust diagramblock",
              "done": true
            },
            {
              "id": "a618870b-5f14-492a-9303-793891faba31",
              "text": "Fix timeline after reordering schedule the milestones should also reorder",
              "done": true
            },
            {
              "id": "bd30f41e-c30d-4212-9150-47dc5125bc0b",
              "text": "Fix youtube embed video to edit video settings and captions",
              "done": true
            },
            {
              "id": "8044a2ce-570d-4ddf-a435-d40d5fc865ab",
              "text": "Add compability to moving checklist items to kanban, and from kanban to checklist (.items are basicaly the same)",
              "done": true
            },
            {
              "id": "c53df52d-f2e7-449a-ac26-def6b8412ac7",
              "text": "Fix data-scroll in timeline",
              "done": true
            },
            {
              "id": "db83522a-b84e-479e-9d1f-f226ad0c783d",
              "text": "Implement moving columns in kanban",
              "done": true
            },
            {
              "id": "bc5447e6-0210-4a89-aa74-52f9ed3cdb52",
              "text": "Fix kanban add cards buttons to be under last task instead of botton of item",
              "done": true
            }
          ],
          "width": 395
        },
        {
          "id": "47fdc4a7-ff3d-4336-b3b5-d7c9b9c3a665",
          "title": "Must have",
          "color": "#02A0A0",
          "cards": [
            {
              "id": "2ed12db2-89e7-4e3b-b4c0-da9f81b28a52",
              "text": "Implement export/import projects",
              "done": true
            },
            {
              "id": "c56be333-7eaf-4d16-bd27-4315cd5885ca",
              "text": "Fix on mobile devices moving items like kanban, now it opens the context menu instead of moving",
              "done": true
            },
            {
              "id": "0c81ae39-0d68-43fb-bdc5-d2d7c5a3c5e0",
              "text": "Implement mobile devices compability",
              "done": true
            },
            {
              "id": "e5053759-ac5c-4f2d-bb85-835ca3bbeb6b",
              "text": "Plan database scheme",
              "done": true
            },
            {
              "id": "1dc09034-38c2-4f04-bb19-5ace1f720978",
              "text": "Plan backend",
              "done": true
            },
            {
              "id": "d95007a9-50c4-418d-8a98-4e4fbe12bab0",
              "text": "Show the item center while dragging for easier positioning relative to other items on the board",
              "done": true
            },
            {
              "id": "f289c1f0-50db-4ebb-b712-15eaa0f452d7",
              "text": "Implement theme colors changing and saving that data",
              "done": true
            },
            {
              "id": "fb7ba948-cbf2-4e7c-bfd3-c55b9bd82ca4",
              "text": "Add long alignment guides while dragging so items can be aligned vertically and horizontally with distant items",
              "done": true
            },
            {
              "id": "29b8edd4-0466-4dc1-a99c-a0a1db4a9f22",
              "text": "Fix the drag preview so it shows the item’s current size instead of its default size",
              "done": true
            },
            {
              "id": "81871895-0f12-48e8-a14e-11a9990ed417",
              "text": "Add the ability to rename a project",
              "done": true
            },
            {
              "id": "f252a850-e457-4062-8403-ba73df5b7720",
              "text": "Implement drawing on canvas",
              "done": true
            },
            {
              "id": "ff765f27-06e5-4f96-ab81-1f3cecf4c32b",
              "text": "Change default font family to better one",
              "done": true
            },
            {
              "id": "99897c1b-5094-4ee8-b9bf-52067facd96e",
              "text": "Fix timelineblock (implement reordering rows)",
              "done": true
            },
            {
              "id": "bf312ed4-875e-4f7d-95b0-d2ceb26a1e9f",
              "text": "Fix embedBlock for yt videos to instant interact instead of clicking interract",
              "done": true
            },
            {
              "id": "f4396fe1-f067-418c-aed8-2868ad53c8f4",
              "text": "Fix document block error",
              "done": true
            },
            {
              "id": "647c25eb-0c9f-4a2d-ab4e-3b8fc6350bf1",
              "text": "Fix the app bar occasionally bugging out and disappearing",
              "done": true
            },
            {
              "id": "1061f56d-2837-4b29-850b-31b8fba7d9e5",
              "text": "Implement a project trash bin with project deletion and restoration",
              "done": true
            }
          ],
          "width": 362
        }
      ],
      "typography": {
        "fontSize": 14
      },
      "color": "#2E2E2E",
      "topColor": "#FF6B8A",
      "gradient": {
        "from": "#000000",
        "to": "#2d006b",
        "angle": 135,
        "kind": "radial"
      },
      "id": "1f4b69d7-9ca8-44e5-a863-abcae1b6fb19",
      "type": "kanban",
      "x": 1884,
      "y": 252,
      "zIndex": 5,
      "width": 1208,
      "height": 628,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "content": "A free alternative to Milanote",
      "size": "lg",
      "typography": {
        "textAlign": "center",
        "fontSize": 30,
        "italic": true
      },
      "textAlign": "center",
      "color": "#eff6ff",
      "id": "ae8a20be-2f7a-40e6-9cf4-2aa03b38cd79",
      "type": "text",
      "x": 1472,
      "y": 64,
      "zIndex": 6,
      "width": 720,
      "height": 60,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh",
      "size": "lg",
      "typography": {
        "fontSize": 40,
        "textAlign": "center",
        "bold": true
      },
      "textAlign": "center",
      "color": "#fefce8",
      "id": "a4ae454e-ec87-4616-8a41-a949b3c8251e",
      "type": "text",
      "x": 1664,
      "y": 4,
      "zIndex": 7,
      "width": 336,
      "height": 74,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "The application is primarily a free and interesting alternative to the well-known Milanote platform.\n\nThe goal is to make it available to everyone and easy to run locally using\nDocker Compose",
      "typography": {
        "textAlign": "center",
        "fontFamily": "short-stack"
      },
      "color": "#fdf4ff",
      "colorRole": "default",
      "id": "89c31dc2-bba4-4df2-859f-6f4e6e93df5b",
      "type": "note",
      "x": 1024,
      "y": 288,
      "zIndex": 8,
      "width": 320,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh\nThe application will offer many familiar features to make the system pleasant and convenient to use.\nIt will also include additional tools and quality-of-life features such as:\n\n- Expandable Kanban boards\n- Smooth animations and task/item statuses\n- Grouping\n- An edit bar with extensive customization options\n- And much more\n\nThe application will remain free, actively developed, and supported, so you can report bugs and expect updates with fixes.\nYou can also contribute to the project using the project page below:",
      "typography": {
        "bold": false,
        "fontSize": 14,
        "textAlign": "center"
      },
      "color": "#fce7f3",
      "colorRole": "accent4",
      "id": "6a2c31df-c284-4909-95a6-1420f7a6464a",
      "type": "note",
      "x": 1424,
      "y": 288,
      "zIndex": 9,
      "width": 320,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "color": "#F7CAE3",
      "topColor": "#7C3AED",
      "colorRole": "accent3",
      "id": "a9107f6a-4bb1-450b-a9c2-99b3c2f9e169",
      "type": "link",
      "x": 1424,
      "y": 896,
      "zIndex": 10,
      "width": 320,
      "height": 144,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "Feel free to fork the project, improve the code, add useful features or fixes, and submit a Pull Request. Contributions and collaboration are welcome.",
      "typography": {
        "textAlign": "center"
      },
      "color": "#fce7f3",
      "topColor": "#7C3AED",
      "colorRole": "accent4",
      "id": "a0d7b915-5713-428a-8d7e-d532583d3402",
      "type": "note",
      "x": 1424,
      "y": 1088,
      "zIndex": 11,
      "width": 320,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "All required information, commands, and setup recommendations are available on the project page",
      "typography": {
        "textAlign": "center"
      },
      "color": "#FDF4FF",
      "colorRole": "accent3",
      "id": "1495af0e-c14f-4b34-8899-a28a59e3f1b3",
      "type": "note",
      "x": 1024,
      "y": 608,
      "zIndex": 12,
      "width": 320,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 1476,
      "y2": 896,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 3,
      "color": "#7C3AED",
      "id": "43615987-55ff-4530-86e2-96a9a4969bad",
      "type": "line",
      "x": 1306,
      "y": 778,
      "zIndex": 13,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "1495af0e-c14f-4b34-8899-a28a59e3f1b3",
      "endItemId": "a9107f6a-4bb1-450b-a9c2-99b3c2f9e169"
    },
    {
      "content": "NodexMesh is still under active development and continuous improvement. A working demo is currently available to everyone for free and can be opened directly in a browser using the link in the project’s GitHub repository.\n\nAll demo data is stored exclusively in the browser’s local storage, so changes and data created in the DEMO version may disappear after some updates.\n\nTo reset the data, clear local storage in your browser’s developer tools (F12).\nAlternatively, open the user menu in the top-right corner and use the\nReset DEMO\nbutton.",
      "typography": {
        "textAlign": "center"
      },
      "color": "#fff7ed",
      "colorRole": "accent2",
      "id": "45000d22-993b-404e-bb1c-53b93f8ccc03",
      "type": "note",
      "x": 1024,
      "y": 811,
      "zIndex": 14,
      "width": 320,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png?raw=true",
      "caption": "https://github.com/Lewan24/NodexMesh/blob/main/Assets/Preview.png",
      "imgHeight": 620,
      "variant": "card",
      "typography": {
        "textAlign": "center"
      },
      "color": "#ffffff",
      "id": "5a3cc79a-9f74-48a2-9a02-3ae0038a52f4",
      "type": "image",
      "x": 480,
      "y": 1796,
      "zIndex": 15,
      "width": 1264,
      "height": 620,
      "frameId": "1a9f34d4-20d8-4882-bcc7-932af45f5ae6",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Future Plans",
      "entries": [
        {
          "id": "9d171f2a-238e-4901-99db-ecba6afb544e",
          "text": "Custom application color themes",
          "done": true
        },
        {
          "id": "c2a040b4-127a-46d8-8c38-e363d46ada5b",
          "text": "Add a global trash bin for items so previously deleted elements can be restored",
          "done": false
        },
        {
          "id": "c0248a98-1682-42af-8a3f-4f1150627b26",
          "text": "Implement project export and import between NodexMesh instances",
          "done": false
        },
        {
          "id": "45f976ec-253a-42fb-bb09-668fd7b4123f",
          "text": "API in C# .NET 10",
          "done": false
        },
        {
          "id": "edae95b0-232b-4b48-b791-b526de8a8e54",
          "text": "Follow the OWASP Top 10 when implementing the API",
          "done": false
        },
        {
          "id": "9b1cb7dc-da3e-43f9-9c54-46c1a457e323",
          "text": "Display images from the user’s library instead of requiring a link (link optional)",
          "done": false
        },
        {
          "id": "8cf0db9e-3cfd-41e2-82f0-4aa704faa8a1",
          "text": "Real-time collaboration (SignalR or something similar)",
          "done": false
        },
        {
          "id": "cdc40354-fc31-4781-bb18-8c67b126a164",
          "text": "Read-only project sharing",
          "done": false
        }
      ],
      "typography": {
        "fontSize": 16,
        "textAlign": "left"
      },
      "color": "#ffffff",
      "topColor": "#7C3AED",
      "id": "029af6a9-97ad-43d1-a460-c27407e9dc10",
      "type": "checklist",
      "x": 1908,
      "y": 1124,
      "zIndex": 16,
      "width": 580,
      "frameId": "2648a469-86a3-417c-bbc9-989298ce3559",
      "locked": true,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "x2": 2603,
      "y2": 880,
      "arrowStart": true,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "TODO Lists",
      "labelOffset": 21,
      "labelFontSize": 21,
      "labelMode": "follow-line",
      "color": "#02A0A0",
      "id": "1a0aa6e9-9489-4382-85bd-f15467d788cf",
      "type": "line",
      "x": 2680,
      "y": 1088,
      "zIndex": 17,
      "frameId": "2648a469-86a3-417c-bbc9-989298ce3559",
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "2648a469-86a3-417c-bbc9-989298ce3559",
      "endItemId": "1f4b69d7-9ca8-44e5-a863-abcae1b6fb19"
    },
    {
      "content": "The API will be built with\nC# .NET 10\n\nThe API is planned as a secure system designed with the\nOWASP Top 10\nin mind.\n\nThe API will run in a separate container, with the whole system defined in a single\ndocker-compose.yml\nfile so the application can be started easily and containers can be updated without hassle.\n\nAll required instructions, recommendations, and important information are available in the relevant sections of the project’s GitHub page.",
      "typography": {
        "textAlign": "center",
        "fontFamily": "short-stack"
      },
      "color": "#fdf4ff",
      "colorRole": "default",
      "id": "300279cd-c59c-4700-a08b-05db50d9e262",
      "type": "note",
      "x": 480,
      "y": 560,
      "zIndex": 18,
      "width": 448,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "content": "Api",
      "size": "lg",
      "typography": {
        "textAlign": "center",
        "bold": true,
        "fontSize": 32
      },
      "textAlign": "center",
      "topColor": "#7C3AED",
      "colorRole": "accent5",
      "id": "28ee8e28-ffaf-4cbd-8de1-d3a219272ee4",
      "type": "text",
      "x": 608,
      "y": 500,
      "zIndex": 19,
      "width": 192,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "New Tools and Functionalities",
      "entries": [
        {
          "id": "f304baec-4d52-4cb3-b67d-778969781a0c",
          "text": "Mind Map with connections, automatic layout, etc.",
          "done": false
        },
        {
          "id": "8fc1815c-a5c8-4a0d-a320-548e4ef1c895",
          "text": "Bookmarks for saving important board locations for quick access later",
          "done": false
        },
        {
          "id": "1588e730-1765-4baa-b588-73a50ad667fa",
          "text": "Sub-board node / portal for opening a new canvas or navigating to another project",
          "done": false
        },
        {
          "id": "f7efa9da-e5d5-40b0-8ea6-b2fc0501cf3b",
          "text": "IconBlock - selectable custom icons or icons loaded from a link",
          "done": true
        },
        {
          "id": "3c996fef-3237-4d39-a675-2f0507662e45",
          "text": "DbDiagramBlock - item to plan and prepare version of database like tables, relations etc",
          "done": true
        }
      ],
      "color": "#ffffff",
      "topColor": "#059669",
      "typography": {
        "fontFamily": "short-stack"
      },
      "id": "469e753e-fe0a-410f-8163-512d315628ac",
      "type": "checklist",
      "x": 2528,
      "y": 1124,
      "zIndex": 20,
      "width": 616,
      "frameId": "2648a469-86a3-417c-bbc9-989298ce3559",
      "locked": true,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "content": "Search for #todo in the app bar to display all items marked as tasks",
      "size": "lg",
      "typography": {
        "fontSize": 32,
        "textAlign": "center",
        "verticalAlign": "middle"
      },
      "color": "#0d2a35",
      "id": "93efa07d-9fe9-4b9d-983c-781342743340",
      "type": "text",
      "x": 444,
      "y": 1568,
      "zIndex": 21,
      "width": 1336,
      "height": 98,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Done",
      "entries": [
        {
          "id": "fedd58e9-6d22-42f9-9d95-2bb8093af3b0",
          "text": "Lock items to prevent accidental movement",
          "done": true
        },
        {
          "id": "753b6d42-72e4-4da2-aead-9595b2015277",
          "text": "Assign tags to items and highlight items when a tag is selected",
          "done": true
        },
        {
          "id": "84508a3f-c8c0-4d34-918e-d26446eb9a1e",
          "text": "Labels on arrows",
          "done": true
        },
        {
          "id": "851a68ed-b652-4bce-b36e-b3c77295f362",
          "text": "Automatically create arrows from a selected item",
          "done": true
        },
        {
          "id": "ddc4641b-4ec6-4478-b967-6f5ac38fbdf6",
          "text": "General comments and comments attached to specific items",
          "done": true
        },
        {
          "id": "d8fb34f2-178d-4e72-abdc-447ca3e8ecce",
          "text": "Filter and search the board for specific text, tags, etc.",
          "done": true
        },
        {
          "id": "360068c0-59aa-4de8-8dcc-46f6d0b0901f",
          "text": "Divider",
          "done": true
        },
        {
          "id": "ea3616e3-2126-4e83-b1a9-7efa148d9fc5",
          "text": "Something like cards dispenser in miro - block with cards, label and card color, dragging card is creating a note with center justify in vertical and horizontal",
          "done": true
        },
        {
          "id": "6bbb9bda-5e19-4ad3-8015-95f39f845e79",
          "text": "One click on arrow creates same empy item like note creates a note with its color and settings etc and attachted arrow",
          "done": true
        },
        {
          "id": "36ef9b9b-1418-4c8f-bc5f-a916f9fc2142",
          "text": "DocumentBlock - more advanced note with specific lines and text styles etc",
          "done": true
        },
        {
          "id": "ab0e25eb-a2b8-4e56-95e6-b5c6a9a52e94",
          "text": "EmbedBlock - display content such as a YouTube video, image, or website",
          "done": true
        },
        {
          "id": "197c89bc-c61e-4b20-9c21-d0ce47f53c61",
          "text": "DiagramBlock",
          "done": true
        },
        {
          "id": "aeb78c99-4703-4c2d-9c07-396fb2a6a36d",
          "text": "CodeBlock - nicely formatted code display with language selection and default syntax highlighting",
          "done": true
        },
        {
          "id": "dbe5c4d3-8875-4f23-bb70-b3f258db7e6c",
          "text": "Project management",
          "done": true
        },
        {
          "id": "7733e631-e775-438f-90a3-7e316d9900b5",
          "text": "TimelineBlock - version simple with just date and label and more advances with weeks, tasks etc",
          "done": true
        },
        {
          "id": "e85c1508-6ca6-4d2a-82e4-0078b79af6b3",
          "text": "Context menu with actions such as copy, paste, duplicate, delete, etc.",
          "done": true
        },
        {
          "id": "aaac8d1b-e7fd-44ce-95bf-68eacae02b94",
          "text": "Add more font families, more funny ones, some for like hand writing or sans serif etc",
          "done": true
        },
        {
          "id": "3f94a3fc-8da4-40ac-99b2-3b77804e27f8",
          "text": "Drawing - drawing on canvas",
          "done": true
        }
      ],
      "color": "#ffffff",
      "id": "cdac744d-59f0-497d-833b-0625aacef73f",
      "type": "checklist",
      "x": 3192,
      "y": 1124,
      "zIndex": 22,
      "width": 496,
      "height": 544,
      "frameId": "2648a469-86a3-417c-bbc9-989298ce3559",
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh todo timeline",
      "mode": "schedule",
      "tasks": [
        {
          "id": "2cf8897b-0d9c-44fa-bdb1-4bbcb988581a",
          "title": "Fix now problems (kanban)",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "3acd19d9-d816-46f1-89ae-244872fe6ad5",
              "text": "DocumentBlock is throwing error",
              "done": true
            },
            {
              "id": "0aa7b144-df10-444d-8150-21b7378af483",
              "text": "Add more fonts to app",
              "done": true
            }
          ]
        },
        {
          "id": "34ab7659-fc6b-4a84-9e4d-a380c7ad35ee",
          "title": "Implement context menu",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "7e0c157e-9468-4ab8-ac70-f1e4fc867264",
          "title": "Fixes from kanban",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "bcb98ef4-eb27-4d17-8197-5115af8dfd9e",
              "text": "Timeline",
              "done": true
            },
            {
              "id": "7a6b63f1-b903-466b-a6bf-c430fd5ec86a",
              "text": "Kanban",
              "done": true
            }
          ]
        },
        {
          "id": "ae67a33f-16fd-49e7-a1f5-d97026ccd610",
          "title": "Implement drawing on canvas",
          "start": "2026-09-10",
          "end": "2026-09-11",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "5329be58-a650-4bc3-8126-6eb52182f518",
          "title": "Test #1",
          "start": "2026-09-10",
          "end": "2026-09-10",
          "done": true,
          "color": "#ff0000",
          "checklist": []
        },
        {
          "id": "ba4f0d36-b5fc-4f99-8f40-79b78e7bafba",
          "title": "Test #1 Fixes",
          "start": "2026-09-11",
          "end": "2026-09-14",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "460df4fc-d325-4aa6-a8a9-d0a4f99df8d8",
          "title": "Implement Database Diagram",
          "start": "2026-09-11",
          "end": "2026-09-12",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "b11b25d9-c321-4513-8d6c-5d26aca884b6",
          "title": "hotfixes from kanban",
          "start": "2026-09-11",
          "end": "2026-09-11",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "ac16eac8-73a1-45fc-a0c2-33525bb16ff6",
              "text": "Implement editbar for drawing to change colors and size when multi selected",
              "done": true
            },
            {
              "id": "ce24ea8a-289a-46be-9683-d9338f2dd198",
              "text": "Auto Adjust columns width in kanban when resizing kanban",
              "done": true
            }
          ]
        },
        {
          "id": "e6a48aa6-d16c-48d8-af8b-c714faf8f996",
          "title": "Kanban fixes",
          "start": "2026-09-12",
          "end": "2026-09-14",
          "done": true,
          "color": "#000000",
          "checklist": []
        },
        {
          "id": "20cebd90-6d07-41b6-96b1-63d0603d57f0",
          "title": "Implement new blocks",
          "start": "2026-09-13",
          "end": "2026-09-14",
          "done": true,
          "color": "#000000",
          "checklist": [
            {
              "id": "dde96d36-5d00-42ce-be0d-87b62bf6b3c4",
              "text": "IconBlock",
              "done": true
            },
            {
              "id": "b117e5d0-6d65-47e2-86ae-092d01b905a6",
              "text": "MindmapBlock",
              "done": true
            }
          ]
        },
        {
          "id": "97aec218-9703-47a9-9013-56603aaccf15",
          "title": "Test #2",
          "start": "2026-09-15",
          "end": "2026-09-16",
          "done": false,
          "color": "#ed4040",
          "checklist": []
        },
        {
          "id": "f79cbf21-ddbe-4f98-824e-e3c4d7051e3f",
          "title": "Implement mobile devices compability",
          "start": "2026-09-12",
          "end": "2026-09-16",
          "done": true,
          "color": "#0d39e7",
          "checklist": []
        },
        {
          "id": "78d9a9f7-30e0-4086-aae6-792ab639d9e6",
          "title": "API Planning",
          "start": "2026-09-10",
          "end": "2026-09-22",
          "done": false,
          "color": "#7c40ed",
          "checklist": []
        },
        {
          "id": "8f2ec4bc-110b-41c1-8228-561f32de3141",
          "title": "API Implementation",
          "start": "2026-09-20",
          "end": "2026-10-06",
          "done": false,
          "color": "#7c3aed",
          "checklist": []
        }
      ],
      "taskColumnWidth": 304,
      "color": "#ffffff",
      "id": "d9aefd40-b8a0-45eb-8f74-7beabad93565",
      "type": "timeline",
      "x": 4560,
      "y": 252,
      "zIndex": 23,
      "width": 1440,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": [
        "todo"
      ]
    },
    {
      "divider": true,
      "x2": 1824,
      "y2": 2480,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "color": "#000000",
      "id": "b09c8c81-a4eb-4e22-ad62-81f7f55db269",
      "type": "line",
      "x": 1824,
      "y": 224,
      "zIndex": 24,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "title": "Updates info",
      "content": "<h2>        Updates and timeline</h2><p>Updates are made practically everyday. timeline here is the <strong>new block</strong> that should help me <em>(and you for your future projects)</em> to plan the tasks of new features, fixes etc.</p><p>The project is growing and I'm adding new useful things, if you have any new ideas and you think that your new feature would help in creating project, plans etc in this app, just go to my <strong><u>github project</u></strong> <em>(link next to this document) </em>and create the feature improvement issue. Or you can fork the project and create the feature by yourself, so if you would want to have this in official codebase, just create <strong>pull request</strong> and wait for <strong>review</strong>.</p>",
      "autoHeight": true,
      "typography": {
        "fontSize": 16
      },
      "id": "c597a64a-99ca-4678-82e6-2c0c4d0d9e92",
      "type": "document",
      "x": 3931,
      "y": 1068,
      "zIndex": 25,
      "width": 480,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/NodexMesh",
      "title": "Nodex Mesh",
      "description": "GitHub project",
      "color": "#fdf4ff",
      "topColor": "#7C3AED",
      "id": "b8206df8-ea90-4313-82f4-3c1f82061de0",
      "type": "link",
      "x": 4111,
      "y": 1593,
      "zIndex": 26,
      "width": 320,
      "height": 144,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "Example diagram of some simple in-system operation",
      "nodes": [
        {
          "id": "d2941864-1fae-4665-9dc8-1cf826838ef3",
          "position": {
            "x": 0,
            "y": 240
          },
          "data": {
            "label": "Request input",
            "shape": "input",
            "color": "#0f766e"
          },
          "type": "shape"
        },
        {
          "id": "2d99da4d-36f2-42d7-b055-921303544efe",
          "position": {
            "x": 0,
            "y": 360
          },
          "data": {
            "label": "Valid request?",
            "shape": "decision",
            "color": "#b45309"
          },
          "type": "shape"
        },
        {
          "id": "30f746f7-70a6-4dfc-a73b-e866d1a1a60b",
          "position": {
            "x": 0,
            "y": 540
          },
          "data": {
            "label": "Process request",
            "shape": "process",
            "color": "#7c3aed"
          },
          "type": "shape"
        },
        {
          "id": "c83739da-678b-47a8-9c59-e4806386e564",
          "position": {
            "x": 220,
            "y": 540
          },
          "data": {
            "label": "Return error",
            "shape": "process",
            "color": "#7c3aed"
          },
          "type": "shape"
        },
        {
          "id": "02442027-6fef-4809-a61c-d0968131355b",
          "position": {
            "x": 0,
            "y": 656
          },
          "data": {
            "label": "Save result",
            "shape": "service",
            "color": "#0369a1"
          },
          "type": "shape"
        },
        {
          "id": "da235b20-b0eb-4926-a4e3-d1043032d57e",
          "position": {
            "x": 0,
            "y": 112
          },
          "data": {
            "label": "Start",
            "shape": "terminal",
            "color": "#ff4d4d"
          },
          "type": "shape"
        },
        {
          "id": "2427eea9-a71d-470c-ada2-e9594d540524",
          "position": {
            "x": 224,
            "y": 672
          },
          "data": {
            "label": "End",
            "shape": "terminal",
            "color": "#ff4d4d"
          },
          "type": "shape"
        },
        {
          "id": "85863511-b634-43bb-9487-a32fe7452947",
          "position": {
            "x": 0,
            "y": 1120
          },
          "data": {
            "label": "End",
            "shape": "terminal",
            "color": "#ff4d4d"
          },
          "type": "shape"
        },
        {
          "id": "c7ae7d3d-e0d4-418d-9e57-94b1e9f3226a",
          "position": {
            "x": 0,
            "y": 768
          },
          "data": {
            "label": "Validator service",
            "shape": "service",
            "color": "#0369a1"
          },
          "type": "shape"
        },
        {
          "id": "ba0cf73f-4064-4829-a331-f4aa9406a0b8",
          "position": {
            "x": 0,
            "y": 992
          },
          "data": {
            "label": "Show result to user",
            "shape": "process",
            "color": "#7c3aed"
          },
          "type": "shape"
        },
        {
          "id": "dac36286-0221-4760-bad4-57a67d7a80b5",
          "position": {
            "x": 0,
            "y": 880
          },
          "data": {
            "label": "Database",
            "shape": "database",
            "color": "#40b3ed"
          },
          "type": "shape"
        }
      ],
      "edges": [
        {
          "id": "cf8e5545-17ea-45dc-b3ac-f055ce1f3c12",
          "source": "d2941864-1fae-4665-9dc8-1cf826838ef3",
          "target": "2d99da4d-36f2-42d7-b055-921303544efe",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "388a4bb0-5770-44d2-a477-4dfc2e4e89c7",
          "source": "2d99da4d-36f2-42d7-b055-921303544efe",
          "target": "30f746f7-70a6-4dfc-a73b-e866d1a1a60b",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": "Yes"
        },
        {
          "id": "7992ab60-8224-45e1-b02b-3517978cea4b",
          "source": "2d99da4d-36f2-42d7-b055-921303544efe",
          "target": "c83739da-678b-47a8-9c59-e4806386e564",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": "No"
        },
        {
          "id": "bcd321e3-3c15-4148-99f0-9c93199b8516",
          "source": "30f746f7-70a6-4dfc-a73b-e866d1a1a60b",
          "target": "02442027-6fef-4809-a61c-d0968131355b",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "ac1faf54-8a81-492e-8ac8-902ddd7c8015",
          "source": "da235b20-b0eb-4926-a4e3-d1043032d57e",
          "target": "d2941864-1fae-4665-9dc8-1cf826838ef3",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "7c912f46-74ef-4ace-8ce0-4366bc42f642",
          "source": "ba0cf73f-4064-4829-a331-f4aa9406a0b8",
          "target": "85863511-b634-43bb-9487-a32fe7452947",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "d786b64a-05ea-49fd-9cea-fb0ea4d4bfee",
          "source": "c83739da-678b-47a8-9c59-e4806386e564",
          "target": "2427eea9-a71d-470c-ada2-e9594d540524",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "404728f4-40bb-4a02-bae1-8e4e2c1087f4",
          "source": "02442027-6fef-4809-a61c-d0968131355b",
          "target": "c7ae7d3d-e0d4-418d-9e57-94b1e9f3226a",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "bc4c4569-f454-48aa-97d9-87944399fd9f",
          "source": "dac36286-0221-4760-bad4-57a67d7a80b5",
          "target": "ba0cf73f-4064-4829-a331-f4aa9406a0b8",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        },
        {
          "id": "6ebcce1b-63c9-4155-823a-46e623397901",
          "source": "c7ae7d3d-e0d4-418d-9e57-94b1e9f3226a",
          "target": "dac36286-0221-4760-bad4-57a67d7a80b5",
          "sourceHandle": "bottom",
          "targetHandle": "top",
          "label": ""
        }
      ],
      "color": "#ffffff",
      "id": "4912d071-3d01-44c0-871d-00652299c685",
      "type": "diagram",
      "x": 1998,
      "y": 1824,
      "zIndex": 27,
      "width": 800,
      "height": 1168,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "divider": true,
      "x2": 2976,
      "y2": 1776,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "Example diagram",
      "labelMode": "horizontal",
      "labelOffset": 0,
      "labelFontSize": 24,
      "color": "#000000",
      "id": "94c49a4c-f830-4d24-9748-b108ac22a690",
      "type": "line",
      "x": 1824,
      "y": 1776,
      "zIndex": 28,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "viewWidth": 278.48,
      "viewHeight": 289.13,
      "points": [],
      "strokeWidth": 3,
      "strokes": [
        {
          "points": [
            {
              "x": 122.7,
              "y": 6,
              "pressure": 1
            },
            {
              "x": 121.67,
              "y": 6.52,
              "pressure": 1.09
            },
            {
              "x": 118.92,
              "y": 6.83,
              "pressure": 1.13
            },
            {
              "x": 114.42,
              "y": 8.15,
              "pressure": 1.14
            },
            {
              "x": 107.82,
              "y": 10.05,
              "pressure": 1.14
            },
            {
              "x": 101.02,
              "y": 12.94,
              "pressure": 1.12
            },
            {
              "x": 93.97,
              "y": 17.36,
              "pressure": 1.12
            },
            {
              "x": 85.15,
              "y": 24.57,
              "pressure": 1.08
            },
            {
              "x": 74.25,
              "y": 34.63,
              "pressure": 1.04
            },
            {
              "x": 61.67,
              "y": 48.25,
              "pressure": 1
            },
            {
              "x": 48.96,
              "y": 62.14,
              "pressure": 0.97
            },
            {
              "x": 37.65,
              "y": 76.14,
              "pressure": 0.95
            },
            {
              "x": 28.9,
              "y": 89.42,
              "pressure": 0.95
            },
            {
              "x": 21.67,
              "y": 101.98,
              "pressure": 0.96
            },
            {
              "x": 15.99,
              "y": 115.79,
              "pressure": 0.95
            },
            {
              "x": 11.31,
              "y": 129.68,
              "pressure": 0.95
            },
            {
              "x": 7.72,
              "y": 144.45,
              "pressure": 0.95
            },
            {
              "x": 6,
              "y": 160.58,
              "pressure": 0.95
            },
            {
              "x": 8.02,
              "y": 177.28,
              "pressure": 0.94
            },
            {
              "x": 13.26,
              "y": 193.55,
              "pressure": 0.93
            },
            {
              "x": 19.43,
              "y": 206.93,
              "pressure": 0.94
            },
            {
              "x": 27.19,
              "y": 220.23,
              "pressure": 0.94
            },
            {
              "x": 38.18,
              "y": 233.96,
              "pressure": 0.93
            },
            {
              "x": 51.04,
              "y": 245.89,
              "pressure": 0.93
            },
            {
              "x": 63.4,
              "y": 255.77,
              "pressure": 0.93
            },
            {
              "x": 73.55,
              "y": 263.64,
              "pressure": 0.96
            },
            {
              "x": 84.75,
              "y": 270.38,
              "pressure": 0.97
            },
            {
              "x": 97.72,
              "y": 275.79,
              "pressure": 0.97
            },
            {
              "x": 113.36,
              "y": 279.93,
              "pressure": 0.96
            },
            {
              "x": 131.18,
              "y": 281.92,
              "pressure": 0.94
            },
            {
              "x": 150.19,
              "y": 282.8,
              "pressure": 0.92
            },
            {
              "x": 166.59,
              "y": 283.13,
              "pressure": 0.92
            },
            {
              "x": 180.96,
              "y": 282.62,
              "pressure": 0.94
            },
            {
              "x": 191.24,
              "y": 281.82,
              "pressure": 0.99
            },
            {
              "x": 199.5,
              "y": 281.39,
              "pressure": 1.04
            },
            {
              "x": 207.43,
              "y": 280.6,
              "pressure": 1.08
            },
            {
              "x": 217.29,
              "y": 278.88,
              "pressure": 1.07
            },
            {
              "x": 226.41,
              "y": 276.23,
              "pressure": 1.07
            },
            {
              "x": 232.48,
              "y": 273.31,
              "pressure": 1.12
            },
            {
              "x": 238.17,
              "y": 269.46,
              "pressure": 1.14
            },
            {
              "x": 243.61,
              "y": 266.15,
              "pressure": 1.17
            },
            {
              "x": 248.35,
              "y": 262.65,
              "pressure": 1.18
            },
            {
              "x": 252.04,
              "y": 259.65,
              "pressure": 1.22
            },
            {
              "x": 254.7,
              "y": 256.39,
              "pressure": 1.25
            },
            {
              "x": 256.73,
              "y": 254.01,
              "pressure": 1.31
            },
            {
              "x": 259,
              "y": 252,
              "pressure": 1.33
            },
            {
              "x": 261.42,
              "y": 250.75,
              "pressure": 1.34
            },
            {
              "x": 263.33,
              "y": 249.52,
              "pressure": 1.37
            },
            {
              "x": 266.55,
              "y": 247.46,
              "pressure": 1.37
            }
          ],
          "x": 0,
          "y": 0,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        },
        {
          "points": [
            {
              "x": 6,
              "y": 6,
              "pressure": 1
            },
            {
              "x": 6,
              "y": 6.45,
              "pressure": 1.17
            },
            {
              "x": 6.48,
              "y": 7.25,
              "pressure": 1.24
            },
            {
              "x": 7.27,
              "y": 7.75,
              "pressure": 1.3
            },
            {
              "x": 7.73,
              "y": 8.5,
              "pressure": 1.37
            },
            {
              "x": 8.5,
              "y": 8.99,
              "pressure": 1.41
            },
            {
              "x": 9.46,
              "y": 9.3,
              "pressure": 1.44
            },
            {
              "x": 10.56,
              "y": 9.51,
              "pressure": 1.44
            },
            {
              "x": 11.23,
              "y": 10.09,
              "pressure": 1.47
            },
            {
              "x": 12.13,
              "y": 10.47,
              "pressure": 1.48
            },
            {
              "x": 13.2,
              "y": 11.2,
              "pressure": 1.46
            },
            {
              "x": 14.31,
              "y": 11.64,
              "pressure": 1.48
            },
            {
              "x": 15.08,
              "y": 12.45,
              "pressure": 1.43
            },
            {
              "x": 15.95,
              "y": 12.89,
              "pressure": 1.48
            },
            {
              "x": 16.97,
              "y": 13.18,
              "pressure": 1.51
            },
            {
              "x": 18.26,
              "y": 13.92,
              "pressure": 1.43
            },
            {
              "x": 18.93,
              "y": 14.77,
              "pressure": 1.46
            },
            {
              "x": 19.35,
              "y": 15.75,
              "pressure": 1.5
            },
            {
              "x": 19.64,
              "y": 16.89,
              "pressure": 1.49
            },
            {
              "x": 19.35,
              "y": 18.08,
              "pressure": 1.48
            },
            {
              "x": 19.15,
              "y": 19.37,
              "pressure": 1.45
            },
            {
              "x": 18.56,
              "y": 20.61,
              "pressure": 1.45
            },
            {
              "x": 18.19,
              "y": 21.86,
              "pressure": 1.45
            },
            {
              "x": 17.96,
              "y": 23.07,
              "pressure": 1.48
            },
            {
              "x": 17.36,
              "y": 24.32,
              "pressure": 1.49
            },
            {
              "x": 16.97,
              "y": 25.57,
              "pressure": 1.51
            },
            {
              "x": 16.73,
              "y": 26.82,
              "pressure": 1.53
            },
            {
              "x": 16.06,
              "y": 27.71,
              "pressure": 1.48
            },
            {
              "x": 15.68,
              "y": 28.66,
              "pressure": 1.51
            },
            {
              "x": 15.43,
              "y": 29.76,
              "pressure": 1.51
            },
            {
              "x": 14.79,
              "y": 30.95,
              "pressure": 1.49
            },
            {
              "x": 14.39,
              "y": 32.17,
              "pressure": 1.48
            },
            {
              "x": 13.71,
              "y": 34.26,
              "pressure": 1.48
            }
          ],
          "x": 253,
          "y": 227,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        }
      ],
      "color": "#7C3AED",
      "id": "88a1b767-34e1-4949-87a4-0bbcfc88ad22",
      "type": "drawing",
      "x": 3808,
      "y": 1454,
      "zIndex": 30,
      "width": 278,
      "height": 289,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "title": "Tests #1 problems",
      "columns": [
        {
          "id": "e6367d95-0c79-4fb0-ba08-4b37ead0d162",
          "title": "Nice to do",
          "color": "#5a8a94",
          "cards": [
            {
              "id": "3a253268-9f57-4962-8a90-0faf40bea619",
              "text": "Change editing kanban columns to dialog",
              "done": true
            },
            {
              "id": "1d833d65-3630-48de-8ce0-09996ae14bac",
              "text": "Implement manual deleting trash with projects",
              "done": true
            },
            {
              "id": "7de5658e-960d-4012-b0c9-989d039e6288",
              "text": "Show checklist completion percentage based on completed tasks",
              "done": true
            },
            {
              "id": "eb123a8f-e06c-4d47-8d71-fdb58bf43b33",
              "text": "Implement arrow flexibility",
              "done": true
            },
            {
              "id": "0841ca0a-258f-4be6-91f2-461c0bb473c7",
              "text": "Fix and improve DiagramBlock so it reacts better to moving items and handles arrows and connections more reliably",
              "done": true
            },
            {
              "id": "c716f0aa-517b-4e31-915e-383274e7355e",
              "text": "Edit timeline tasks in a dialog",
              "done": true
            },
            {
              "id": "3a85c31a-fdad-4bff-83e6-a0b4c12f7c7e",
              "text": "Dropping a checklist item or Kanban card onto the canvas creates a new checklist",
              "done": true
            },
            {
              "id": "cfde832c-cfb2-4f21-896d-75b8e2709db4",
              "text": "ImageBlock also looks inconsistent with the rest of the app and needs styling improvements",
              "done": true
            },
            {
              "id": "8f7a8021-df1c-48bf-aef6-84e96eb070b9",
              "text": "Review and adjust colors and item styles so the overall UI is visually consistent",
              "done": true
            },
            {
              "id": "7f5392c2-4a6f-42d0-9385-dc9b9149819d",
              "text": "Fix arrow and line thickness so arrowheads scale correctly with the selected stroke width",
              "done": true
            },
            {
              "id": "0f653b28-a7db-4f01-a777-effed6f7dc7c",
              "text": "Add a lock icon to locked items so their locked state is clearly visible",
              "done": true
            },
            {
              "id": "2f892092-ddb6-44bb-8e29-6d71926acf83",
              "text": "Prevent a frame from moving when it contains a locked item",
              "done": true
            }
          ],
          "width": 387
        },
        {
          "id": "114844af-3d0b-491f-b1d2-ea19c4bea5f4",
          "title": "Important",
          "color": "#FFBD65",
          "cards": [
            {
              "id": "445e5919-ec70-4cda-b778-e8ee60958215",
              "text": "Update this column after adding new features",
              "done": true
            },
            {
              "id": "f792fb5c-480d-4a17-8787-bccdd16a0ce8",
              "text": "When an item is resized and starts overlapping other items, push those items away and cascade the movement if they overlap additional items",
              "done": true
            },
            {
              "id": "b110017b-1c30-499f-8b52-fb136431ebc9",
              "text": "Check TimelineBlock and the other new items because they are not being added to frames",
              "done": true
            },
            {
              "id": "8aae6df5-6471-462e-a910-43689f11399b",
              "text": "Review fonts across the app and fix any inconsistent usage",
              "done": true
            },
            {
              "id": "53cb488b-bff0-48dc-8cf6-284b3a87dfcf",
              "text": "Allow TextBlock to support multiple lines instead of a single line",
              "done": true
            },
            {
              "id": "d12daa14-1bd8-4a6b-ac5e-c380b5ea3b00",
              "text": "Fix vertical alignment in NoteBlock",
              "done": true
            },
            {
              "id": "c13e2439-e94b-4729-b1b7-8b5cdc80dcf4",
              "text": "Make checklist item font size configurable in the edit bar and apply it in the textarea when adding a new task",
              "done": true
            }
          ],
          "width": 341
        },
        {
          "id": "034dc981-9d47-4554-8e99-0ca7b570408b",
          "title": "Must have",
          "color": "#7C3AED",
          "cards": [
            {
              "id": "c3e1c30f-11f5-4968-934b-5d28cfde8f9b",
              "text": "Handle overlapping frames so when one frame overlaps another and tries to capture its items, the newer frame does not take items that already belong to the existing frame",
              "done": true
            },
            {
              "id": "f0426cff-2575-4127-8210-4d58d7540fb9",
              "text": "Review and improve Ctrl+Z support, including the existing issue with Kanban cards and tasks",
              "done": true
            },
            {
              "id": "969a0e93-4eb5-4d5f-aa65-a1a14db4a247",
              "text": "Fix inconsistent item dimensions and sizing",
              "done": true
            },
            {
              "id": "35c925f6-2cd3-4773-80f0-f86c291089a9",
              "text": "Set the default zIndex to 1 and all frames to 0",
              "done": true
            }
          ],
          "width": 358
        }
      ],
      "color": "#ffffff",
      "typography": {
        "fontSize": 16
      },
      "id": "75e2e8bd-7363-43a8-b069-c5cee3d5646d",
      "type": "kanban",
      "x": 3168,
      "y": 252,
      "zIndex": 37,
      "width": 1176,
      "height": 743,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "divider": true,
      "x2": 2976,
      "y2": 2992,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "color": "#000000",
      "id": "cc319845-bf54-450b-a548-690df245c3ec",
      "type": "line",
      "x": 2976,
      "y": 1776,
      "zIndex": 38,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "divider": true,
      "x2": 5552,
      "y2": 1776,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 5,
      "label": "Bakend plan",
      "labelMode": "horizontal",
      "labelOffset": 0,
      "labelFontSize": 24,
      "color": "#000000",
      "id": "72afe8c0-8ce5-44f6-8a05-49dc95b5090d",
      "type": "line",
      "x": 2976,
      "y": 1776,
      "zIndex": 39,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://dotnet.microsoft.com/en-us/",
      "title": ".NET",
      "description": "",
      "color": "#ffffff",
      "id": "4054d032-0600-400b-968e-37dc1b387209",
      "type": "link",
      "x": 3734,
      "y": 1984,
      "zIndex": 40,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://top10.owasp.org/2025/",
      "title": "OWASP TOP 10 2025",
      "description": "",
      "color": "#ffffff",
      "id": "68ed8ac1-eec4-4a07-9758-6ddf0ba42c75",
      "type": "link",
      "x": 3058,
      "y": 2008,
      "zIndex": 41,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://owasp.github.io/www-project-smart-contract-top-10/assets/images/Top10mapping2025-2026.png",
      "caption": "",
      "imgHeight": 528,
      "variant": "sticker",
      "color": "#ffffff",
      "id": "bbcc7a70-2628-45fb-99d6-2e0a38297e5f",
      "type": "image",
      "x": 3062,
      "y": 2264,
      "zIndex": 42,
      "width": 970,
      "height": 528,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3344,
      "y2": 2264,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": 0.2,
      "color": "#7C3AED",
      "id": "d847579d-70f1-4b45-b0ee-8daf18c4b62e",
      "type": "line",
      "x": 3270,
      "y": 2158,
      "zIndex": 43,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "68ed8ac1-eec4-4a07-9758-6ddf0ba42c75",
      "endItemId": "bbcc7a70-2628-45fb-99d6-2e0a38297e5f"
    },
    {
      "content": "Upcoming changes 2025 => 2026",
      "size": "lg",
      "typography": {
        "verticalAlign": "top",
        "textAlign": "center"
      },
      "id": "9353db75-8825-4d0d-ba91-f058adeb72b5",
      "type": "text",
      "x": 3420,
      "y": 2130,
      "zIndex": 44,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "url": "https://github.com/Lewan24/SampleWarehouseApi",
      "title": "Secure .NET project template",
      "description": "My custom project created as template for new .NET projects with already implemented OWASP TOP 10 security features",
      "color": "#ffffff",
      "id": "2d071650-fe24-4cc0-88b7-16412fe3b2ec",
      "type": "link",
      "x": 4208,
      "y": 2481,
      "zIndex": 45,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "There will be all prepared information needed to prepare and implement backend in .NET 10.\n\nAfter frontend and app upcoming updates, there will be also database diagram with example of data in database how its gonna be stored.",
      "color": "#ffffff",
      "typography": {
        "bold": true
      },
      "id": "4aa9a954-2bfb-412c-aa87-6a9b98920287",
      "type": "note",
      "x": 4144,
      "y": 1862,
      "zIndex": 46,
      "width": 448,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "",
      "url": "https://www.youtube.com/watch?v=Jzr0Jdnq_EI",
      "showLabel": false,
      "color": "#ffffff",
      "id": "c00e90d0-25ef-4411-bef9-0179897f0383",
      "type": "embed",
      "x": 3211,
      "y": 2842,
      "zIndex": 47,
      "width": 672,
      "height": 384,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "builder.Services.AddIdentityCore<ApplicationUser>(options =>\n    {\n        // Password policy (OWASP ASVS-aligned: length over complexity \n        // gymnastics, but we do both here for the demo)\n        options.Password.RequiredLength = 12;\n        options.Password.RequireDigit = true;\n        options.Password.RequireUppercase = true;\n        options.Password.RequireLowercase = true;\n        options.Password.RequireNonAlphanumeric = true;\n\n        // Account lockout after repeated failed attempts — \n        // mitigates credential stuffing / brute force.\n        options.Lockout.MaxFailedAccessAttempts = 5;\n        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);\n        options.Lockout.AllowedForNewUsers = true;\n\n        options.User.RequireUniqueEmail = true;\n    })\n        .AddRoles<IdentityRole>()\n        .AddEntityFrameworkStores<AppDbContext>()\n        .AddSignInManager()\n        .AddDefaultTokenProviders();",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "typography": {
        "fontSize": 14
      },
      "id": "4f054e88-5eb8-4138-bdf7-5e77b0595551",
      "type": "code",
      "x": 3062,
      "y": 3488,
      "zIndex": 48,
      "width": 624,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3739,
      "y2": 3628,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "color": "#7C3AED",
      "id": "007693fb-f584-49b4-ada1-e6b6d2b9e5dd",
      "type": "line",
      "x": 3686,
      "y": 3628,
      "zIndex": 49,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "4f054e88-5eb8-4138-bdf7-5e77b0595551",
      "endItemId": "d8865c15-edcc-49a8-a71b-5e790cb6cce0"
    },
    {
      "content": "builder.Services.AddAuthentication(options =>\n    {\n        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;\n        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;\n    })\n        .AddJwtBearer(options =>\n        {\n            options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();\n            options.SaveToken = false;\n            options.TokenValidationParameters = new TokenValidationParameters\n            {\n                ValidateIssuer = true,\n                ValidIssuer = jwtSection[\"Issuer\"],\n                ValidateAudience = true,\n                ValidAudience = jwtSection[\"Audience\"],\n                ValidateLifetime = true,\n                ClockSkew = TimeSpan.FromSeconds(30),\n                ValidateIssuerSigningKey = true,\n                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))\n            };\n        });\n\n    builder.Services.AddAuthorizationBuilder()\n        .AddPolicy(Policies.AdminOnly, p => p.RequireRole(Roles.Admin))\n        .AddPolicy(Policies.ManagerOrAdmin, p => p.RequireRole(Roles.Manager, Roles.Admin))\n        .AddPolicy(Policies.ViewerOrAbove, p => p.RequireRole(Roles.Viewer, Roles.Manager, Roles.Admin));",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "d8865c15-edcc-49a8-a71b-5e790cb6cce0",
      "type": "code",
      "x": 3739,
      "y": 3488,
      "zIndex": 50,
      "width": 864,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3590,
      "y2": 4208,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "color": "#7C3AED",
      "id": "f66ee916-25dc-48e7-997a-edc7bc6d1b7b",
      "type": "line",
      "x": 4031,
      "y": 3768,
      "zIndex": 51,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "d8865c15-edcc-49a8-a71b-5e790cb6cce0",
      "endItemId": "588a5542-6517-4b66-9211-f37708ce7134"
    },
    {
      "content": "builder.Services.AddRateLimiter(options =>\n    {\n        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;\n\n        options.OnRejected = async (context, token) =>\n        {\n            context.HttpContext.Response.Headers.RetryAfter = \"60\";\n            await context.HttpContext.Response.WriteAsJsonAsync(\n                new { error = \"Too many requests. Please try again later.\" }, token);\n        };\n\n        // Global limiter applied to every request: partitioned per authenticated user and per ip\n        // (so one noisy user can't starve others) or per IP for anonymous traffic.\n        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>\n        {\n            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);\n\n            var key = !string.IsNullOrWhiteSpace(userId)\n                ? $\"user:{userId}\"\n                : $\"ip:{httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\"}\";\n\n            return RateLimitPartition.GetSlidingWindowLimiter(\n                key,\n                _ => new SlidingWindowRateLimiterOptions\n                {\n                    PermitLimit = 300,\n                    Window = TimeSpan.FromMinutes(1),\n                    SegmentsPerWindow = 6,\n                    QueueLimit = 0\n                });\n        });",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "588a5542-6517-4b66-9211-f37708ce7134",
      "type": "code",
      "x": 3058,
      "y": 4208,
      "zIndex": 52,
      "width": 784,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3899,
      "y2": 4348,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "color": "#7C3AED",
      "id": "67c65df0-950c-4232-9eb4-d2a0948b2760",
      "type": "line",
      "x": 3842,
      "y": 4348,
      "zIndex": 53,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "588a5542-6517-4b66-9211-f37708ce7134",
      "endItemId": "b70ce890-2267-45d1-8b24-32fbc3f23724"
    },
    {
      "content": "options.AddPolicy(\"auth-strict\", httpContext =>\n        {\n            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";\n            return RateLimitPartition.GetSlidingWindowLimiter(\n                partitionKey: $\"ip:{ip}\",\n                _ => new SlidingWindowRateLimiterOptions\n            {\n                PermitLimit = 5,\n                Window = TimeSpan.FromMinutes(1),\n                SegmentsPerWindow = 6,\n                QueueLimit = 0\n            });\n        });\n        \n        options.AddPolicy(\"auth-refresh\", httpContext =>\n        {\n            var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";\n\n            return RateLimitPartition.GetTokenBucketLimiter(\n                partitionKey: $\"ip:{ip}\",\n                factory: _ => new TokenBucketRateLimiterOptions\n                {\n                    TokenLimit = 30,\n                    TokensPerPeriod = 30,\n                    ReplenishmentPeriod = TimeSpan.FromMinutes(1),\n                    AutoReplenishment = true,\n                    QueueLimit = 0\n                });\n        });\n    });",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "b70ce890-2267-45d1-8b24-32fbc3f23724",
      "type": "code",
      "x": 3899,
      "y": 4208,
      "zIndex": 54,
      "width": 704,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3504,
      "y2": 3488,
      "arrowStart": true,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.25,
      "lineCap": "round",
      "color": "#7C3AED",
      "id": "2b44b479-7f78-49d6-ac09-689cc0e1ec47",
      "type": "line",
      "x": 4298,
      "y": 2631,
      "zIndex": 55,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "2d071650-fe24-4cc0-88b7-16412fe3b2ec",
      "endItemId": "4f054e88-5eb8-4138-bdf7-5e77b0595551"
    },
    {
      "content": "Example code of \nidentity\nauth\nrate limiter\nlimiter policies",
      "size": "lg",
      "typography": {
        "textAlign": "center"
      },
      "id": "4247fd32-8bf7-4506-ab09-af1dc6a98f08",
      "type": "text",
      "x": 3120,
      "y": 3276,
      "zIndex": 56,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3333,
      "y2": 3488,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": 0.7,
      "color": "#7C3AED",
      "id": "06bc2dac-8dc5-4f07-9dae-d27cac54c580",
      "type": "line",
      "x": 3289,
      "y": 3336,
      "zIndex": 57,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "4247fd32-8bf7-4506-ab09-af1dc6a98f08",
      "endItemId": "4f054e88-5eb8-4138-bdf7-5e77b0595551"
    },
    {
      "title": "Database preview plan",
      "content": "<h2>               Database plan #1</h2><p></p><p><u>Below is the first fun preview of upcoming database.</u></p><p>It is still in <strong>planning</strong> and preparing until most of <strong><em>functionallities</em></strong> are already <strong><em>implemented</em></strong> in frontend.</p><p></p><p><strong>Projects</strong></p><p>- Id<br>- Name<br>- Color<br>- OwnerId<br>- CreatedAt<br>- UpdatedAt<br>- Version</p><p><strong>BoardItems</strong></p><p>- Id<br>- ProjectId<br>- Type<br>- X<br>- Y<br>- ZIndex<br>- Width<br>- Height<br>- Locked<br>- Data JSONB (specific data of item)<br>- UpdatedAt<br>- Version</p>",
      "autoHeight": true,
      "color": "#ffffff",
      "colorRole": "default",
      "id": "59620a3f-14fc-44be-907d-afe50dad67ee",
      "type": "document",
      "x": 4779,
      "y": 2018,
      "zIndex": 58,
      "width": 480,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "title": "NodexMesh Database preview schema",
      "tables": [
        {
          "id": "2b7104f2-9579-4df5-86f7-24ccf04a47a4",
          "name": "Users",
          "position": {
            "x": -688,
            "y": 0
          },
          "fields": [
            {
              "id": "8f1fe0c7-4098-4792-ab7d-c8897bc8b9fb",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "780d0182-92c7-4e1f-9c27-a28156e3ba2c",
              "name": "Email",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "393e283b-a55f-4be1-bf3f-99084774f124",
              "name": "PasswordHash",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "3cd2673e-5969-444a-a8d0-85b4d3eb0e47",
          "name": "Roles",
          "position": {
            "x": -688,
            "y": 288
          },
          "fields": [
            {
              "id": "3b76a330-62c9-4491-a8eb-233eaa096ce8",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "be2184dd-a428-4db5-a520-0a58192f00b7",
              "name": "RoleName",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "77a5742e-f758-4635-8c77-c187f0140e9f",
          "name": "UsersRoles",
          "position": {
            "x": -304,
            "y": 256
          },
          "fields": [
            {
              "id": "4dda517e-69bf-4e86-816a-2bf97e091f0f",
              "name": "User_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "7473523c-766e-42b8-9464-d966c5c0067b",
              "name": "Role_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "2b5d3e3e-7a2f-440e-a228-a60d68c6f620",
          "name": "Projects",
          "position": {
            "x": 16,
            "y": 16
          },
          "fields": [
            {
              "id": "c339f6b1-dd6c-4a79-8a12-7d16a809b4be",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "9af6e770-bb12-4176-96d0-e121733116a9",
              "name": "Name",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "c8431fff-f454-4cf6-9b98-49f87e515096",
              "name": "Color",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "611fc71e-f356-47d5-9ce2-9a9f765b61cf",
              "name": "OwnerUser_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "21b3cc89-6371-4c03-9b7e-38bccd5de305",
              "name": "CreatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "ee251f54-0021-4ce6-991c-5fbd0c31bd92",
              "name": "UpdatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "43014dd4-14d3-4c94-bbf1-4306c3c7930e",
              "name": "Version",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "69ed277a-e95e-4e30-a080-dad6289f2334",
          "name": "BoardItems",
          "position": {
            "x": 400,
            "y": 0
          },
          "fields": [
            {
              "id": "7bb66a96-70f1-4c7c-adf4-3781a1f29ed6",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": true,
              "defaultValue": ""
            },
            {
              "id": "5db1d7d6-da43-4817-93ca-0671a698b5d4",
              "name": "Project_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "04267747-b1c8-407f-acbb-7f9c615b8e50",
              "name": "Type",
              "dataType": "enum",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "043aa50a-6196-4940-bd80-def62f3e1ee2",
              "name": "Pos_X",
              "dataType": "float",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "556f3c7f-9adc-45bc-a717-f894e8c425e9",
              "name": "Pos_Y",
              "dataType": "float",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "abfb12dc-da5e-4211-a882-a39ec476008a",
              "name": "ZIndex",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "a4aa39e9-c8ac-4a8f-9f59-b6027fc4d718",
              "name": "Width",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "d50c24e0-0751-4ee5-9592-d23098d87ae8",
              "name": "Height",
              "dataType": "integer",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "6028a01e-e9da-4f55-90a3-e45f83e7a43a",
              "name": "Locked",
              "dataType": "boolean",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "1b91a1eb-2210-4a12-8bf1-50e0e28861ea",
              "name": "Item_Data",
              "dataType": "JSONB",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "d027864a-c1c3-4355-9a4d-becc8be92ece",
              "name": "UpdatedAt",
              "dataType": "DateTime",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "b5a40880-9961-4de8-8d63-0f9d46c0e4ad",
              "name": "Version",
              "dataType": "string",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "4c325d53-5be9-4735-a4e6-2b3ea9cd5931",
          "name": "UsersProjectsSettings",
          "position": {
            "x": -352,
            "y": -288
          },
          "fields": [
            {
              "id": "e7b8daaf-1736-47c9-9df3-aad96b7afaf6",
              "name": "Project_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "40b59b17-fd9e-4e22-8f07-8c04656674bf",
              "name": "User_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "0b3ede1c-13d0-412f-a31e-7a179140b1d1",
              "name": "Settings_ID",
              "dataType": "Guid",
              "primaryKey": false,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            }
          ]
        },
        {
          "id": "caa3a5a2-40eb-4eac-a5cc-579357b84f53",
          "name": "ProjectSettings",
          "position": {
            "x": 128,
            "y": -256
          },
          "fields": [
            {
              "id": "7dd3eeb9-29be-45aa-93fc-e2fd4cb22237",
              "name": "id",
              "dataType": "Guid",
              "primaryKey": true,
              "nullable": false,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "7ef06a59-6e22-40a0-b40f-3330037bf0fd",
              "name": "ThemeSettings",
              "dataType": "JSONB",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "6c45e0f1-11fb-4724-86f3-0d806be9a7b0",
              "name": "UIFont",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            },
            {
              "id": "5ec10582-9c75-4357-898e-7f22f7b6ff79",
              "name": "BoardItemsFont",
              "dataType": "string",
              "primaryKey": false,
              "nullable": true,
              "unique": false,
              "defaultValue": ""
            }
          ]
        }
      ],
      "relations": [
        {
          "id": "e6d522c8-da47-43c5-8d19-a9bdd26d630f",
          "source": "77a5742e-f758-4635-8c77-c187f0140e9f",
          "target": "3cd2673e-5969-444a-a8d0-85b4d3eb0e47",
          "sourceField": "7473523c-766e-42b8-9464-d966c5c0067b",
          "targetField": "3b76a330-62c9-4491-a8eb-233eaa096ce8",
          "cardinality": "1:1"
        },
        {
          "id": "4ccf12bb-008e-4688-b920-3e995fb14bda",
          "source": "77a5742e-f758-4635-8c77-c187f0140e9f",
          "target": "2b7104f2-9579-4df5-86f7-24ccf04a47a4",
          "sourceField": "4dda517e-69bf-4e86-816a-2bf97e091f0f",
          "targetField": "8f1fe0c7-4098-4792-ab7d-c8897bc8b9fb",
          "cardinality": "1:1"
        },
        {
          "id": "6dd8aeb2-2c92-47f6-97ac-1f5f7baeda95",
          "source": "2b5d3e3e-7a2f-440e-a228-a60d68c6f620",
          "target": "2b7104f2-9579-4df5-86f7-24ccf04a47a4",
          "sourceField": "611fc71e-f356-47d5-9ce2-9a9f765b61cf",
          "targetField": "8f1fe0c7-4098-4792-ab7d-c8897bc8b9fb",
          "cardinality": "N:1"
        },
        {
          "id": "a7640b86-f09f-448e-8a5e-3a36a3b15a5b",
          "source": "69ed277a-e95e-4e30-a080-dad6289f2334",
          "target": "2b5d3e3e-7a2f-440e-a228-a60d68c6f620",
          "sourceField": "5db1d7d6-da43-4817-93ca-0671a698b5d4",
          "targetField": "c339f6b1-dd6c-4a79-8a12-7d16a809b4be",
          "cardinality": "1:N"
        },
        {
          "id": "2049dd37-e113-4971-a19d-8f0b54018ea5",
          "source": "4c325d53-5be9-4735-a4e6-2b3ea9cd5931",
          "target": "2b5d3e3e-7a2f-440e-a228-a60d68c6f620",
          "sourceField": "e7b8daaf-1736-47c9-9df3-aad96b7afaf6",
          "targetField": "c339f6b1-dd6c-4a79-8a12-7d16a809b4be",
          "cardinality": "1:1"
        },
        {
          "id": "4bc512f8-fe58-4e3b-98a0-ad6d2ebacef3",
          "source": "4c325d53-5be9-4735-a4e6-2b3ea9cd5931",
          "target": "2b7104f2-9579-4df5-86f7-24ccf04a47a4",
          "sourceField": "40b59b17-fd9e-4e22-8f07-8c04656674bf",
          "targetField": "8f1fe0c7-4098-4792-ab7d-c8897bc8b9fb",
          "cardinality": "1:1"
        },
        {
          "id": "528c3f02-55ef-49b5-ab7c-be5a46827356",
          "source": "4c325d53-5be9-4735-a4e6-2b3ea9cd5931",
          "target": "caa3a5a2-40eb-4eac-a5cc-579357b84f53",
          "sourceField": "0b3ede1c-13d0-412f-a31e-7a179140b1d1",
          "targetField": "7dd3eeb9-29be-45aa-93fc-e2fd4cb22237",
          "cardinality": "1:1"
        }
      ],
      "color": "#1c1917",
      "colorRole": "default",
      "id": "6cc32cd8-da06-4561-9a6d-32e0be584c9a",
      "type": "database",
      "x": 5376,
      "y": 2618,
      "zIndex": 59,
      "width": 1920,
      "height": 928,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 5536,
      "y2": 2618,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.25,
      "color": "#7C3AED",
      "id": "bd5a0f24-f113-47fc-b916-f2948fa90974",
      "type": "line",
      "x": 5259,
      "y": 2457,
      "zIndex": 60,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "59620a3f-14fc-44be-907d-afe50dad67ee",
      "endItemId": "6cc32cd8-da06-4561-9a6d-32e0be584c9a"
    },
    {
      "content": "public abstract class BoardItemData\n{\n}\n\npublic sealed class NoteData : BoardItemData\n{\n    public string Content { get; set; } = \"\";\n    public string? Color { get; set; }\n    public TypographyOptions? Typography { get; set; }\n}\n\npublic sealed class ChecklistData : BoardItemData\n{\n    public string Title { get; set; } = \"\";\n    public List<ChecklistEntry> Entries { get; set; } = [];\n}",
      "language": "csharp",
      "autoHeight": true,
      "color": "#ffffff",
      "id": "6838e73c-0d3a-43bf-93d1-0a703db04bab",
      "type": "code",
      "x": 5552,
      "y": 1952,
      "zIndex": 61,
      "width": 480,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "divider": true,
      "x2": 4704,
      "y2": 3392,
      "arrowStart": false,
      "arrowEnd": false,
      "strokeWidth": 3,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "labelFontSize": 11,
      "color": "#000000",
      "id": "9733c3e1-1b9d-4655-b416-f9be2caa76dd",
      "type": "line",
      "x": 4704,
      "y": 1888,
      "zIndex": 62,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 3571,
      "y2": 2264,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.4,
      "color": "#7C3AED",
      "id": "b3acb758-29df-4487-acae-19309cbfe8aa",
      "type": "line",
      "x": 3578,
      "y": 2190,
      "zIndex": 64,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "9353db75-8825-4d0d-ba91-f058adeb72b5",
      "endItemId": "bbcc7a70-2628-45fb-99d6-2e0a38297e5f"
    },
    {
      "x2": 4296,
      "y2": 2481,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.25,
      "color": "#7C3AED",
      "id": "dc0af8b6-b53e-4a3b-aee0-f77d8184f114",
      "type": "line",
      "x": 3966,
      "y": 2134,
      "zIndex": 65,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "4054d032-0600-400b-968e-37dc1b387209",
      "endItemId": "2d071650-fe24-4cc0-88b7-16412fe3b2ec"
    },
    {
      "x2": 5552,
      "y2": 2162,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 3,
      "label": "Example data C# boxing",
      "labelMode": "follow-line",
      "labelOffset": 15,
      "curve": 0,
      "labelFontSize": 13,
      "color": "#5a8a94",
      "typography": {
        "fontSize": 13
      },
      "id": "9a31d474-5532-45be-87fb-d82a6b17c492",
      "type": "line",
      "x": 5259,
      "y": 2248,
      "zIndex": 66,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "59620a3f-14fc-44be-907d-afe50dad67ee",
      "endItemId": "6838e73c-0d3a-43bf-93d1-0a703db04bab"
    },
    {
      "viewWidth": 417.12,
      "viewHeight": 180.15,
      "points": [],
      "strokeWidth": 3,
      "strokes": [
        {
          "points": [
            {
              "x": 6,
              "y": 165.33,
              "pressure": 1
            },
            {
              "x": 6.54,
              "y": 165.33,
              "pressure": 1.17
            },
            {
              "x": 7.62,
              "y": 165.33,
              "pressure": 1.17
            },
            {
              "x": 11.6,
              "y": 166,
              "pressure": 1.16
            },
            {
              "x": 22.69,
              "y": 166.44,
              "pressure": 1.11
            },
            {
              "x": 42.25,
              "y": 166.68,
              "pressure": 1.04
            },
            {
              "x": 69.12,
              "y": 165.83,
              "pressure": 0.98
            },
            {
              "x": 98.9,
              "y": 163.55,
              "pressure": 0.93
            },
            {
              "x": 130.01,
              "y": 159.68,
              "pressure": 0.89
            },
            {
              "x": 163.4,
              "y": 153.19,
              "pressure": 0.86
            },
            {
              "x": 192.18,
              "y": 144.34,
              "pressure": 0.85
            },
            {
              "x": 218.58,
              "y": 134.51,
              "pressure": 0.84
            },
            {
              "x": 249.11,
              "y": 121.56,
              "pressure": 0.83
            },
            {
              "x": 282.14,
              "y": 107.45,
              "pressure": 0.81
            },
            {
              "x": 309.54,
              "y": 91.37,
              "pressure": 0.81
            },
            {
              "x": 329.75,
              "y": 77.33,
              "pressure": 0.82
            },
            {
              "x": 350.53,
              "y": 60.81,
              "pressure": 0.83
            },
            {
              "x": 369.47,
              "y": 45.34,
              "pressure": 0.84
            },
            {
              "x": 379.45,
              "y": 34.29,
              "pressure": 0.9
            },
            {
              "x": 386.07,
              "y": 25.83,
              "pressure": 0.97
            },
            {
              "x": 391.06,
              "y": 18.49,
              "pressure": 1.03
            },
            {
              "x": 394.21,
              "y": 13.55,
              "pressure": 1.11
            },
            {
              "x": 399.02,
              "y": 6,
              "pressure": 1.11
            }
          ],
          "x": 0,
          "y": 7,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        },
        {
          "points": [
            {
              "x": 6,
              "y": 19.55,
              "pressure": 1
            },
            {
              "x": 6.54,
              "y": 19.55,
              "pressure": 1.17
            },
            {
              "x": 7.49,
              "y": 18.97,
              "pressure": 1.24
            },
            {
              "x": 8.63,
              "y": 18.05,
              "pressure": 1.3
            },
            {
              "x": 11.8,
              "y": 16.84,
              "pressure": 1.3
            },
            {
              "x": 16.41,
              "y": 14.13,
              "pressure": 1.27
            },
            {
              "x": 21.79,
              "y": 11.86,
              "pressure": 1.24
            },
            {
              "x": 26.34,
              "y": 9.5,
              "pressure": 1.26
            },
            {
              "x": 30.92,
              "y": 8.07,
              "pressure": 1.28
            },
            {
              "x": 36.29,
              "y": 7.17,
              "pressure": 1.27
            },
            {
              "x": 40.52,
              "y": 6.06,
              "pressure": 1.28
            },
            {
              "x": 42.78,
              "y": 6,
              "pressure": 1.37
            },
            {
              "x": 43.87,
              "y": 7.81,
              "pressure": 1.34
            },
            {
              "x": 43.9,
              "y": 11.38,
              "pressure": 1.31
            },
            {
              "x": 42.66,
              "y": 16,
              "pressure": 1.29
            },
            {
              "x": 41.93,
              "y": 20.65,
              "pressure": 1.27
            },
            {
              "x": 41.53,
              "y": 24.32,
              "pressure": 1.3
            },
            {
              "x": 40.71,
              "y": 28.3,
              "pressure": 1.32
            },
            {
              "x": 40.22,
              "y": 31.24,
              "pressure": 1.36
            },
            {
              "x": 39.39,
              "y": 33,
              "pressure": 1.43
            },
            {
              "x": 37.87,
              "y": 36.24,
              "pressure": 1.43
            }
          ],
          "x": 367,
          "y": 0,
          "scaleX": 1,
          "scaleY": 1,
          "color": "#7C3AED",
          "strokeWidth": 3
        }
      ],
      "color": "#7C3AED",
      "id": "df9daac7-b745-4d5c-8b50-13fe787aefe9",
      "type": "drawing",
      "x": 4431,
      "y": 1168,
      "zIndex": 68,
      "width": 417,
      "height": 180,
      "frameId": null,
      "locked": true,
      "comments": [],
      "tags": []
    },
    {
      "content": "Backend Plan",
      "color": "#7C3AED",
      "id": "9bd573a5-dee5-41eb-a4c0-0dd73127ab6c",
      "type": "section-title",
      "x": 3056,
      "y": 1840,
      "zIndex": 69,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh Database Scheme Plan",
      "color": "#7C3AED",
      "id": "1391d62f-3950-4fba-842b-3dcd5f56ee88",
      "type": "section-title",
      "x": 4784,
      "y": 1856,
      "zIndex": 70,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "NodexMesh TODO Section",
      "color": "#FFBD65",
      "id": "84fc15a9-0bf4-4aba-8507-24d6c9f06c30",
      "type": "section-title",
      "x": 2772,
      "y": 176,
      "zIndex": 71,
      "width": 320,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "emoji",
      "source": "🤔",
      "label": "🤔",
      "color": "#7C3AED",
      "id": "24d68704-fe88-433f-b623-73727db6a3c0",
      "type": "icon",
      "x": 3958,
      "y": 2232,
      "zIndex": 72,
      "width": 96,
      "height": 96,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "emoji",
      "source": "🔥",
      "label": "🔥",
      "color": "#7C3AED",
      "id": "152926e5-2d18-463f-87a3-0ec79c0d17d4",
      "type": "icon",
      "x": 5136,
      "y": 2064,
      "zIndex": 73,
      "width": 96,
      "height": 96,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "svg",
      "source": "<svg xmlns=\"http://www.w3.org/2000/svg\" id=\"Layer_1\" viewBox=\"0 0 64 64\"><defs><style>.cls-1{fill:#5c2d91;}.cls-2,.cls-3{fill:#fff;}.cls-2{opacity:0.1;}.cls-4{fill:#f2f2f2;}</style></defs><title>logo_NETcore</title><circle class=\"cls-1\" cx=\"32\" cy=\"32\" r=\"32\"/><path class=\"cls-2\" d=\"M9.82,9A32,32,0,1,0,55,54.18Z\"/><path class=\"cls-3\" d=\"M7.4,37.25a1.35,1.35,0,0,1-1-.42,1.38,1.38,0,0,1-.41-1,1.4,1.4,0,0,1,.41-1,1.34,1.34,0,0,1,1-.43,1.37,1.37,0,0,1,1,.43,1.39,1.39,0,0,1,.42,1,1.37,1.37,0,0,1-.42,1A1.38,1.38,0,0,1,7.4,37.25Z\"/><path class=\"cls-3\" d=\"M27.27,37H24.65L15.28,22.46a6,6,0,0,1-.58-1.14h-.08a18.72,18.72,0,0,1,.1,2.5V37H12.59V18.77h2.77l9.12,14.28q.57.89.74,1.22h.05a19.28,19.28,0,0,1-.13-2.68V18.77h2.13Z\"/><path class=\"cls-3\" d=\"M41.69,37H32V18.77h9.24V20.7H34.18v6.06h6.58v1.92H34.18V35h7.52Z\"/><path class=\"cls-3\" d=\"M56,20.7H50.7V37H48.57V20.7H43.33V18.77H56Z\"/><path class=\"cls-4\" d=\"M26.12,49.4a4.93,4.93,0,0,1-2.32.49,3.74,3.74,0,0,1-2.87-1.15,4.26,4.26,0,0,1-1.08-3,4.46,4.46,0,0,1,1.21-3.26,4.12,4.12,0,0,1,3.08-1.24,4.93,4.93,0,0,1,2,.35v1a4,4,0,0,0-2-.5,3.06,3.06,0,0,0-2.35,1,3.64,3.64,0,0,0-.9,2.58,3.47,3.47,0,0,0,.84,2.45,2.86,2.86,0,0,0,2.21.91,4.14,4.14,0,0,0,2.19-.56Z\"/><path class=\"cls-4\" d=\"M30.21,49.89A2.78,2.78,0,0,1,28.08,49a3.11,3.11,0,0,1-.79-2.23,3.24,3.24,0,0,1,.83-2.36,3,3,0,0,1,2.23-.85,2.69,2.69,0,0,1,2.09.83,3.28,3.28,0,0,1,.75,2.29,3.22,3.22,0,0,1-.81,2.3A2.84,2.84,0,0,1,30.21,49.89Zm.07-5.47a1.83,1.83,0,0,0-1.46.63,2.59,2.59,0,0,0-.54,1.74,2.45,2.45,0,0,0,.54,1.68,1.85,1.85,0,0,0,1.46.62,1.76,1.76,0,0,0,1.43-.6,2.62,2.62,0,0,0,.5-1.72,2.66,2.66,0,0,0-.5-1.73A1.75,1.75,0,0,0,30.28,44.42Z\"/><path class=\"cls-4\" d=\"M37.86,44.72a1.18,1.18,0,0,0-.73-.19,1.23,1.23,0,0,0-1,.58,2.68,2.68,0,0,0-.41,1.58v3.06h-1v-6h1V45h0a2.1,2.1,0,0,1,.63-1,1.43,1.43,0,0,1,.94-.35,1.57,1.57,0,0,1,.57.08Z\"/><path class=\"cls-4\" d=\"M43.72,47H39.49A2.24,2.24,0,0,0,40,48.54a1.86,1.86,0,0,0,1.42.54,3,3,0,0,0,1.86-.67v.9a3.48,3.48,0,0,1-2.09.57,2.54,2.54,0,0,1-2-.82,3.35,3.35,0,0,1-.73-2.3,3.28,3.28,0,0,1,.79-2.28,2.55,2.55,0,0,1,2-.88,2.26,2.26,0,0,1,1.82.76,3.18,3.18,0,0,1,.64,2.12Zm-1-.81a2,2,0,0,0-.4-1.29,1.37,1.37,0,0,0-1.1-.46,1.55,1.55,0,0,0-1.15.49,2.21,2.21,0,0,0-.59,1.27Z\"/></svg>",
      "label": "Star",
      "color": "#7C3AED",
      "id": "328bec45-50dd-480c-a0ef-3f50da8cc658",
      "type": "icon",
      "x": 3969,
      "y": 2015,
      "zIndex": 74,
      "width": 75,
      "height": 68,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "iconMode": "svg",
      "source": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"800px\" height=\"800px\" viewBox=\"-1.35 0 1504.4 1504.4\" id=\"Layer_1\"><style>.st0{fill:#5e91ff}.st1{fill:#fff}</style><title>Like</title><ellipse class=\"st0\" cx=\"750.8\" cy=\"752.2\" rx=\"750.8\" ry=\"752.2\"/><path class=\"st1\" d=\"M378.3 667.5h165.1c13 0 23.6 10.5 23.6 23.6v379.1c0 13-10.5 23.6-23.6 23.6H378.3c-13 0-23.6-10.5-23.6-23.6V691c.1-13 10.6-23.5 23.6-23.5zM624.7 1004.7V733.1c.1-66.9 18.8-132.4 54.1-189.2 21.5-34.4 69.7-89.5 96.7-118 6-6.4 27.8-25.2 27.8-35.5 0-13.2 1.5-34.5 2-74.2.3-25.2 20.8-45.9 46-45.7h1.1c44.1.8 58.2 41.6 58.2 41.6s37.7 74.4 2.5 165.4c-29.7 76.9-35.8 83.1-35.8 83.1s-9.6 13.9 20.8 13.3c0 0 185.6-.8 192-.8 13.7 0 57.4 12.5 54.9 68.2-1.8 41.2-27.4 55.6-40.5 60.3-1.7.6-2.6 2.5-1.9 4.2.3.7.8 1.3 1.5 1.7 13.4 7.8 40.8 27.5 40.2 57.7-.8 36.6-15.5 50.1-46.1 58.5-1.7.4-2.8 2.2-2.3 3.9.2.9.8 1.6 1.5 2 11.6 6.6 31.5 22.7 30.3 55.3-1.2 33.2-25.2 44.9-38.3 48.9-1.7.5-2.7 2.3-2.2 4 .2.7.7 1.4 1.3 1.8 8.3 5.7 20.6 18.6 20 45.1-.3 14-5 24.2-10.9 31.5-9.3 11.5-23.9 17.5-38.7 17.6l-411.8.8c-.1-.1-22.4 0-22.4-29.9z\"/></svg>",
      "label": "Star",
      "color": "#7C3AED",
      "id": "551f18ea-0a52-4401-87a5-d81e72be6004",
      "type": "icon",
      "x": 608,
      "y": 1324,
      "zIndex": 75,
      "width": 192,
      "height": 172,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "content": "Custom SVG",
      "size": "lg",
      "typography": {
        "verticalAlign": "middle",
        "textAlign": "center"
      },
      "id": "ebf3e59a-e7a8-4fb6-b012-8d2eb57988b0",
      "type": "text",
      "x": 640,
      "y": 1194,
      "zIndex": 76,
      "width": 240,
      "height": 60,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": []
    },
    {
      "x2": 730,
      "y2": 1324,
      "arrowStart": false,
      "arrowEnd": true,
      "strokeWidth": 2,
      "label": "",
      "labelMode": "horizontal",
      "labelOffset": 14,
      "curve": -0.55,
      "color": "#7C3AED",
      "id": "832e02f9-1648-41f2-ad09-bc1e347123c6",
      "type": "line",
      "x": 751,
      "y": 1254,
      "zIndex": 77,
      "frameId": "d269a9e3-7a2d-4b8c-9796-c0d4d9602e9c",
      "locked": false,
      "comments": [],
      "tags": [],
      "startItemId": "ebf3e59a-e7a8-4fb6-b012-8d2eb57988b0",
      "endItemId": "551f18ea-0a52-4401-87a5-d81e72be6004"
    },
    {
      "title": "Mind map",
      "nodes": [
        {
          "id": "c51b8e16-efca-45fe-a244-787edfa48b58",
          "parentId": null,
          "label": "Main idea",
          "side": "positive",
          "branchColor": "#8b5cf6",
          "background": "#292b30",
          "textColor": "#ffffff"
        },
        {
          "id": "75131972-6e29-468f-b7f5-a561255da5a0",
          "parentId": "c51b8e16-efca-45fe-a244-787edfa48b58",
          "label": "Explore",
          "side": "positive",
          "branchColor": "#8b5cf6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "82e6e807-4535-4d65-8590-523b66c435f3",
          "parentId": "c51b8e16-efca-45fe-a244-787edfa48b58",
          "label": "Plan",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "2ff94fb3-321d-4f6a-9215-55fb1a0d0271",
          "parentId": "c51b8e16-efca-45fe-a244-787edfa48b58",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#22c55e",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "fdc92285-1b95-49ee-bbd3-232c6ed92086",
          "parentId": "c51b8e16-efca-45fe-a244-787edfa48b58",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#14b8a6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "b2d79c20-d537-4706-8faf-2d378b21844d",
          "parentId": "c51b8e16-efca-45fe-a244-787edfa48b58",
          "label": "Develop",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "cae31403-307c-4665-b1bc-61dccda2299e",
          "parentId": "c51b8e16-efca-45fe-a244-787edfa48b58",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#f59e0b",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "415086dc-d690-4c78-ae1c-1985a07b3595",
          "parentId": "b2d79c20-d537-4706-8faf-2d378b21844d",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "2d668a24-f632-4c41-aa3c-974c4e92a921",
          "parentId": "415086dc-d690-4c78-ae1c-1985a07b3595",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "33ff0ed4-001c-45ad-86ba-01e402a5902f",
          "parentId": "2d668a24-f632-4c41-aa3c-974c4e92a921",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "f79b4542-60f9-468a-b157-651a00f20de7",
          "parentId": "2d668a24-f632-4c41-aa3c-974c4e92a921",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "9343e02b-f850-4acf-ba67-7991e500b555",
          "parentId": "cae31403-307c-4665-b1bc-61dccda2299e",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#f59e0b",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "f573f2f6-7ebf-455b-9dda-f5baf2aaf97c",
          "parentId": "cae31403-307c-4665-b1bc-61dccda2299e",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#f59e0b",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "e8e112a3-aaf0-46cb-b015-8a005507ac08",
          "parentId": "cae31403-307c-4665-b1bc-61dccda2299e",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#f59e0b",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "920da8b8-2e25-46e7-8165-466a04c5d559",
          "parentId": "82e6e807-4535-4d65-8590-523b66c435f3",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "ed0390ab-0058-4d8a-ab4d-8bec4d7e5a03",
          "parentId": "920da8b8-2e25-46e7-8165-466a04c5d559",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "51f0d4e3-d809-4998-a3f6-a4305fa5c081",
          "parentId": "82e6e807-4535-4d65-8590-523b66c435f3",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "24b129cb-aa51-4f9e-8653-0d826ec3218a",
          "parentId": "920da8b8-2e25-46e7-8165-466a04c5d559",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "f3d2389e-b7e5-46f9-bb07-7ff513a6bb8a",
          "parentId": "920da8b8-2e25-46e7-8165-466a04c5d559",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "43a9444d-390a-4898-811e-e316a51acd95",
          "parentId": "51f0d4e3-d809-4998-a3f6-a4305fa5c081",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "78c4f0bf-0294-4987-a462-9527f434a91b",
          "parentId": "51f0d4e3-d809-4998-a3f6-a4305fa5c081",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "83f22559-3e53-4a39-b4c7-d00cd18ac4af",
          "parentId": "51f0d4e3-d809-4998-a3f6-a4305fa5c081",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "24920170-b2ee-4149-81dd-4d73435d7f56",
          "parentId": "82e6e807-4535-4d65-8590-523b66c435f3",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "b5a03b69-2cdb-48c3-98bd-f7dea273378e",
          "parentId": "24920170-b2ee-4149-81dd-4d73435d7f56",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "6315f11b-b92c-4864-84b3-0fc018e43032",
          "parentId": "b5a03b69-2cdb-48c3-98bd-f7dea273378e",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "b45cba1e-4980-427a-ae0c-901112a7f060",
          "parentId": "43a9444d-390a-4898-811e-e316a51acd95",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "5717f1d4-82fc-445e-9396-20635bdb80a8",
          "parentId": "43a9444d-390a-4898-811e-e316a51acd95",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "d7045861-fc5b-4f90-911e-508e4641a151",
          "parentId": "24b129cb-aa51-4f9e-8653-0d826ec3218a",
          "label": "New idea",
          "side": "negative",
          "branchColor": "#3b82f6",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "0a5a72fa-5bca-4d1b-9e7e-5eea95856e7a",
          "parentId": "415086dc-d690-4c78-ae1c-1985a07b3595",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "c89dfa57-7b79-495a-b715-b1bab789e983",
          "parentId": "0a5a72fa-5bca-4d1b-9e7e-5eea95856e7a",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "0409ad20-03aa-4740-8c53-7d02f553b600",
          "parentId": "0a5a72fa-5bca-4d1b-9e7e-5eea95856e7a",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        },
        {
          "id": "514ed5dd-276f-4842-9d88-558ec997d6aa",
          "parentId": "c89dfa57-7b79-495a-b715-b1bab789e983",
          "label": "New idea",
          "side": "positive",
          "branchColor": "#ec4899",
          "background": "transparent",
          "textColor": "#374151"
        }
      ],
      "layout": "horizontal",
      "lineStyle": "curve",
      "lineWidth": 4,
      "dashed": false,
      "color": "#ffffff",
      "id": "7eaf3d58-9ced-426c-9545-58b9beeffea7",
      "type": "mindmap",
      "x": 444,
      "y": 3074,
      "zIndex": 78,
      "width": 1824,
      "height": 944,
      "frameId": null,
      "locked": false,
      "comments": [],
      "tags": []
    }
  ]
};

export const demoProjects: Project[] = [nodexMeshDemoProject];
