import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.85
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
wood=mat('Dark walnut',(.105,.043,.021));red=mat('Cranberry wool',(.36,.025,.026));cream=mat('Ivory wool',(.86,.75,.56));brick=mat('Terracotta',(.31,.12,.062));dark=mat('Firebox',(.018,.009,.006));green=mat('Pine',(.035,.095,.042));gold=mat('Warm gold',(.65,.32,.05));fire=mat('Flame gold',(1,.13,.003),.65);core=mat('Flame cream',(1,.46,.035),.8)
def box(name,loc,size,material,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:mod=o.modifiers.new('Soft edges','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def cone(name,loc,r1,r2,depth,material):
 bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=r1,radius2=r2,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(material);return o
# Blender Z-up, game rear is Blender +Y.
floor=mat('Warm grey stone',(.23,.26,.25))
seam=mat('Stone joints',(.15,.18,.18))
box('Floor',(0,0,-.06),(12,12,.1),floor)
for i in range(-6,7):
 box('Floor joint X',(i,0,-.008),(.012,12,.003),seam,0)
 box('Floor joint Y',(0,i,-.008),(12,.012,.003),seam,0)
box('Walnut tabletop',(0,0,.72),(3.9,5.3,.12),wood)
for x in [-1.6,1.6]:
 for y in [-2.25,2.25]:box('Table leg',(x,y,.34),(.16,.16,.68),wood)
# Narrow grain strips remain visible around the blanket.
for i in range(23):box('Wood grain',(-1.87+i*.17,0,.783),(.008,5.2,.002),brick,0)
box('Red woven blanket',(0,0,.791),(3.55,4.95,.022),red)
for i in range(65):
 x=-1.74+i*.054
 for side in [-1,1]:
  o=box('Ivory fringe',(x,side*2.56,.78),(.025,.18,.025),cream,.01);o.rotation_euler[2]=.09*math.sin(i*2)
box('Back wall',(0,3.05,1.6),(10,.15,3.2),wood)
box('Firebox',(0,2.83,.73),(2.1,.25,1.46),dark)
for row in range(7):
 for col in range(7):
  x=(col-3)*.39+(row%2)*.10
  if abs(x)>.98 or row>4:box('Fireplace brick',(x,2.65,.15+row*.28),(.36,.35,.25),brick)
box('Hearth',(0,2.43,.09),(3.05,.94,.18),brick)
box('Mantel',(0,2.49,2.17),(3.3,.66,.16),wood)
for x in [-.65,0,.65]:
 o=box('Burning log',(x,2.5,.27),(.7,.25,.2),wood);o.rotation_euler[2]=.25
def flame(name,x,y,base,height,width,material,phase):
 verts=[];faces=[];rings=7;sides=9
 for ring in range(rings):
  t=ring/(rings-1)
  radius=width*(math.sin(math.pi*(.10+.90*t))**.8) if ring<rings-1 else .002
  bend=math.sin(t*4+phase)*width*.55*t
  for side in range(sides):
   angle=side*math.tau/sides
   verts.append((x+bend+math.cos(angle)*radius,y+math.sin(angle)*radius*.38,base+t*height))
 for ring in range(rings-1):
  for side in range(sides):
   a=ring*sides+side;b=ring*sides+(side+1)%sides
   faces.append((a,b,b+sides,a+sides))
 faces.append(tuple(reversed(range(sides))));faces.append(tuple((rings-1)*sides+i for i in range(sides)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
 for face in mesh.polygons:face.use_smooth=True
 return obj
ember=mat('Ember red',(.8,.025,.002),1.3)
for i in range(9):
 x=(i-4)*.17;h=.40+.25*(.5+.5*math.sin(i*2.7))
 flame('Amber flame',x,2.49,.23,h,.15,fire,i*.7)
 flame('Golden heart',x,2.37,.23,h*.65,.09,core,i*.7+.4)
for i in range(15):
 cone('Glowing ember',(-.88+i*.12,2.31+.08*math.sin(i),.23),.042,.025,.035,ember)
for x in [-.92,-.61,-.3,0,.3,.61,.92]:box('Fire grate',(x,2.17,.35),(.035,.035,.52),dark)
box('Grate rail',(0,2.17,.35),(2.05,.04,.04),dark)
# Small mantel keepsakes leave space around the fire.
for x in [-1.17,1.17]:
 box('Candle',(x,2.48,2.42),(.10,.10,.32),cream)
 flame('Candle glow',x,2.48,2.58,.13,.035,core,0)
for x in [-.78,.78]:
 box('Little tree trunk',(x,2.48,2.29),(.045,.045,.13),wood)
 for level in range(3):cone('Mantel fir',(x,2.48,2.36+level*.10),.14-level*.035,0,.22,green)
box('Christmas cottage',(0,2.48,2.41),(.32,.25,.36),cream)
# A pitched roof with open eaves, snow trim and a chimney.
verts=[(-.22,2.30,2.57),(.22,2.30,2.57),(0,2.30,2.80),(-.22,2.66,2.57),(.22,2.66,2.57),(0,2.66,2.80)]
faces=[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1),(0,1,4,3)]
roofmesh=bpy.data.meshes.new('Cottage gable');roofmesh.from_pydata(verts,[],faces);roofmesh.update()
roof=bpy.data.objects.new('Cottage roof',roofmesh);bpy.context.collection.objects.link(roof);roof.data.materials.append(red)
for side in [-1,1]:
 trim=box('Cottage snowy roof',(side*.11,2.48,2.70),(.31,.39,.025),cream,.006);trim.rotation_euler[1]=side*math.atan2(.23,.22)
box('Cottage chimney',(.12,2.57,2.79),(.065,.07,.20),brick,.007)
box('Cottage door',(.075,2.344,2.35),(.075,.018,.17),wood,.008)
box('Lit cottage window',(-.065,2.344,2.44),(.09,.015,.105),core,.005)
box('Window cross',(-.065,2.33,2.44),(.010,.015,.11),wood,0)
box('Window cross',(-.065,2.33,2.44),(.10,.015,.010),wood,0)
def bauble(name,loc,radius,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=radius,location=loc)
 obj=bpy.context.object;obj.name=name;obj.data.materials.append(material)
 for face in obj.data.polygons:face.use_smooth=True
 return obj
# Staggered boughs carry round ornaments, tiny bulbs and a five-point star.
tree_x=-2.05;tree_y=2.7
box('Christmas tree trunk',(tree_x,tree_y,.20),(.16,.16,.40),wood)
for level in range(5):cone('Christmas tree',(tree_x,tree_y,.60+level*.36),.72-level*.12,0,.94,green)
for i in range(26):
 z=.43+i*.057;angle=i*2.4;radius=max(.11,.76-z*.28)
 bauble('Tree ornament',(tree_x+math.sin(angle)*radius,tree_y+math.cos(angle)*radius,z),.055,[red,gold,cream][i%3])
for i in range(65):
 t=i/64;z=.40+t*1.65;angle=t*math.tau*4;radius=max(.10,.77-z*.29)
 bauble('Tree ornament fairy light',(tree_x+math.sin(angle)*radius,tree_y+math.cos(angle)*radius,z),.018,core)
points=[]
for i in range(10):
 angle=math.pi/2+i*math.pi/5;r=.16 if i%2==0 else .073
 points.append((tree_x+math.cos(angle)*r,tree_y-.015,2.38+math.sin(angle)*r))
star_mesh=bpy.data.meshes.new('Star');star_mesh.from_pydata(points,[],[tuple(range(10))]);star_mesh.update()
star=bpy.data.objects.new('Tree ornament star',star_mesh);bpy.context.collection.objects.link(star);star.data.materials.append(gold)
solid=star.modifiers.new('Star thickness','SOLIDIFY');solid.thickness=.035
def ribbon_curve(name,points,material,width=.022):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=width;curve.bevel_resolution=3
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for point,co in zip(spline.bezier_points,points):point.co=co;point.handle_left_type='AUTO';point.handle_right_type='AUTO'
 obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(material)
for x,y,size,base,wrap,ribbon in [(-2.10,2.70,.44,0,cream,red),(-2.48,2.48,.36,0,green,cream),(-1.72,2.95,.29,0,red,gold)]:
 box('Wrapped gift',(x,y,base+size/2),(size,size,size),wrap,.025)
 box('Gift lid',(x,y,base+size*.95),(size*1.07,size*1.07,size*.14),wrap,.012)
 for axis in [0,1]:
  dims=[size*1.09,size*1.09,.012];dims[axis]=size*.14
  box('Silk ribbon top',(x,y,base+size*1.03),dims,ribbon,.004)
  dims=[size+.008,size+.008,size];dims[axis]=size*.14
  box('Silk ribbon wrap',(x,y,base+size/2),dims,ribbon,.004)
 z=base+size*1.06
 for side in [-1,1]:
  ribbon_curve('Bow loop',[(x,y,z),(x+side*size*.29,y+size*.08,z+size*.2),(x+side*size*.38,y-size*.09,z+size*.13),(x,y,z)],ribbon,size*.033)
  tail=box('Bow tail',(x+side*size*.16,y-size*.17,z+.01),(size*.1,size*.35,.012),ribbon,.003);tail.rotation_euler[2]=side*.45
 box('Bow knot',(x,y,z+.02),(size*.14,size*.12,size*.10),ribbon,.015)
# Move the fireplace room back to clear the longer tabletop.
for obj in bpy.context.scene.objects:
 if obj.name.startswith(('Back wall','Firebox','Fireplace','Hearth','Mantel','Burning','Amber','Golden','Glowing','Fire grate','Grate rail','Candle','Little tree','Christmas cottage','Cottage','Lit cottage','Window cross','Christmas tree','Tree ornament')):
  obj.location.y+=.65
os.makedirs('src/assets/blender',exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('src/assets/blender/christmas-room.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.abspath('src/assets/models/christmas-room.glb'),export_format='GLB',export_apply=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('src/assets/models/christmas-room.glb'))
print('Christmas room re-imported:',len(bpy.context.scene.objects),'objects')
