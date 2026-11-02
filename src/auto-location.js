let prepared;



function pointInRing(x, y, ring) {

  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {

    const [ax, ay] = ring[j],

      [bx, by] = ring[i];

    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);

    if (

      Math.abs(cross) < 1e-10 &&

      x >= Math.min(ax, bx) - 1e-10 &&

      x <= Math.max(ax, bx) + 1e-10 &&

      y >= Math.min(ay, by) - 1e-10 &&

      y <= Math.max(ay, by) + 1e-10

    )

      return true;

    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)

      inside = !inside;

  }

  return inside;

}



async function boundaries() {

  if (!prepared)

    prepared = import("./data/us-state-boundaries.json").then((module) =>

      module.default.map((state) => ({

        ...state,

        polygons: state.polygons.map((rings) => ({

          rings,

          bounds: rings[0].reduce(

            (box, [x, y]) => [

              Math.min(box[0], x),

              Math.min(box[1], y),

              Math.max(box[2], x),

              Math.max(box[3], y),

            ],

            [Infinity, Infinity, -Infinity, -Infinity],

          ),

        })),

      })),

    );

  return prepared;

}



export async function stateForCoordinates(latitude, longitude) {

  if (

    !Number.isFinite(latitude) ||

    !Number.isFinite(longitude) ||

    Math.abs(latitude) > 90 ||

    Math.abs(longitude) > 180

  )

    throw new Error("Your device returned an invalid location.");

  const states = await boundaries();

  for (const state of states)

    for (const {

      rings,

      bounds: [west, south, east, north],

    } of state.polygons) {

      if (

        longitude < west ||

        longitude > east ||

        latitude < south ||

        latitude > north

      )

        continue;

      if (

        pointInRing(longitude, latitude, rings[0]) &&

        !rings.slice(1).some((ring) => pointInRing(longitude, latitude, ring))

      )

        return state.code;

    }

  return null;

}



export async function searchLocationHint(value) {

  const text = String(value || "")

    .trim()

    .replace(/^([0-9]{5})-[0-9]{4}$/, "$1");

  if (/^[0-9]{5}$/.test(text)) return text;

  const states = await boundaries();

  const direct = states.find(

    (state) =>

      state.code.toLowerCase() === text.toLowerCase() ||

      state.name.toLowerCase() === text.toLowerCase(),

  );

  if (direct) return direct.code;

  const suffix = text.includes(",")

    ? text.split(",").at(-1).trim()

    : text.split(/\s+/).at(-1);

  return (

    states.find(

      (state) =>

        state.code.toLowerCase() === suffix?.toLowerCase() ||

        state.name.toLowerCase() === suffix?.toLowerCase(),

    )?.code || "National"

  );

}



// City lookup is local; no device coordinates are sent to a geocoder.
let cityData;
export async function currentLocationLabel(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180)
    return "Current location unavailable";
  try {
    cityData ||= import("./data/world-cities.json").then(module => module.default);
    const cities = await cityData;
    const rad = Math.PI / 180;
    let nearest, best = Infinity;
    for (const city of cities) {
      const a = Math.sin((city[1]-latitude)*rad/2)**2 +
        Math.cos(latitude*rad)*Math.cos(city[1]*rad)*Math.sin((city[2]-longitude)*rad/2)**2;
      if (a < best) { best=a; nearest=city; }
    }
    if (!nearest || 12742*Math.asin(Math.sqrt(Math.min(1,best)))>100)
      return "Current location: city unavailable";
    let country = nearest[3];
    try { country = new Intl.DisplayNames(["en"], {type:"region"}).of(country); } catch {}
    return `Near ${nearest[0]}, ${country}`;
  } catch {
    cityData = undefined;
    return "Current location: city unavailable";
  }
}
